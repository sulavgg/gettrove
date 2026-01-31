import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!selectedGroup) return;

    setLoadingEntries(true);
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

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo_url')
        .in('user_id', memberIds);

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
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
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

      <main className="px-4 py-6">
        {groups.length === 0 ? (
          <EmptyState
            emoji="🏆"
            title="No groups yet"
            description="Join a group to see the leaderboard"
          />
        ) : loadingEntries ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
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
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                const isCurrentUser = entry.user_id === user?.id;

                return (
                  <div
                    key={entry.user_id}
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
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
