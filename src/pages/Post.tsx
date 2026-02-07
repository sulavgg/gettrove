import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, X, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { toast } from 'sonner';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { GroupLockedDialog } from '@/components/GroupLockedDialog';
import { PostGroupSelection } from '@/components/post/PostGroupSelection';
import { MIN_GROUP_MEMBERS } from '@/hooks/useGroupUnlock';

interface GroupOption {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  already_posted: boolean;
  member_count: number;
  invite_code: string;
  is_unlocked: boolean;
}

const Post = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile, isEmailVerified, resendVerificationEmail } = useAuth();
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
  const [resending, setResending] = useState(false);
  const [lockedDialogGroup, setLockedDialogGroup] = useState<GroupOption | null>(null);

  // Cleanup photo preview URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleResendVerification = async () => {
    setResending(true);
    const { error } = await resendVerificationEmail();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Verification email sent!');
    }
    setResending(false);
  };

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) {
        setLoading(false);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);

      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      // Get today's date in local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('group_id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO);

      const postedGroupIds = todayCheckins?.map((c) => c.group_id) || [];

      // Get member counts for all groups in parallel
      const memberCounts: Record<string, number> = {};
      await Promise.all(
        groupIds.map(async (gid) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', gid);
          memberCounts[gid] = count || 0;
        })
      );

      const options: GroupOption[] = (groupsData || []).map((g) => ({
        id: g.id,
        name: g.name,
        habit_type: g.habit_type as HabitType,
        custom_habit: g.custom_habit,
        already_posted: postedGroupIds.includes(g.id),
        member_count: memberCounts[g.id] || 0,
        invite_code: g.invite_code,
        is_unlocked: (memberCounts[g.id] || 0) >= MIN_GROUP_MEMBERS,
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
  }, [user, location.state]);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, fetchGroups]);

  useEffect(() => {
    if (!profile?.first_post_completed && groups.length > 0 && !loading) {
      setShowFirstTimeGuide(true);
    }
  }, [profile, groups, loading]);

  const setPhotoWithCleanup = useCallback((file: File | null) => {
    // Revoke old preview URL before creating new one
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPhoto(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setPhotoWithCleanup(file);
      setShowCamera(false);
      setStep('caption');
    }
  };

  const handleCameraCapture = (file: File) => {
    setPhotoWithCleanup(file);
    setShowCamera(false);
    setStep('caption');
  };

  const handleOpenCamera = () => setShowCamera(true);
  const handleCloseCamera = () => setShowCamera(false);
  const handleGalleryFromCamera = () => {
    setShowCamera(false);
    fileInputRef.current?.click();
  };

  const compressImage = async (file: File, targetSizeKB: number = 300): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;
        const maxSize = 1080;

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

        let quality = 0.8;
        let blob: Blob | null = null;

        try {
          do {
            blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob((b) => res(b), 'image/jpeg', quality)
            );
            quality -= 0.1;
          } while (blob && blob.size > targetSizeKB * 1024 && quality > 0.3);

          if (!blob) {
            blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob((b) => res(b), 'image/jpeg', 0.5)
            );
          }

          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          resolve(blob);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  };

  const handlePost = async () => {
    if (!user || !photo || selectedGroups.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Compress image
      let compressedBlob: Blob;
      try {
        compressedBlob = await compressImage(photo);
      } catch (compressionError) {
        console.error('Image compression failed:', compressionError);
        toast.error('Failed to process image. Please try a different photo.');
        setUploading(false);
        return;
      }
      setUploadProgress(30);

      // Upload to storage with retry logic
      const fileName = `${user.id}/${Date.now()}.jpg`;
      let uploadAttempts = 0;
      const maxAttempts = 3;
      let uploadError: Error | null = null;

      while (uploadAttempts < maxAttempts) {
        uploadAttempts++;
        const { error } = await supabase.storage
          .from('checkin-photos')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!error) {
          uploadError = null;
          break;
        }

        uploadError = error;
        console.warn(`Upload attempt ${uploadAttempts} failed:`, error.message);

        if (uploadAttempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * uploadAttempts));
        }
      }

      if (uploadError) {
        console.error('Upload failed after retries:', uploadError);
        throw new Error('Failed to upload photo. Please check your connection and try again.');
      }

      setUploadProgress(60);

      // Get signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('checkin-photos')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      if (urlError || !signedUrlData?.signedUrl) {
        console.error('Signed URL error:', urlError);
        throw new Error('Failed to generate image URL. Please try again.');
      }

      const photoUrl = signedUrlData.signedUrl;

      // Create checkins for each selected group, tracking successes/failures
      const succeededGroups: string[] = [];
      const failedGroups: string[] = [];

      for (const groupId of selectedGroups) {
        const { error: checkinError } = await supabase.from('checkins').insert({
          user_id: user.id,
          group_id: groupId,
          photo_url: photoUrl,
          caption: caption.trim() || null,
        });

        if (checkinError) {
          console.error(`Checkin insert error for group ${groupId}:`, checkinError);
          failedGroups.push(groupId);
          continue; // Try remaining groups instead of throwing
        }

        succeededGroups.push(groupId);

        // Update streak (non-critical)
        const { error: streakError } = await supabase.rpc('update_user_streak', {
          p_user_id: user.id,
          p_group_id: groupId,
        });

        if (streakError) {
          console.warn('Streak update warning:', streakError);
        }
      }

      setUploadProgress(100);

      // Handle results
      if (succeededGroups.length === 0) {
        throw new Error('Failed to post to any group. Please try again.');
      }

      // Mark first post completed
      if (!profile?.first_post_completed) {
        await updateProfile({ first_post_completed: true });
      }

      if (failedGroups.length > 0) {
        const failedNames = failedGroups
          .map((id) => groups.find((g) => g.id === id)?.name || 'Unknown')
          .join(', ');
        toast.warning(`Posted to ${succeededGroups.length} group(s), but failed for: ${failedNames}`);
      } else {
        toast.success('✓ Posted! Streak secured. 🔥');
      }

      setStep('success');
    } catch (error: any) {
      console.error('Error posting:', error);
      const message = error.message || 'Failed to post. Please try again.';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group && !group.is_unlocked) {
      setLockedDialogGroup(group);
      return;
    }
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const availableGroups = groups.filter((g) => !g.already_posted);

  // Verification required
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground mb-6">
            You need to verify your email address before posting check-ins. Check your inbox at{' '}
            <strong>{profile?.email}</strong> for the verification link.
          </p>
          <Button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full h-12 gradient-primary font-semibold"
          >
            {resending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Verification Email'}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={handleCloseCamera}
        onGallerySelect={handleGalleryFromCamera}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="animate-confetti">
          <span className="text-7xl">🔥</span>
        </div>
        <h1 className="text-2xl font-black text-foreground mt-6 mb-2">Streak Secured!</h1>
        <p className="text-muted-foreground text-center mb-8">Great job! Keep it up tomorrow.</p>
        <Button
          onClick={() => navigate('/')}
          className="gradient-primary shadow-glow font-bold uppercase tracking-wide"
        >
          Back to Home
        </Button>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-foreground mb-2">All caught up!</h1>
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
              setPhotoWithCleanup(null);
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
                setPhotoWithCleanup(null);
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
            <p className="text-xs text-muted-foreground mt-1">{caption.length}/100 characters</p>
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
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Now'}
          </Button>
        </div>
      )}

      {/* Locked group dialog */}
      {lockedDialogGroup && (
        <GroupLockedDialog
          open={!!lockedDialogGroup}
          onOpenChange={(open) => !open && setLockedDialogGroup(null)}
          groupName={lockedDialogGroup.name}
          inviteCode={lockedDialogGroup.invite_code}
          memberCount={lockedDialogGroup.member_count}
        />
      )}
    </div>
  );
};

export default Post;
