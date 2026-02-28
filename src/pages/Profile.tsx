import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Loader2, LogOut, Camera, Mail, AlertTriangle, CheckCircle, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { BottomNav } from '@/components/ui/BottomNav';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition } from '@/components/ui/PageTransition';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { WeeklyRecapViewer } from '@/components/recap/WeeklyRecapViewer';
import { ContributionCalendar } from '@/components/profile/ContributionCalendar';
import { PointsBreakdown } from '@/components/profile/PointsBreakdown';

import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptic';

import { CampusSetupDialog } from '@/components/campus/CampusSetupDialog';

interface UserStats {
  activeStreaks: number;
  totalCheckins: number;
  longestStreak: number;
  groupsJoined: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, isEmailVerified, resendVerificationEmail } = useAuth();
  const [showCampusDialog, setShowCampusDialog] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    activeStreaks: 0,
    totalCheckins: 0,
    longestStreak: 0,
    groupsJoined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleResendVerification = async () => {
    triggerHaptic('light');
    setResending(true);
    const { error } = await resendVerificationEmail();
    if (error) {
      toast.error(error.message);
      triggerHaptic('error');
    } else {
      toast.success('Verification email sent! Check your inbox.');
      triggerHaptic('success');
    }
    setResending(false);
  };

  const fetchStats = useCallback(async () => {
    if (!user) return;

    setError(null);

    try {
      // Get groups count
      const { count: groupsCount, error: groupsError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (groupsError) throw groupsError;

      // Get streaks data
      const { data: streaks, error: streaksError } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, total_checkins')
        .eq('user_id', user.id);

      if (streaksError) throw streaksError;

      const activeStreaks = streaks?.filter((s) => s.current_streak > 0).length || 0;
      const totalCheckins = streaks?.reduce((sum, s) => sum + s.total_checkins, 0) || 0;
      const longestStreak = Math.max(...(streaks?.map((s) => s.longest_streak) || [0]));

      setStats({
        activeStreaks,
        totalCheckins,
        longestStreak,
        groupsJoined: groupsCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  const handleRefresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const handleSignOut = async () => {
    triggerHaptic('medium');
    await signOut();
    navigate('/auth');
  };

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-black text-foreground">Profile</h1>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh}>
        <PageTransition>
          <main className="px-4 py-6">
            {loading ? (
              <ProfileSkeleton />
            ) : error ? (
              <ErrorState
                type="network"
                message={error}
                onRetry={fetchStats}
              />
            ) : (
              <>
                {/* Profile Card */}
                <Card className="p-6 bg-card border border-white/[0.08] mb-6">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <button 
                        type="button"
                        className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground"
                        onClick={() => {
                          triggerHaptic('light');
                          document.getElementById('profile-photo-input')?.click();
                        }}
                      >
                        <Camera className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      <input
                        id="profile-photo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          try {
                            const ext = file.name.split('.').pop();
                            const path = `${user.id}/avatar.${ext}`;
                            const { error: uploadError } = await supabase.storage
                              .from('checkin-photos')
                              .upload(path, file, { upsert: true });
                            if (uploadError) throw uploadError;
                            const { data: urlData } = supabase.storage
                              .from('checkin-photos')
                              .getPublicUrl(path);
                            await updateProfile({ profile_photo_url: urlData.publicUrl } as any);
                            toast.success('Profile photo updated!');
                            triggerHaptic('success');
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to upload photo');
                            triggerHaptic('error');
                          }
                        }}
                      />
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-1">
                      {profile?.name || 'Loading...'}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{profile?.email}</span>
                      {isEmailVerified ? (
                        <span className="flex items-center gap-1 text-success text-xs">
                          <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning text-xs">
                          <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                          Unverified
                        </span>
                      )}
                    </div>
                    {profile?.created_at && (
                      <p className="text-muted-foreground text-xs mt-1">
                        Member since {format(new Date(profile.created_at), 'MMM yyyy')}
                      </p>
                    )}

                    {/* Verification action */}
                    {!isEmailVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="mt-3 gap-2"
                      >
                        {resending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="w-4 h-4" strokeWidth={1.5} />
                            Resend Verification Email
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Active Streaks
                    </p>
                    <p className="text-2xl font-bold text-warning flex items-center gap-1">
                      🔥 {stats.activeStreaks}
                    </p>
                  </Card>
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Total Check-ins
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      ✅ {stats.totalCheckins}
                    </p>
                  </Card>
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Longest Streak
                    </p>
                    <p className="text-2xl font-bold text-success">
                      🏆 {stats.longestStreak} days
                    </p>
                  </Card>
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Groups Joined
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      👥 {stats.groupsJoined}
                    </p>
                  </Card>
                </div>

                {/* Points Breakdown */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Points
                  </h3>
                  <PointsBreakdown />
                </div>

                {/* Posting History Calendar */}
                <div className="mb-6">
                  <ContributionCalendar />
                </div>

                {/* Weekly Recap */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Weekly Recap
                  </h3>
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <WeeklyRecapViewer />
                  </Card>
                </div>

                {/* Badges Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Badges
                  </h3>
                  <Card className="p-4 bg-card border border-white/[0.08]">
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { emoji: '🔥', name: 'Week Warrior', days: 7, earned: stats.longestStreak >= 7 },
                        { emoji: '💪', name: 'Month Master', days: 30, earned: stats.longestStreak >= 30 },
                        { emoji: '🏆', name: 'Century Club', days: 100, earned: stats.longestStreak >= 100 },
                        { emoji: '👑', name: 'Year Legend', days: 365, earned: stats.longestStreak >= 365 },
                      ].map((badge) => (
                        <div
                          key={badge.name}
                          className={`flex flex-col items-center ${badge.earned ? '' : 'opacity-30'}`}
                        >
                          <span className="text-3xl mb-1">{badge.emoji}</span>
                          <p className="text-xs text-center text-muted-foreground">
                            {badge.days}d
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Earn badges by building streaks
                    </p>
                  </Card>
                </div>


                {/* Community */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Community
                  </h3>
                  <Card className="p-4 bg-card border border-white/[0.08] space-y-4">
                    {/* University / Hometown */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <School className="w-5 h-5 text-primary" strokeWidth={1.5} />
                        <div>
                          <p className="font-medium text-foreground">University / Hometown</p>
                          <p className="text-xs text-muted-foreground">
                            {profile?.campus || 'Not set'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCampusDialog(true)}
                      >
                        {profile?.campus ? 'Change' : 'Set'}
                      </Button>
                    </div>
                  </Card>
                </div>


                {/* Sign Out */}
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  Sign Out
                </Button>
              </>
            )}
          </main>
        </PageTransition>
      </PullToRefresh>

      <BottomNav />

      {/* Campus Setup Dialog */}
      <CampusSetupDialog
        open={showCampusDialog}
        onOpenChange={setShowCampusDialog}
        email={profile?.email || ''}
        onConfirm={async (campus) => {
          await updateProfile({ campus } as any);
          setShowCampusDialog(false);
          toast.success(`Campus set to ${campus}`);
        }}
      />
    </div>
  );
};

export default Profile;