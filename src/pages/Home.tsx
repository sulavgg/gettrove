import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TubelightNavbar } from '@/components/ui/tubelight-navbar';
import { FAB } from '@/components/ui/FAB';
import { JoinByCodeDialog } from '@/components/JoinByCodeDialog';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition, StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';
import { GroupCardSkeletonList } from '@/components/skeletons/GroupCardSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, HabitType } from '@/lib/supabase';
import { MIN_GROUP_MEMBERS } from '@/hooks/useGroupUnlock';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { WeeklyRecapSlides } from '@/components/recap/WeeklyRecapSlides';
import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptic';
import { getSignedPhotoUrls } from '@/lib/storage';

// New home components
import { StatsCard } from '@/components/home/StatsCard';
import { EnhancedGroupCard } from '@/components/home/EnhancedGroupCard';
import { ActivityFeed } from '@/components/home/ActivityFeed';
import { MilestoneAlert } from '@/components/home/MilestoneAlert';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';

interface DayStatus {
  day: string;
  posted: boolean;
  isToday: boolean;
  rested?: boolean;
}

interface GroupData {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  member_count: number;
  current_streak: number;
  longest_streak: number;
  posted_today: boolean;
  rested_today: boolean;
  posted_today_count: number;
  streak_broken: boolean;
  last_checkin_time: string | null;
  week_progress: DayStatus[];
  is_locked: boolean;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  groupId: string;
  groupName: string;
  photoUrl: string;
  caption?: string | null;
  createdAt: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, isEmailVerified } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecapBanner, setShowRecapBanner] = useState(true);
  const [showRecapSlides, setShowRecapSlides] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { 
    latestRecap, 
    hasUnviewedRecap, 
    markAsViewed, 
    generateRecapLocally 
  } = useWeeklyRecap();

  // Calculate hours left in the day
  const hoursLeft = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.floor((endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
  }, []);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const activeStreaks = groups.filter(g => g.current_streak > 0 && !g.streak_broken).length;
    const postedToday = groups.filter(g => g.posted_today || g.rested_today).length;
    const longestStreak = Math.max(...groups.map(g => g.longest_streak), 0);
    return { activeStreaks, postedToday, totalGroups: groups.length, longestStreak };
  }, [groups]);

  // Check for milestone proximity
  const milestoneAlert = useMemo(() => {
    for (const group of groups) {
      const streak = group.current_streak;
      const milestones = [7, 14, 21, 30, 60, 90, 100, 365];
      for (const milestone of milestones) {
        const daysToMilestone = milestone - streak;
        if (daysToMilestone > 0 && daysToMilestone <= 3) {
          return {
            type: 'milestone' as const,
            message: `${daysToMilestone} more day${daysToMilestone > 1 ? 's' : ''} to ${milestone}! 🏆`,
            subMessage: `Keep going in "${group.name}"`,
          };
        }
      }
    }
    return null;
  }, [groups]);

  // Generate week progress for a group
  const generateWeekProgress = useCallback((
    checkinDates: string[],
    restDates: string[]
  ): DayStatus[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === today.toDateString();
      const posted = checkinDates.some(d => d.startsWith(dateStr));
      const rested = restDates.includes(dateStr);
      
      return { day, posted, isToday, rested };
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchActivities();
      
      // Random confetti on app open if user has posted today (10% chance)
      const postedSomewhere = groups.some(g => g.posted_today);
      if (postedSomewhere && Math.random() < 0.1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setError(null);

    try {
      // Get user's groups
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships?.length) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Get group details
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      // Get today's date in user's timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const todayDate = today.toISOString().split('T')[0];

      // Get start of week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfWeekISO = startOfWeek.toISOString();

      // Get member counts and today's checkins
      const enrichedGroups: GroupData[] = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Member count
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Today's checkins count
          const { count: postedTodayCount } = await supabase
            .from('checkins')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gte('created_at', todayISO);

          // User's checkin today
          const { data: userCheckin } = await supabase
            .from('checkins')
            .select('id, created_at')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .gte('created_at', todayISO)
            .order('created_at', { ascending: false })
            .limit(1);

          // User's rest day today
          const { data: userRestDay } = await supabase
            .from('rest_days')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .eq('rest_date', todayDate)
            .limit(1);

          // User's streak
          const { data: streakData } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak, streak_broken_at')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .single();

          const streakBrokenRecently = streakData?.streak_broken_at
            ? new Date(streakData.streak_broken_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            : false;

          // Get this week's checkins for progress
          const { data: weekCheckins } = await supabase
            .from('checkins')
            .select('created_at')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .gte('created_at', startOfWeekISO);

          // Get this week's rest days
          const { data: weekRestDays } = await supabase
            .from('rest_days')
            .select('rest_date')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .gte('rest_date', startOfWeek.toISOString().split('T')[0]);

          const checkinDates = (weekCheckins || []).map(c => c.created_at);
          const restDates = (weekRestDays || []).map(r => r.rest_date);

          return {
            id: group.id,
            name: group.name,
            habit_type: group.habit_type as HabitType,
            custom_habit: group.custom_habit,
            member_count: memberCount || 0,
            current_streak: streakData?.current_streak || 0,
            longest_streak: streakData?.longest_streak || 0,
            posted_today: !!userCheckin?.length,
            rested_today: !!userRestDay?.length,
            posted_today_count: postedTodayCount || 0,
            streak_broken: streakBrokenRecently,
            last_checkin_time: userCheckin?.[0]?.created_at || null,
            week_progress: generateWeekProgress(checkinDates, restDates),
            is_locked: (memberCount || 0) < MIN_GROUP_MEMBERS,
          };
        })
      );

      setGroups(enrichedGroups);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [user, generateWeekProgress]);

  const fetchActivities = useCallback(async () => {
    if (!user) return;

    setActivitiesLoading(true);

    try {
      // Get user's groups first
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) {
        setActivities([]);
        setActivitiesLoading(false);
        return;
      }

      const groupIds = memberships.map(m => m.group_id);

      // Get today's checkins from all groups
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: checkins } = await supabase
        .from('checkins')
        .select('id, user_id, group_id, photo_url, caption, created_at')
        .in('group_id', groupIds)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (!checkins?.length) {
        setActivities([]);
        setActivitiesLoading(false);
        return;
      }

      // Get group names
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds);

      const groupMap = new Map(groups?.map(g => [g.id, g.name]) || []);

      // Get user profiles using RPC
      const userIds = [...new Set(checkins.map(c => c.user_id))];
      const profiles: Record<string, { name: string; profile_photo_url: string | null }> = {};

      for (const userId of userIds) {
        const { data: profileData } = await supabase
          .rpc('get_public_profile', { p_user_id: userId });
        if (profileData?.[0]) {
          profiles[userId] = {
            name: profileData[0].name,
            profile_photo_url: profileData[0].profile_photo_url,
          };
        }
      }

      // Generate fresh signed URLs for activity photos
      const photoUrls = checkins.map(c => c.photo_url);
      const signedUrlMap = await getSignedPhotoUrls(photoUrls);

      const activities: ActivityItem[] = checkins.map(checkin => ({
        id: checkin.id,
        userId: checkin.user_id,
        userName: profiles[checkin.user_id]?.name || 'Unknown',
        userAvatar: profiles[checkin.user_id]?.profile_photo_url,
        groupId: checkin.group_id,
        groupName: groupMap.get(checkin.group_id) || 'Unknown Group',
        photoUrl: signedUrlMap.get(checkin.photo_url) || checkin.photo_url,
        caption: checkin.caption,
        createdAt: checkin.created_at,
      }));

      setActivities(activities);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchGroups(), fetchActivities()]);
  }, [fetchGroups, fetchActivities]);

  const handleOpenRecap = async () => {
    triggerHaptic('light');
    if (latestRecap) {
      setShowRecapSlides(true);
      if (hasUnviewedRecap) {
        markAsViewed(latestRecap.id);
      }
    } else {
      const generated = await generateRecapLocally();
      if (generated) {
        setShowRecapSlides(true);
      } else {
        toast.error('Unable to generate recap');
      }
    }
  };

  const handleShareRecap = async () => {
    if (!latestRecap) return;
    
    const shareText = `My TROVE week: ${latestRecap.daysPosted}/7 days posted, ${latestRecap.currentStreak}-day streak! 🔥`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My TROVE Week',
          text: shareText,
          url: window.location.origin,
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard!');
    }
  };

  const hasUnpostedGroups = groups.some((g) => !g.posted_today && !g.rested_today);
  const allGroupsLocked = groups.length > 0 && groups.every(g => g.is_locked);
  const hasAnyUnlockedUnposted = groups.some(g => !g.is_locked && !g.posted_today && !g.rested_today);

  // Weekly Recap Slides
  if (showRecapSlides && latestRecap) {
    return (
      <WeeklyRecapSlides
        data={latestRecap}
        onClose={() => setShowRecapSlides(false)}
        onShare={handleShareRecap}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 0.5}s`,
                fontSize: '24px',
              }}
            >
              {['🎉', '✨', '🔥', '⭐', '🏆'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Email Verification Banner */}
      {!isEmailVerified && profile?.email && (
        <EmailVerificationBanner email={profile.email} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-heading font-black tracking-[0.15em] text-gold uppercase">TROVE</h1>
            <p className="text-sm text-muted-foreground">
              Hey {profile?.name?.split(' ')[0] || 'there'}! 👋
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
            onClick={() => triggerHaptic('light')}
          >
            <Link to="/create-group">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              New Group
            </Link>
          </Button>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-80px)]">
        <PageTransition>
          <main className="px-4 py-6 space-y-6">
            {/* Loading state */}
            {loading ? (
              <>
                {/* Stats skeleton */}
                <div className="h-36 rounded-2xl bg-card animate-pulse" />
                <GroupCardSkeletonList count={3} />
              </>
            ) : error ? (
              <ErrorState
                type="network"
                message={error}
                onRetry={fetchGroups}
              />
            ) : groups.length > 0 ? (
              <>
                {/* Quick Stats Card */}
                <StatsCard
                  activeStreaks={stats.activeStreaks}
                  postedToday={stats.postedToday}
                  totalGroups={stats.totalGroups}
                  longestStreak={stats.longestStreak}
                />

                {/* Weekly Recap Banner */}
                {hasUnviewedRecap && showRecapBanner && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 relative animate-fade-in">
                    <button
                      onClick={() => setShowRecapBanner(false)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50"
                    >
                      <X className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/20">
                        <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">📊 Your weekly recap is ready!</p>
                        <p className="text-sm text-muted-foreground">
                          See how you did last week
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenRecap}
                      className="w-full mt-3 bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    >
                      View Recap
                    </Button>
                  </div>
                )}

                {/* Milestone Alert */}
                {milestoneAlert && (
                  <MilestoneAlert
                    type={milestoneAlert.type}
                    message={milestoneAlert.message}
                    subMessage={milestoneAlert.subMessage}
                  />
                )}

                {/* Countdown/Warning for unposted groups */}
                {hasUnpostedGroups && hoursLeft > 0 && (
                  <MilestoneAlert
                    type="countdown"
                    message={`⏰ ${hoursLeft}h left to post today`}
                    subMessage="Don't break your streak!"
                  />
                )}

                {/* Groups Section */}
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-3">My Groups</h2>
                  <StaggeredList className="space-y-3">
                    {groups.map((group) => (
                      <StaggeredItem key={group.id}>
                        <EnhancedGroupCard
                          id={group.id}
                          name={group.name}
                          habitType={group.habit_type}
                          customHabit={group.custom_habit}
                          currentStreak={group.current_streak}
                          postedToday={group.posted_today}
                          restedToday={group.rested_today}
                          memberCount={group.member_count}
                          postedTodayCount={group.posted_today_count}
                          streakBroken={group.streak_broken}
                          lastCheckinTime={group.last_checkin_time}
                          weekProgress={group.week_progress}
                          hoursLeft={group.posted_today || group.rested_today ? undefined : hoursLeft}
                          isLocked={group.is_locked}
                        />
                      </StaggeredItem>
                    ))}
                  </StaggeredList>
                </div>

                {/* Today's Activity Feed */}
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-3">Today's Activity</h2>
                  <ActivityFeed activities={activities} isLoading={activitiesLoading} />
                </div>
              </>
            ) : (
              <HomeEmptyState
                onCreateGroup={() => {
                  triggerHaptic('light');
                  navigate('/create-group');
                }}
                onJoinGroup={() => {
                  triggerHaptic('light');
                  setShowJoinDialog(true);
                }}
              />
            )}
          </main>
        </PageTransition>
      </PullToRefresh>

      {/* Join by Code Dialog */}
      <JoinByCodeDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />

      {/* FAB - only show if user has groups */}
      {groups.length > 0 && (
        allGroupsLocked 
          ? <FAB locked pulse={false} />
          : <FAB pulse={hasAnyUnlockedUnposted} />
      )}

      <TubelightNavbar />
    </div>
  );
};

export default Home;
