import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Image, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const [step, setStep] = useState<'select' | 'photo' | 'caption' | 'success'>('select');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);

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
      setStep('caption');
    }
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('checkin-photos')
        .getPublicUrl(fileName);

      // Create checkins for each selected group
      for (const groupId of selectedGroups) {
        // Insert checkin
        await supabase.from('checkins').insert({
          user_id: user.id,
          group_id: groupId,
          photo_url: publicUrl,
          caption: caption.trim() || null,
        });

        // Update streak
        const today = new Date().toISOString().split('T')[0];
        const { data: existingStreak } = await supabase
          .from('streaks')
          .select('*')
          .eq('user_id', user.id)
          .eq('group_id', groupId)
          .single();

        if (existingStreak) {
          const lastCheckin = existingStreak.last_checkin_date;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          let newStreak = 1;
          if (lastCheckin === yesterdayStr || lastCheckin === today) {
            // Continuing streak or already posted today
            newStreak = lastCheckin === today 
              ? existingStreak.current_streak 
              : existingStreak.current_streak + 1;
          }

          await supabase
            .from('streaks')
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, existingStreak.longest_streak),
              total_checkins: existingStreak.total_checkins + 1,
              last_checkin_date: today,
            })
            .eq('id', existingStreak.id);
        } else {
          await supabase.from('streaks').insert({
            user_id: user.id,
            group_id: groupId,
            current_streak: 1,
            longest_streak: 1,
            total_checkins: 1,
            last_checkin_date: today,
          });
        }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
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
        <div className="max-w-md mx-auto">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Select groups to post to
          </h2>

          <div className="space-y-3 mb-8">
            {availableGroups.map((group) => {
              const habit = getHabitDisplay(group.habit_type, group.custom_habit);
              const isSelected = selectedGroups.includes(group.id);

              return (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
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
            })}
          </div>

          {selectedGroups.length > 0 && (
            <div className="space-y-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow gap-2"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 gap-2"
              >
                <Image className="w-5 h-5" />
                Upload from Gallery
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

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
