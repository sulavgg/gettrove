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
import { format } from 'date-fns';
import { calculatePostPoints, type PointBreakdown } from '@/lib/points';
import { Checkbox } from '@/components/ui/checkbox';

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

  const [step, setStep] = useState<'select' | 'camera' | 'caption' | 'success'>('select');
  const [earnedPoints, setEarnedPoints] = useState<PointBreakdown | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [activityPhoto, setActivityPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [activityPreview, setActivityPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [captureTimestamp, setCaptureTimestamp] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [resending, setResending] = useState(false);
  const [lockedDialogGroup, setLockedDialogGroup] = useState<GroupOption | null>(null);
  const [shareToCampus, setShareToCampus] = useState(true);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (activityPreview) URL.revokeObjectURL(activityPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [activityPreview, selfiePreview]);

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('group_id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO);

      const postedGroupIds = todayCheckins?.map((c) => c.group_id) || [];

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

  const clearPhotos = useCallback(() => {
    if (activityPreview) URL.revokeObjectURL(activityPreview);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setActivityPhoto(null);
    setSelfiePhoto(null);
    setActivityPreview(null);
    setSelfiePreview(null);
    setCaptureTimestamp(null);
  }, [activityPreview, selfiePreview]);

  const handleCameraCapture = (activity: File, selfie: File, timestamp: string) => {
    setActivityPhoto(activity);
    setSelfiePhoto(selfie);
    setActivityPreview(URL.createObjectURL(activity));
    setSelfiePreview(URL.createObjectURL(selfie));
    setCaptureTimestamp(timestamp);
    setShowCamera(false);
    setStep('caption');
  };

  const handleOpenCamera = () => setShowCamera(true);
  const handleCloseCamera = () => setShowCamera(false);

  const compressImage = async (file: File, targetSizeKB: number = 300): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get canvas context')); return; }

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

          if (!blob) { reject(new Error('Failed to compress image')); return; }
          resolve(blob);
        } catch (error) { reject(error); }
      };

      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
      img.src = objectUrl;
    });
  };

  const uploadPhoto = async (file: File, prefix: string): Promise<string> => {
    const compressed = await compressImage(file);
    const fileName = `${user!.id}/${prefix}-${Date.now()}.jpg`;
    
    let uploadAttempts = 0;
    let uploadError: Error | null = null;

    while (uploadAttempts < 3) {
      uploadAttempts++;
      const { error } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true });

      if (!error) { uploadError = null; break; }
      uploadError = error;
      if (uploadAttempts < 3) await new Promise((r) => setTimeout(r, 1000 * uploadAttempts));
    }

    if (uploadError) throw new Error('Failed to upload photo.');

    // Return the storage path, not a signed URL
    // Signed URLs expire — store the path and generate URLs on-the-fly when displaying
    return fileName;
  };

  const handlePost = async () => {
    if (!user || !activityPhoto || !selfiePhoto || selectedGroups.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload both photos in parallel
      const [activityUrl, selfieUrl] = await Promise.all([
        uploadPhoto(activityPhoto, 'activity'),
        uploadPhoto(selfiePhoto, 'selfie'),
      ]);

      setUploadProgress(60);

      const succeededGroups: string[] = [];
      const failedGroups: string[] = [];

      for (const groupId of selectedGroups) {
        const { data: checkinData, error: checkinError } = await supabase.from('checkins').insert({
          user_id: user.id,
          group_id: groupId,
          photo_url: activityUrl,
          selfie_url: selfieUrl,
          capture_timestamp: captureTimestamp,
          caption: caption.trim() || null,
          shared_to_campus: shareToCampus && !!profile?.campus,
        } as any).select('id').single();

        if (checkinError) {
          console.error(`Checkin insert error for group ${groupId}:`, checkinError);
          failedGroups.push(groupId);
          continue;
        }

        succeededGroups.push(groupId);

        const { error: streakError } = await supabase.rpc('update_user_streak', {
          p_user_id: user.id,
          p_group_id: groupId,
        });

        if (streakError) console.warn('Streak update warning:', streakError);

        // Award posting points server-side
        try {
          const { data: pointsResult } = await supabase.rpc('award_post_points', {
            p_checkin_id: checkinData?.id,
            p_group_id: groupId,
          }) as { data: any };

          if (pointsResult?.success) {
            const postDate = captureTimestamp ? new Date(captureTimestamp) : new Date();
            const breakdown = calculatePostPoints(postDate, pointsResult.streak || 0);
            setEarnedPoints(breakdown);
          }
        } catch (ptErr) {
          console.warn('Points award error:', ptErr);
        }

        if (checkinData?.id) {
          supabase.functions.invoke('verify-challenge-post', {
            body: { checkin_id: checkinData.id, group_id: groupId, photo_url: activityUrl },
          }).then(({ data: verifyData, error: verifyError }) => {
            if (verifyError) console.warn('Challenge verification warning:', verifyError);
            else if (verifyData?.verified) {
              toast.success(`⚡ Challenge bonus: +${verifyData.points} pts!`, { duration: 3000 });
            }
          }).catch((err) => console.warn('Challenge verification failed:', err));
        }
      }

      setUploadProgress(100);

      if (succeededGroups.length === 0) throw new Error('Failed to post to any group.');

      if (!profile?.first_post_completed) {
        await updateProfile({ first_post_completed: true });
      }

      if (failedGroups.length > 0) {
        const failedNames = failedGroups.map((id) => groups.find((g) => g.id === id)?.name || 'Unknown').join(', ');
        toast.warning(`Posted to ${succeededGroups.length} group(s), but failed for: ${failedNames}`);
      } else {
        toast.success('✓ Posted! Streak secured. 🔥');
      }

      setStep('success');
    } catch (error: any) {
      console.error('Error posting:', error);
      toast.error(error.message || 'Failed to post. Please try again.');
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
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const availableGroups = groups.filter((g) => !g.already_posted);

  // Verification required
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
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
          <Button onClick={handleResendVerification} disabled={resending} className="w-full h-12 bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
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
        
        {/* Points earned display */}
        {earnedPoints && (
          <div className="w-full max-w-xs bg-card rounded-xl border border-border p-4 mb-4">
            <div className="text-center mb-3">
              <p className="text-3xl font-black text-primary">+{earnedPoints.total} pts</p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>📝 Base</span>
                <span>{earnedPoints.base} pts</span>
              </div>
              {earnedPoints.bonuses.map((b, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>{b.label}</span>
                  <span className="text-primary">+{b.points} pts</span>
                </div>
              ))}
              {earnedPoints.multiplierBonus > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>🔥 Streak ×{earnedPoints.multiplier}</span>
                  <span className="text-primary">+{earnedPoints.multiplierBonus} pts</span>
                </div>
              )}
              {earnedPoints.streakMilestone > 0 && (
                <div className="flex justify-between text-warning font-semibold">
                  <span>🏆 Streak Milestone!</span>
                  <span>+{earnedPoints.streakMilestone} pts</span>
                </div>
              )}
              {earnedPoints.perfectBonus > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>⭐ Perfect Bonus!</span>
                  <span>+{earnedPoints.perfectBonus} pts</span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-muted-foreground text-center mb-8">Great job! Keep it up tomorrow.</p>
        <Button onClick={() => navigate('/')} className="bg-primary text-primary-foreground shadow-glow font-bold uppercase tracking-wide hover:bg-primary/90">
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
            <p className="text-foreground">Take a photo of your habit in action (rear camera)</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
            <span className="text-2xl">🤳</span>
            <p className="text-foreground">Take a selfie to verify it's you (front camera)</p>
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
          Both photos are timestamped and must be taken within 30 seconds for verification.
        </p>
        <Button onClick={() => setShowFirstTimeGuide(false)} className="w-full max-w-sm h-14 bg-primary text-primary-foreground font-bold uppercase tracking-wide shadow-glow hover:bg-primary/90">
          Got it, let's post
        </Button>
      </div>
    );
  }

  if (availableGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
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
              clearPhotos();
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
        />
      )}

      {step === 'caption' && activityPreview && selfiePreview && (
        <div className="max-w-md mx-auto">
          {/* Photo previews */}
          <div className="relative mb-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              <div className="relative aspect-[3/4]">
                <img src={activityPreview} alt="Activity proof" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                  <p className="text-white text-[10px] font-semibold">📸 Activity</p>
                </div>
              </div>
              <div className="relative aspect-[3/4]">
                <img src={selfiePreview} alt="Selfie verification" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                  <p className="text-white text-[10px] font-semibold">🤳 Selfie</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                clearPhotos();
                setStep('select');
              }}
              className="absolute top-2 right-2 p-2 bg-background/80 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timestamp badge */}
          {captureTimestamp && (
            <div className="flex items-center justify-center mb-4">
              <div className="bg-muted px-3 py-1.5 rounded-full">
                <p className="text-xs font-mono text-muted-foreground">
                  🕐 {format(new Date(captureTimestamp), 'MMM d, yyyy • h:mm:ss a')}
                </p>
              </div>
            </div>
          )}

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
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <Button onClick={handlePost} disabled={uploading} className="w-full h-14 bg-primary text-primary-foreground font-bold uppercase tracking-wide shadow-glow hover:bg-primary/90">
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
