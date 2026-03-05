import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TubelightNavbar } from '@/components/ui/tubelight-navbar';
import { EmptyState } from '@/components/EmptyState';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition, StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';
import { GroupCardSkeletonList } from '@/components/skeletons/GroupCardSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { triggerHaptic } from '@/hooks/useHaptic';

interface GroupData {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  member_count: number;
  your_streak: number;
}

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setError(null);

    try {
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

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      const enrichedGroups: GroupData[] = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { data: streak } = await supabase
            .from('streaks')
            .select('current_streak')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            id: group.id,
            name: group.name,
            habit_type: group.habit_type as HabitType,
            custom_habit: group.custom_habit,
            member_count: count || 0,
            your_streak: streak?.current_streak || 0,
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
  }, [user]);

  const handleRefresh = useCallback(async () => {
    await fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-black text-foreground">My Groups</h1>
          <Button
            asChild
            size="sm"
            className="gap-2 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
            onClick={() => triggerHaptic('light')}
          >
            <Link to="/create-group">
              <Plus className="w-4 h-4" />
              New
            </Link>
          </Button>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-80px)]">
        <PageTransition>
          <main className="px-4 py-6">
            {loading ? (
              <GroupCardSkeletonList count={4} />
            ) : error ? (
              <ErrorState
                type="network"
                message={error}
                onRetry={fetchGroups}
              />
            ) : groups.length > 0 ? (
              <StaggeredList className="space-y-3">
                {groups.map((group) => {
                  const habit = getHabitDisplay(group.habit_type, group.custom_habit);

                  return (
                    <StaggeredItem key={group.id}>
                      <Link to={`/group/${group.id}`} onClick={() => triggerHaptic('light')}>
                        <Card className="p-4 bg-card hover:bg-card/80 transition-all border-border">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <span className="text-2xl">{habit.emoji}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground truncate">
                                {group.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {group.member_count} member{group.member_count !== 1 && 's'} • {habit.label}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-warning flex items-center gap-1">
                                {group.your_streak > 0 && <span className="animate-pulse-fire">🔥</span>}
                                {group.your_streak}
                              </p>
                              <p className="text-xs text-muted-foreground">days</p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </StaggeredItem>
                  );
                })}
              </StaggeredList>
            ) : (
              <EmptyState
                emoji="👥"
                title="No groups yet"
                description="Create or join a group to start building streaks with friends"
                actionLabel="+ Create Group"
                onAction={() => {
                  triggerHaptic('light');
                  navigate('/create-group');
                }}
              />
            )}
          </main>
        </PageTransition>
      </PullToRefresh>

      <TubelightNavbar />
    </div>
  );
};

export default Groups;