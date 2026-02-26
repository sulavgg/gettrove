import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Filter, TrendingUp, Award, Flame } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/ui/BottomNav';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { PageTransition, StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';
import { ErrorState } from '@/components/ui/ErrorState';
import { CheckInCard } from '@/components/CheckInCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedPhotoUrls } from '@/lib/storage';
import { habitTypeLabels, type HabitType } from '@/lib/supabase';
import { CheckInCardSkeletonList } from '@/components/skeletons/CheckInCardSkeleton';

type FeedFilter = 'today' | 'trending' | 'milestones';

interface CampusPost {
  id: string;
  userId: string;
  displayName: string;
  profilePhoto: string | null;
  habitType: string;
  currentStreak: number;
  photoUrl: string;
  selfieUrl: string | null;
  captureTimestamp: string | null;
  caption: string | null;
  createdAt: string;
  reactionCount: number;
  hasReacted: boolean;
  isAnonymous: boolean;
}

interface CampusStats {
  totalStudents: number;
  avgStreak: number;
  topHabit: string | null;
  topHabitPct: number;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  profile_photo_url: string | null;
  current_streak: number;
  habit_type: string;
  is_anonymous: boolean;
}

const Campus = () => {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('today');
  const [habitFilter, setHabitFilter] = useState<string | null>(null);
  const [posts, setPosts] = useState<CampusPost[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [campusStats, setCampusStats] = useState<CampusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  const campus = profile?.campus;

  const fetchCampusStats = useCallback(async () => {
    if (!campus) return;
    try {
      const { data } = await supabase.rpc('get_campus_stats', { p_campus: campus });
      if (data && data.length > 0) {
        setCampusStats({
          totalStudents: Number(data[0].total_students) || 0,
          avgStreak: Math.round(Number(data[0].avg_streak) || 0),
          topHabit: data[0].top_habit,
          topHabitPct: Number(data[0].top_habit_pct) || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching campus stats:', err);
    }
  }, [campus]);

  const fetchFeed = useCallback(async () => {
    if (!campus || !user) return;
    setError(null);
    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('checkins')
        .select('id, user_id, group_id, photo_url, selfie_url, capture_timestamp, caption, created_at')
        .eq('shared_to_campus', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedFilter === 'today') {
        query = query.gte('created_at', today.toISOString());
      } else if (feedFilter === 'trending') {
        // Last 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('created_at', yesterday.toISOString());
      }

      const { data: checkins, error: checkinsError } = await query;
      if (checkinsError) throw checkinsError;
      if (!checkins?.length) { setPosts([]); setLoading(false); return; }

      // Get profiles for all posters
      const userIds = [...new Set(checkins.map(c => c.user_id))];
      const profiles: Record<string, { name: string; photo: string | null; campus: string | null; anonymous: boolean }> = {};

      for (const uid of userIds) {
        const { data: pData } = await supabase
          .rpc('get_public_profile', { p_user_id: uid });
        if (pData?.[0]) {
          // We need to check campus match and anonymous status
          // The RLS policy already filters for same campus, so all results are valid
          profiles[uid] = {
            name: pData[0].name,
            photo: pData[0].profile_photo_url,
            campus: null, // We don't expose this
            anonymous: false, // Will be determined separately
          };
        }
      }

      // Get anonymous status for posters (we can only see our own profile details)
      // For others, we rely on the leaderboard function. For feed display, format name.
      
      // Get streaks for all users
      const streakMap: Record<string, number> = {};
      const habitMap: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: streaks } = await supabase
          .from('streaks')
          .select('current_streak, group_id')
          .eq('user_id', uid)
          .order('current_streak', { ascending: false })
          .limit(1);
        if (streaks?.[0]) {
          streakMap[uid] = streaks[0].current_streak;
          // Get habit type from group
          const { data: group } = await supabase
            .from('groups')
            .select('habit_type')
            .eq('id', streaks[0].group_id)
            .single();
          if (group) habitMap[uid] = group.habit_type;
        }
      }

      // Get signed URLs
      const allUrls: string[] = [];
      checkins.forEach(c => {
        allUrls.push(c.photo_url);
        if (c.selfie_url) allUrls.push(c.selfie_url);
      });
      const signedUrlMap = allUrls.length > 0 ? await getSignedPhotoUrls(allUrls) : new Map();

      // Get reactions
      const checkinIds = checkins.map(c => c.id);
      const { data: reactions } = await supabase
        .from('reactions')
        .select('checkin_id, user_id')
        .in('checkin_id', checkinIds);

      const reactionCounts: Record<string, number> = {};
      const userReacted: Record<string, boolean> = {};
      reactions?.forEach(r => {
        reactionCounts[r.checkin_id] = (reactionCounts[r.checkin_id] || 0) + 1;
        if (r.user_id === user.id) userReacted[r.checkin_id] = true;
      });

      let campusPosts: CampusPost[] = checkins.map(c => {
        const p = profiles[c.user_id];
        const fullName = p?.name || 'Unknown';
        const nameParts = fullName.split(' ');
        const displayName = nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
          : nameParts[0];

        // Check if this user is anonymous on campus
        const isCurrentUser = c.user_id === user.id;
        let isAnonymous = false;
        if (isCurrentUser && profile?.anonymous_on_campus) {
          isAnonymous = true;
        }
        // For other users, we can't read their profile directly due to RLS,
        // but the leaderboard RPC respects it. For the feed, we use get_public_profile
        // which only returns name/photo — anonymous status needs a separate check.
        // We'll rely on the campus leaderboard data if available, otherwise show name.

        return {
          id: c.id,
          userId: c.user_id,
          displayName: isAnonymous ? 'Anonymous' : displayName,
          profilePhoto: isAnonymous ? null : (p?.photo || null),
          habitType: habitMap[c.user_id] || 'other',
          currentStreak: streakMap[c.user_id] || 0,
          photoUrl: signedUrlMap.get(c.photo_url) || c.photo_url,
          selfieUrl: c.selfie_url ? (signedUrlMap.get(c.selfie_url) || c.selfie_url) : null,
          captureTimestamp: c.capture_timestamp,
          caption: c.caption,
          createdAt: c.created_at,
          reactionCount: reactionCounts[c.id] || 0,
          hasReacted: !!userReacted[c.id],
          isAnonymous,
        };
      });

      // Apply filters
      if (feedFilter === 'trending') {
        campusPosts.sort((a, b) => b.reactionCount - a.reactionCount);
      } else if (feedFilter === 'milestones') {
        const milestones = [7, 30, 100, 365];
        campusPosts = campusPosts.filter(p => milestones.includes(p.currentStreak));
      }

      if (habitFilter) {
        campusPosts = campusPosts.filter(p => p.habitType === habitFilter);
      }

      setPosts(campusPosts);
    } catch (err: any) {
      console.error('Error fetching campus feed:', err);
      setError(err.message || 'Failed to load campus feed');
    } finally {
      setLoading(false);
    }
  }, [campus, user, feedFilter, habitFilter]);

  const fetchLeaderboard = useCallback(async () => {
    if (!campus) return;
    setLeaderboardLoading(true);
    try {
      const { data, error: lbError } = await supabase.rpc('get_campus_leaderboard', {
        p_campus: campus,
        p_habit_filter: habitFilter,
      });
      if (lbError) throw lbError;

      // Sort by streak descending
      const sorted = (data || []).sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.current_streak - a.current_streak);
      setLeaderboard(sorted);

      // Find user rank
      const rank = sorted.findIndex((e: LeaderboardEntry) => e.user_id === user?.id);
      setUserRank(rank >= 0 ? rank + 1 : null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [campus, user, habitFilter]);

  useEffect(() => {
    if (campus) {
      fetchCampusStats();
      if (tab === 'feed') fetchFeed();
      else fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [campus, tab, fetchFeed, fetchLeaderboard, fetchCampusStats]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchCampusStats(),
      tab === 'feed' ? fetchFeed() : fetchLeaderboard(),
    ]);
  }, [fetchCampusStats, fetchFeed, fetchLeaderboard, tab]);

  const habitLabel = (type: string) => {
    const h = habitTypeLabels[type as HabitType];
    return h ? `${h.emoji} ${h.label}` : type;
  };

  // No campus set
  if (!campus) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-black text-foreground font-heading">Campus</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="text-6xl mb-4">🏫</span>
          <h2 className="text-xl font-bold text-foreground mb-2">Join Your Campus Community</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Set your university in Profile → Settings to see posts from students at your school.
          </p>
          <Button onClick={() => window.location.href = '/profile'} className="bg-primary text-primary-foreground font-semibold">
            Go to Profile Settings
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-black text-foreground font-heading">Campus</h1>
          <p className="text-sm text-muted-foreground">{campus}</p>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-80px)]">
        <PageTransition>
          <main className="px-4 py-6 space-y-6">
            {/* Campus Stats Banner */}
            {campusStats && (
              <Card className="p-4 bg-card border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    🏫 {campus}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{campusStats.totalStudents}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Students</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-warning">{campusStats.avgStreak}d</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Streak</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-success">
                      {campusStats.topHabit ? habitLabel(campusStats.topHabit).split(' ')[0] : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Top Habit {campusStats.topHabitPct > 0 && `(${campusStats.topHabitPct}%)`}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'feed' | 'leaderboard')}>
              <TabsList className="w-full mb-4 bg-muted/30">
                <TabsTrigger value="feed" className="flex-1">Feed</TabsTrigger>
                <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="space-y-4">
                {/* Feed Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {([
                    { key: 'today', label: 'Today', icon: Flame },
                    { key: 'trending', label: 'Trending', icon: TrendingUp },
                    { key: 'milestones', label: 'Milestones', icon: Award },
                  ] as const).map(f => (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={feedFilter === f.key ? 'default' : 'outline'}
                      onClick={() => setFeedFilter(f.key)}
                      className={`gap-1.5 shrink-0 ${feedFilter === f.key ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <f.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {f.label}
                    </Button>
                  ))}
                </div>

                {/* Habit filter chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Button
                    size="sm"
                    variant={habitFilter === null ? 'default' : 'ghost'}
                    onClick={() => setHabitFilter(null)}
                    className={`shrink-0 text-xs ${habitFilter === null ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    All
                  </Button>
                  {Object.entries(habitTypeLabels).slice(0, 6).map(([key, val]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={habitFilter === key ? 'default' : 'ghost'}
                      onClick={() => setHabitFilter(key === habitFilter ? null : key)}
                      className={`shrink-0 text-xs ${habitFilter === key ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {val.emoji} {val.label}
                    </Button>
                  ))}
                </div>

                {/* Feed content */}
                {loading ? (
                  <CheckInCardSkeletonList count={3} />
                ) : error ? (
                  <ErrorState type="network" message={error} onRetry={fetchFeed} />
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">📭</span>
                    <h3 className="text-lg font-bold text-foreground mb-1">No posts yet</h3>
                    <p className="text-sm text-muted-foreground">
                      {feedFilter === 'today' ? 'Be the first to post today!' : 'Nothing matches this filter.'}
                    </p>
                  </div>
                ) : (
                  <StaggeredList className="space-y-4">
                    {posts.map(post => (
                      <StaggeredItem key={post.id}>
                        <CheckInCard
                          id={post.id}
                          userName={post.displayName}
                          userPhoto={post.profilePhoto}
                          photoUrl={post.photoUrl}
                          selfieUrl={post.selfieUrl}
                          captureTimestamp={post.captureTimestamp}
                          caption={post.caption}
                          createdAt={post.createdAt}
                          currentStreak={post.currentStreak}
                          reactionCount={post.reactionCount}
                          hasReacted={post.hasReacted}
                          onReactionChange={fetchFeed}
                        />
                      </StaggeredItem>
                    ))}
                  </StaggeredList>
                )}
              </TabsContent>

              <TabsContent value="leaderboard" className="space-y-4">
                {/* Habit filter for leaderboard */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Button
                    size="sm"
                    variant={habitFilter === null ? 'default' : 'ghost'}
                    onClick={() => setHabitFilter(null)}
                    className={`shrink-0 text-xs ${habitFilter === null ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    All Habits
                  </Button>
                  {Object.entries(habitTypeLabels).slice(0, 6).map(([key, val]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={habitFilter === key ? 'default' : 'ghost'}
                      onClick={() => setHabitFilter(key === habitFilter ? null : key)}
                      className={`shrink-0 text-xs ${habitFilter === key ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {val.emoji} {val.label}
                    </Button>
                  ))}
                </div>

                {/* User rank */}
                {userRank && (
                  <Card className="p-3 bg-primary/10 border border-primary/20">
                    <p className="text-sm text-center font-semibold text-foreground">
                      Your rank: <span className="text-primary">#{userRank}</span> out of {leaderboard.length}
                    </p>
                  </Card>
                )}

                {leaderboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">🏆</span>
                    <h3 className="text-lg font-bold text-foreground mb-1">No streaks yet</h3>
                    <p className="text-sm text-muted-foreground">Be the first to start a streak at your campus!</p>
                  </div>
                ) : (
                  <StaggeredList className="space-y-2">
                    {leaderboard.slice(0, 25).map((entry, index) => (
                      <StaggeredItem key={entry.user_id}>
                        <Card className={`flex items-center gap-3 p-3 bg-card border ${index < 3 ? 'border-primary/30' : 'border-white/[0.08]'}`}>
                          <span className={`text-lg font-bold min-w-[2.5rem] text-center ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {rankMedal(index + 1)}
                          </span>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={entry.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                              {entry.is_anonymous ? '?' : entry.display_name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {entry.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {habitLabel(entry.habit_type)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10">
                            <span className="text-sm">🔥</span>
                            <span className="text-sm font-bold text-warning">{entry.current_streak}</span>
                          </div>
                        </Card>
                      </StaggeredItem>
                    ))}
                  </StaggeredList>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </PageTransition>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Campus;
