import { useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';

interface StreakEntry {
  user_id: string;
  name: string;
  photo: string | null;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  streak_broken_at: string | null;
}

interface StreaksLeaderboardProps {
  groupId: string;
}

export const StreaksLeaderboard = ({ groupId }: StreaksLeaderboardProps) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    try {
      const [{ data: profiles }, { data: streaks }] = await Promise.all([
        supabase.rpc('get_group_member_profiles', { p_group_id: groupId }),
        supabase
          .from('streaks')
          .select('user_id, current_streak, longest_streak, last_checkin_date, streak_broken_at')
          .eq('group_id', groupId),
      ]);

      const merged: StreakEntry[] = (profiles || []).map((p) => {
        const s = streaks?.find((s) => s.user_id === p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          photo: p.profile_photo_url,
          current_streak: s?.current_streak || 0,
          longest_streak: s?.longest_streak || 0,
          last_checkin_date: s?.last_checkin_date || null,
          streak_broken_at: s?.streak_broken_at || null,
        };
      });

      setEntries(merged);
    } catch (err) {
      console.error('Error fetching streaks:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active streaks: current_streak > 0, sorted desc
  const activeStreaks = [...entries]
    .filter((e) => e.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 50);

  // Legendary: sorted by longest_streak desc
  const legendaryStreaks = [...entries]
    .filter((e) => e.longest_streak > 0)
    .sort((a, b) => b.longest_streak - a.longest_streak)
    .slice(0, 50);

  const getPercentile = (rank: number, total: number) => {
    if (total <= 1) return null;
    const pct = (rank / total) * 100;
    if (pct <= 0.5) return 'Top 0.5%';
    if (pct <= 1) return 'Top 1%';
    if (pct <= 5) return 'Top 5%';
    if (pct <= 10) return 'Top 10%';
    return null;
  };

  const getStartDate = (entry: StreakEntry) => {
    if (!entry.last_checkin_date || entry.current_streak <= 0) return null;
    const start = subDays(new Date(entry.last_checkin_date), entry.current_streak - 1);
    return format(start, 'MMM d, yyyy');
  };

  const getMedal = (rank: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Active Streaks */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔥</span>
          <h2 className="text-lg font-bold text-foreground">Longest Active Streaks</h2>
        </div>

        {activeStreaks.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No active streaks yet</p>
        ) : (
          <StaggeredList className="space-y-2">
            {activeStreaks.map((entry, index) => {
              const rank = index + 1;
              const medal = getMedal(rank);
              const isCurrentUser = entry.user_id === user?.id;
              const percentile = getPercentile(rank, activeStreaks.length);
              const startDate = getStartDate(entry);

              return (
                <StaggeredItem key={entry.user_id}>
                  <div
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border transition-colors',
                      isCurrentUser
                        ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/30'
                        : 'bg-card border-border'
                    )}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {medal ? (
                        <span className="text-xl">{medal}</span>
                      ) : (
                        <span className="text-muted-foreground font-bold">{rank}</span>
                      )}
                    </div>

                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={entry.photo || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.name[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {entry.name}
                        {isCurrentUser && ' (You)'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="animate-pulse-fire">🔥</span>
                        {entry.current_streak} days
                        {startDate && <span>· Started {startDate}</span>}
                      </p>
                      {percentile && (
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                          {percentile}
                        </Badge>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-warning text-lg">
                        {entry.current_streak}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">days</p>
                    </div>
                  </div>
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        )}
      </section>

      {/* Section 2: Legendary Streaks */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏆</span>
          <h2 className="text-lg font-bold text-foreground">Legendary Streaks (All-Time)</h2>
        </div>

        {legendaryStreaks.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No legendary streaks yet</p>
        ) : (
          <StaggeredList className="space-y-2">
            {legendaryStreaks.map((entry, index) => {
              const rank = index + 1;
              const medal = getMedal(rank);
              const isCurrentUser = entry.user_id === user?.id;
              const isActive = entry.current_streak === entry.longest_streak && entry.current_streak > 0;

              // Calculate date range for longest streak
              let dateRange = '';
              if (isActive && entry.last_checkin_date) {
                const start = subDays(new Date(entry.last_checkin_date), entry.longest_streak - 1);
                dateRange = `${format(start, 'MMM yyyy')} – Present`;
              } else if (entry.streak_broken_at) {
                const end = new Date(entry.streak_broken_at);
                const start = subDays(end, entry.longest_streak - 1);
                dateRange = `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`;
              }

              return (
                <StaggeredItem key={entry.user_id}>
                  <div
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border transition-colors',
                      isCurrentUser
                        ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/30'
                        : 'bg-card border-border'
                    )}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {medal ? (
                        <span className="text-xl">{medal}</span>
                      ) : (
                        <span className="text-muted-foreground font-bold">{rank}</span>
                      )}
                    </div>

                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={entry.photo || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.name[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {entry.name}
                        {isCurrentUser && ' (You)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        🏆 {entry.longest_streak} days
                        {dateRange && <span> · {dateRange}</span>}
                      </p>
                      <span
                        className={cn(
                          'inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          isActive
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isActive ? 'Active ✨' : 'Ended 💀'}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-warning text-lg">
                        {entry.longest_streak}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">days</p>
                    </div>
                  </div>
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        )}
      </section>
    </div>
  );
};
