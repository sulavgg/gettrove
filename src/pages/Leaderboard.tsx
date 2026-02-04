import { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/ui/BottomNav';
import { EmptyState } from '@/components/EmptyState';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition, StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';
import { LeaderboardSkeleton } from '@/components/skeletons/LeaderboardSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptic';

interface GroupOption {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  photo: string | null;
  current_streak: number;
  total_checkins: number;
  posted_today: boolean;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchLeaderboard();
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships?.length) {
        setLoading(false);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      const options: GroupOption[] = (groupsData || []).map((g) => ({
        id: g.id,
        name: g.name,
        habit_type: g.habit_type as HabitType,
        custom_habit: g.custom_habit,
      }));

      setGroups(options);
      if (options.length > 0) {
        setSelectedGroup(options[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = useCallback(async () => {
    if (!selectedGroup) return;

    setLoadingEntries(true);
    setError(null);

    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', selectedGroup);

      const memberIds = members?.map((m) => m.user_id) || [];

      // Use secure RPC function to get public profile data (excludes email, enforces auth)
      const { data: profiles } = await supabase
        .rpc('get_group_member_profiles', { p_group_id: selectedGroup });

      // Get streaks
      const { data: streaks } = await supabase
        .from('streaks')
        .select('user_id, current_streak, total_checkins')
        .eq('group_id', selectedGroup);

      // Get today's checkins
      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('user_id')
        .eq('group_id', selectedGroup)
        .gte('created_at', todayISO);

      const postedTodayIds = new Set(todayCheckins?.map((c) => c.user_id) || []);

      const leaderboardData: LeaderboardEntry[] = (profiles || []).map((p) => {
        const streak = streaks?.find((s) => s.user_id === p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          photo: p.profile_photo_url,
          current_streak: streak?.current_streak || 0,
          total_checkins: streak?.total_checkins || 0,
          posted_today: postedTodayIds.has(p.user_id),
        };
      });

      // Sort by streak, then total checkins
      leaderboardData.sort((a, b) => {
        if (b.current_streak !== a.current_streak) {
          return b.current_streak - a.current_streak;
        }
        return b.total_checkins - a.total_checkins;
      });

      setEntries(leaderboardData);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedGroup]);

  const handleRefresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  // Calculate group stats
  const avgStreak = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.current_streak, 0) / entries.length)
    : 0;
  const totalCheckins = entries.reduce((sum, e) => sum + e.total_checkins, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-black text-foreground mb-4">Leaderboard</h1>

          {groups.length > 0 && (
            <Select 
              value={selectedGroup} 
              onValueChange={(value) => {
                triggerHaptic('light');
                setSelectedGroup(value);
              }}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => {
                  const habit = getHabitDisplay(group.habit_type, group.custom_habit);
                  return (
                    <SelectItem key={group.id} value={group.id}>
                      <span className="flex items-center gap-2">
                        <span>{habit.emoji}</span>
                        <span>{group.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-80px)]">
        <PageTransition>
          <main className="px-4 py-6">
            {loading ? (
              <LeaderboardSkeleton count={5} />
            ) : groups.length === 0 ? (
              <EmptyState
                emoji="🏆"
                title="No groups yet"
                description="Join a group to see the leaderboard"
              />
            ) : error ? (
              <ErrorState
                type="network"
                message={error}
                onRetry={fetchLeaderboard}
              />
            ) : loadingEntries ? (
              <LeaderboardSkeleton count={5} />
            ) : (
              <>
                {/* Group Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-card rounded-xl p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Avg Streak
                    </p>
                    <p className="text-2xl font-bold text-warning flex items-center gap-1">
                      🔥 {avgStreak} days
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Total Check-ins
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {totalCheckins}
                    </p>
                  </div>
                </div>

                {/* Leaderboard list */}
                <StaggeredList className="space-y-2">
                  {entries.map((entry, index) => {
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                    const isCurrentUser = entry.user_id === user?.id;

                    return (
                      <StaggeredItem key={entry.user_id}>
                        <div
                          className={cn(
                            'flex items-center gap-3 p-4 rounded-xl border transition-colors',
                            isCurrentUser
                              ? 'bg-primary/10 border-primary/20'
                              : 'bg-card border-border'
                          )}
                        >
                          {/* Rank */}
                          <div className="w-8 text-center flex-shrink-0">
                            {medal ? (
                              <span className="text-xl">{medal}</span>
                            ) : (
                              <span className="text-muted-foreground font-bold">{rank}</span>
                            )}
                          </div>

                          {/* Avatar */}
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={entry.photo || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {entry.name[0]}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {entry.name}
                              {isCurrentUser && ' (You)'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.total_checkins} total check-ins
                            </p>
                          </div>

                          {/* Streak */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-warning flex items-center gap-1">
                              {entry.current_streak > 0 && (
                                <span className="animate-pulse-fire">🔥</span>
                              )}
                              {entry.current_streak} days
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.posted_today ? '✓ Today' : '⏰ Pending'}
                            </p>
                          </div>
                        </div>
                      </StaggeredItem>
                    );
                  })}
                </StaggeredList>
              </>
            )}
          </main>
        </PageTransition>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;