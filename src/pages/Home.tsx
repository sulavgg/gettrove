import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Loader2, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/ui/BottomNav';
import { FAB } from '@/components/ui/FAB';
import { GroupCard } from '@/components/GroupCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, HabitType } from '@/lib/supabase';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { WeeklyRecapSlides } from '@/components/recap/WeeklyRecapSlides';
import { toast } from 'sonner';

interface GroupData {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  member_count: number;
  current_streak: number;
  posted_today: boolean;
  posted_today_count: number;
  streak_broken: boolean;
}

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecapBanner, setShowRecapBanner] = useState(true);
  const [showRecapSlides, setShowRecapSlides] = useState(false);
  
  const { 
    latestRecap, 
    hasUnviewedRecap, 
    markAsViewed, 
    generateRecapLocally 
  } = useWeeklyRecap();

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

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
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .gte('created_at', todayISO)
            .limit(1);

          // User's streak
          const { data: streakData } = await supabase
            .from('streaks')
            .select('current_streak, streak_broken_at')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .single();

          const streakBrokenRecently = streakData?.streak_broken_at
            ? new Date(streakData.streak_broken_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            : false;

          return {
            id: group.id,
            name: group.name,
            habit_type: group.habit_type as HabitType,
            custom_habit: group.custom_habit,
            member_count: memberCount || 0,
            current_streak: streakData?.current_streak || 0,
            posted_today: !!userCheckin?.length,
            posted_today_count: postedTodayCount || 0,
            streak_broken: streakBrokenRecently,
          };
        })
      );

      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleOpenRecap = async () => {
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
    
    const shareText = `My HABITZ week: ${latestRecap.daysPosted}/7 days posted, ${latestRecap.currentStreak}-day streak! 🔥`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My HABITZ Week',
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

  const hasUnpostedGroups = groups.some((g) => !g.posted_today);

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-black text-gradient-primary">HABITZ</h1>
            <p className="text-sm text-muted-foreground">
              Hey {profile?.name?.split(' ')[0] || 'there'}! 👋
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <Link to="/create-group">
              <Plus className="w-4 h-4" />
              New Group
            </Link>
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Weekly Recap Banner */}
        {hasUnviewedRecap && showRecapBanner && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 relative">
            <button
              onClick={() => setShowRecapBanner(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <BarChart3 className="w-5 h-5 text-primary" />
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
              className="w-full mt-3 gradient-primary font-semibold"
            >
              View Recap
            </Button>
          </div>
        )}

        {/* Alert for unposted groups */}
        {hasUnpostedGroups && groups.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-destructive">Don't break your streak!</p>
                <p className="text-sm text-muted-foreground">
                  You have groups waiting for today's check-in
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Groups list */}
        {groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                habitType={group.habit_type}
                customHabit={group.custom_habit}
                currentStreak={group.current_streak}
                postedToday={group.posted_today}
                memberCount={group.member_count}
                postedTodayCount={group.posted_today_count}
                streakBroken={group.streak_broken}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            emoji="👥"
            title="No groups yet"
            description="Create a group to compete with friends and build streaks"
            actionLabel="+ Create Your First Group"
            onAction={() => navigate('/create-group')}
            secondaryLabel="Join a friend's group"
            onSecondaryAction={() => navigate('/')}
          />
        )}
      </main>

      {/* FAB - only show if user has groups */}
      {groups.length > 0 && <FAB />}

      <BottomNav />
    </div>
  );
};

export default Home;
