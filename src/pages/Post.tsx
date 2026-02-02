import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Image, X, Loader2, Check, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { RestDayButton } from '@/components/RestDayButton';
import { useRestDays } from '@/hooks/useRestDays';

interface GroupOption {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  already_posted: boolean;
}

const Post = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'camera' | 'caption' | 'success'>('select');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    if (!profile?.first_post_completed && groups.length > 0 && !loading) {
      setShowFirstTimeGuide(true);
    }
  }, [profile, groups, loading]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      // Get user's groups
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) {
        setLoading(false);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Get group details
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Check which groups user already posted to today
      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('group_id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO);

      const postedGroupIds = todayCheckins?.map((c) => c.group_id) || [];

      const options: GroupOption[] = (groupsData || []).map((g) => ({
        id: g.id,
        name: g.name,
        habit_type: g.habit_type as HabitType,
        custom_habit: g.custom_habit,
        already_posted: postedGroupIds.includes(g.id),
      }));

      setGroups(options);

      // Pre-select group from navigation state
      const stateGroupId = (location.state as any)?.groupId;
      if (stateGroupId) {
        const group = options.find((g) => g.id === stateGroupId && !g.already_posted);
        if (group) {
          setSelectedGroups([group.id]);
        }
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setShowCamera(false);
      setStep('caption');
    }
  };

  const handleCameraCapture = (file: File) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setShowCamera(false);
    setStep('caption');
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  const handleGalleryFromCamera = () => {
    setShowCamera(false);
    fileInputRef.current?.click();
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions (max 1200px)
        let width = img.width;
        let height = img.height;
        const maxSize = 1200;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob!),
          'image/jpeg',
          0.85
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handlePost = async () => {
    if (!user || !photo || selectedGroups.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Compress image
      const compressedBlob = await compressImage(photo);
      setUploadProgress(30);

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // Get signed URL (bucket is now private for security)
      // Using 1-year expiry for better UX with persistent content
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('checkin-photos')
        .createSignedUrl(fileName, 3600 * 24 * 365); // 1 year expiry

      if (urlError) throw urlError;
      const photoUrl = signedUrlData?.signedUrl;

      if (!photoUrl) throw new Error('Failed to generate signed URL');

      // Create checkins for each selected group
      for (const groupId of selectedGroups) {
        // Insert checkin
        await supabase.from('checkins').insert({
          user_id: user.id,
          group_id: groupId,
          photo_url: photoUrl,
          caption: caption.trim() || null,
        });

        // Update streak atomically using database function
        // This prevents race conditions when posting to multiple groups
        await supabase.rpc('update_user_streak', {
          p_user_id: user.id,
          p_group_id: groupId,
        });
      }

      setUploadProgress(100);

      // Mark first post completed
      if (!profile?.first_post_completed) {
        await updateProfile({ first_post_completed: true });
      }

      setStep('success');
    } catch (error: any) {
      console.error('Error posting:', error);
      toast.error(error.message || 'Failed to post');
    } finally {
      setUploading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const availableGroups = groups.filter((g) => !g.already_posted);

  // Component for group selection with rest day options
  const PostGroupSelection = ({
    availableGroups,
    selectedGroups,
    toggleGroup,
    onOpenCamera,
    onOpenGallery,
  }: {
    availableGroups: GroupOption[];
    selectedGroups: string[];
    toggleGroup: (id: string) => void;
    onOpenCamera: () => void;
    onOpenGallery: () => void;
  }) => {
    const { user } = useAuth();

    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Select groups to post to
        </h2>

        <div className="space-y-3 mb-8">
          {availableGroups.map((group) => {
            const habit = getHabitDisplay(group.habit_type, group.custom_habit);
            const isSelected = selectedGroups.includes(group.id);

            return (
              <GroupSelectionItem
                key={group.id}
                group={group}
                habit={habit}
                isSelected={isSelected}
                onToggle={() => toggleGroup(group.id)}
              />
            );
          })}
        </div>

        {selectedGroups.length > 0 && (
          <div className="space-y-3">
            <Button
              onClick={onOpenCamera}
              className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow gap-2"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              onClick={onOpenGallery}
              className="w-full h-12 gap-2"
            >
              <Image className="w-5 h-5" />
              Upload from Gallery
            </Button>
          </div>
        )}

        {/* Rest day section */}
        {selectedGroups.length === 0 && availableGroups.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Or take a rest day
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Need a break? Use a rest day to preserve your streak without posting. You get 2 rest days per week per group.
            </p>
            <div className="space-y-2">
              {availableGroups.map((group) => (
                <RestDayItem key={group.id} group={group} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Individual group selection item
  const GroupSelectionItem = ({
    group,
    habit,
    isSelected,
    onToggle,
  }: {
    group: GroupOption;
    habit: { emoji: string; label: string };
    isSelected: boolean;
    onToggle: () => void;
  }) => {
    return (
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 p-4 rounded-xl border transition-all',
          isSelected
            ? 'bg-primary/10 border-primary'
            : 'bg-card border-border hover:border-primary/50'
        )}
      >
        <Checkbox
          checked={isSelected}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <span className="text-xl">{habit.emoji}</span>
        <div className="flex-1 text-left">
          <p className="font-medium text-foreground">{group.name}</p>
          <p className="text-sm text-muted-foreground">{habit.label}</p>
        </div>
      </button>
    );
  };

  // Rest day item for a single group
  const RestDayItem = ({ group }: { group: GroupOption }) => {
    const { restDaysRemaining, hasRestedToday, loading, takeRestDay } = useRestDays(group.id);
    const habit = getHabitDisplay(group.habit_type, group.custom_habit);

    if (loading) {
      return (
        <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
        <span className="text-lg">{habit.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{group.name}</p>
        </div>
        <RestDayButton
          groupName={group.name}
          restDaysRemaining={restDaysRemaining}
          hasRestedToday={hasRestedToday}
          alreadyPosted={false}
          onTakeRestDay={takeRestDay}
          variant="compact"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Camera view
  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={handleCloseCamera}
        onGallerySelect={handleGalleryFromCamera}
      />
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="animate-confetti">
          <span className="text-7xl">🔥</span>
        </div>
        <h1 className="text-2xl font-black text-foreground mt-6 mb-2">
          Streak Secured!
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Great job! Keep it up tomorrow.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="gradient-primary shadow-glow font-bold uppercase tracking-wide"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  // First time guide
  if (showFirstTimeGuide) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <span className="text-6xl mb-4">📸</span>
        <h1 className="text-2xl font-black text-foreground mb-4 text-center">
          How to post your check-in
        </h1>
        <div className="space-y-4 w-full max-w-sm mb-8">
          <div className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
            <span className="text-2xl">📸</span>
            <p className="text-foreground">Take or upload a photo (gym selfie, study setup, etc.)</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
            <span className="text-2xl">✍️</span>
            <p className="text-foreground">Add a caption (optional, 100 characters max)</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
            <span className="text-2xl">🔥</span>
            <p className="text-foreground">Post to secure your streak!</p>
          </div>
        </div>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Your streak starts today. Come back tomorrow to keep it going!
        </p>
        <Button
          onClick={() => setShowFirstTimeGuide(false)}
          className="w-full max-w-sm h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow"
        >
          Got it, let's post
        </Button>
      </div>
    );
  }

  // No available groups
  if (availableGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex flex-col items-center justify-center py-12">
          <Check className="w-16 h-16 text-success mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            All caught up!
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            You've posted to all your groups today. Come back tomorrow!
          </p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            if (step === 'caption') {
              setStep('select');
              setPhoto(null);
              setPhotoPreview(null);
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">Post Check-in</h1>
        <div className="w-16" />
      </div>

      {step === 'select' && (
        <PostGroupSelection
          availableGroups={availableGroups}
          selectedGroups={selectedGroups}
          toggleGroup={toggleGroup}
          onOpenCamera={handleOpenCamera}
          onOpenGallery={() => fileInputRef.current?.click()}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {step === 'caption' && photoPreview && (
        <div className="max-w-md mx-auto">
          {/* Photo preview */}
          <div className="relative mb-6">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full aspect-square object-cover rounded-xl"
            />
            <button
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
                setStep('select');
              }}
              className="absolute top-2 right-2 p-2 bg-background/80 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Caption */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              ADD A CAPTION (OPTIONAL)
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 100))}
              placeholder="Day 1, let's go 💪"
              className="bg-input border-border resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {caption.length}/100 characters
            </p>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="mb-6">
              <div className="h-2 bg-input rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handlePost}
            disabled={uploading}
            className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Post Now'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Post;
