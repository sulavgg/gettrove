import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, MessageCircle, Moon, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckInCard } from '@/components/CheckInCard';
import { EmptyState } from '@/components/EmptyState';
import { BottomNav } from '@/components/ui/BottomNav';
import { FAB } from '@/components/ui/FAB';
import { LeaderboardTab } from '@/components/LeaderboardTab';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageTransition, StaggeredList, StaggeredItem } from '@/components/ui/PageTransition';
import { CheckInCardSkeletonList } from '@/components/skeletons/CheckInCardSkeleton';
import { MemberListSkeleton } from '@/components/skeletons/MemberListSkeleton';
import { GroupUnlockBanner } from '@/components/GroupUnlockBanner';
import { ChallengeBanner } from '@/components/challenges/ChallengeBanner';
import { ChallengeLeaderboard } from '@/components/challenges/ChallengeLeaderboard';
import { InviteFriendsSection } from '@/components/invite/InviteFriendsSection';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useGroupUnlock } from '@/hooks/useGroupUnlock';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';

interface GroupInfo {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  invite_code: string;
}

interface Member {
  user_id: string;
  name: string;
  photo: string | null;
  posted_today: boolean;
  rested_today: boolean;
  current_streak: number;
  checkin?: {
    id: string;
    photo_url: string;
    caption: string | null;
    created_at: string;
    reaction_count: number;
    has_reacted: boolean;
  };
}

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isUnlocked, memberCount: unlockMemberCount, refetch: refetchUnlock } = useGroupUnlock(id);
  const weeklyChallenge = useWeeklyChallenge(id);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('feed');

  const fetchGroupData = useCallback(async () => {
    if (!id || !user) return;

    setError(null);

    try {
      // First try to get group by ID (members can view their groups via RLS)
      let groupData;
      const { data: groupById, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupError && groupError.code !== 'PGRST116') {
        throw groupError;
      }

      if (groupById) {
        groupData = groupById;
      } else {
        // Try by invite code using secure RPC function
        const { data: groupByCode } = await supabase
          .rpc('lookup_group_by_invite_code', { code: id.toUpperCase() });
        
        if (groupByCode && groupByCode.length > 0) {
          // Get full group data since user may be a member
          const { data: fullGroup } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupByCode[0].id)
            .single();
          groupData = fullGroup;
        }
      }

      if (!groupData) {
        navigate('/');
        return;
      }

      setGroup({
        id: groupData.id,
        name: groupData.name,
        habit_type: groupData.habit_type as HabitType,
        custom_habit: groupData.custom_habit,
        invite_code: groupData.invite_code,
      });

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get members with their profiles
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupData.id);

      const memberIds = membersData?.map((m) => m.user_id) || [];

      // Use secure RPC function to get public profile data (excludes email, enforces auth)
      const { data: profiles } = await supabase
        .rpc('get_group_member_profiles', { p_group_id: groupData.id });

      // Get today's checkins
      const { data: checkins } = await supabase
        .from('checkins')
        .select('*')
        .eq('group_id', groupData.id)
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false });

      // Get today's rest days
      const todayDate = today.toISOString().split('T')[0];
      const { data: restDays } = await supabase
        .from('rest_days')
        .select('user_id')
        .eq('group_id', groupData.id)
        .eq('rest_date', todayDate);

      const restedTodaySet = new Set(restDays?.map((r) => r.user_id) || []);

      // Get reaction counts
      const checkinIds = checkins?.map((c) => c.id) || [];
      const { data: reactions } = await supabase
        .from('reactions')
        .select('checkin_id, user_id')
        .in('checkin_id', checkinIds);

      // Get streaks
      const { data: streaks } = await supabase
        .from('streaks')
        .select('user_id, current_streak')
        .eq('group_id', groupData.id);

      // Build member data
      const enrichedMembers: Member[] = (profiles || []).map((profile) => {
        const checkin = checkins?.find((c) => c.user_id === profile.user_id);
        const reactionData = reactions?.filter((r) => r.checkin_id === checkin?.id) || [];
        const streak = streaks?.find((s) => s.user_id === profile.user_id);

        return {
          user_id: profile.user_id,
          name: profile.name,
          photo: profile.profile_photo_url,
          posted_today: !!checkin,
          rested_today: restedTodaySet.has(profile.user_id),
          current_streak: streak?.current_streak || 0,
          checkin: checkin
            ? {
                id: checkin.id,
                photo_url: checkin.photo_url,
                caption: checkin.caption,
                created_at: checkin.created_at,
                reaction_count: reactionData.length,
                has_reacted: reactionData.some((r) => r.user_id === user.id),
              }
            : undefined,
        };
      });

      // Sort: posted first, then by streak
      enrichedMembers.sort((a, b) => {
        if (a.posted_today !== b.posted_today) {
          return a.posted_today ? -1 : 1;
        }
        return b.current_streak - a.current_streak;
      });

      setMembers(enrichedMembers);
    } catch (err: any) {
      console.error('Error fetching group:', err);
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchGroupData();
    }
  }, [id, user, fetchGroupData]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchGroupData(), refetchUnlock(), weeklyChallenge.refetch()]);
  }, [fetchGroupData, refetchUnlock, weeklyChallenge.refetch]);

  if (!loading && !group && !error) return null;

  const habit = group ? getHabitDisplay(group.habit_type, group.custom_habit) : { emoji: '📌', label: 'Loading' };
  const postedCount = members.filter((m) => m.posted_today).length;
  const percentage = members.length > 0 ? Math.round((postedCount / members.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span>{habit.emoji}</span>
              <h1 className="font-bold text-foreground">{group?.name || 'Loading...'}</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {postedCount}/{members.length} posted today • {percentage}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/group/${group?.id}/chat`}
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={() => triggerHaptic('light')}
            >
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link
              to={`/group/${group?.id}/settings`}
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={() => triggerHaptic('light')}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-80px)]">
        <PageTransition>
          <main className="px-4 py-6">
            {error ? (
              <ErrorState
                type="network"
                message={error}
                onRetry={fetchGroupData}
              />
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full mb-6 bg-card">
                  <TabsTrigger value="feed" className="flex-1" onClick={() => triggerHaptic('light')}>Feed</TabsTrigger>
                  <TabsTrigger value="leaderboard" className="flex-1" onClick={() => triggerHaptic('light')}>Leaderboard</TabsTrigger>
                  <TabsTrigger value="invite" className="flex-1" onClick={() => triggerHaptic('light')}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Invite
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="feed" className="space-y-6">
                  {loading ? (
                    <>
                      <CheckInCardSkeletonList count={2} />
                      <MemberListSkeleton count={3} />
                    </>
                  ) : (
                    <>
                       {/* Weekly Challenge Banner */}
                      {weeklyChallenge.challenge && (
                        <ChallengeBanner
                          challenge={weeklyChallenge.challenge}
                          weekEnd={weeklyChallenge.weekEnd}
                          nextChallenge={weeklyChallenge.nextChallenge}
                        />
                      )}

                      {/* Challenge Leaderboard */}
                      {weeklyChallenge.challenge && weeklyChallenge.scores.length > 0 && (
                        <ChallengeLeaderboard
                          scores={weeklyChallenge.scores}
                          challenge={weeklyChallenge.challenge}
                          currentUserId={user?.id}
                        />
                      )}

                      {/* Group Unlock Banner */}
                      {!isUnlocked && group && (
                        <GroupUnlockBanner
                          groupName={group.name}
                          inviteCode={group.invite_code}
                          memberCount={unlockMemberCount}
                          members={members.map(m => ({ name: m.name, photo: m.photo }))}
                        />
                      )}

                      {/* Posted Today */}
                      {members.filter((m) => m.posted_today).length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-success uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span>✓</span> Posted Today
                          </h2>
                          <StaggeredList className="space-y-4">
                            {members
                              .filter((m) => m.posted_today && m.checkin)
                              .map((member) => (
                                <StaggeredItem key={member.checkin!.id}>
                                  <CheckInCard
                                    id={member.checkin!.id}
                                    userName={member.name}
                                    userPhoto={member.photo}
                                    photoUrl={member.checkin!.photo_url}
                                    caption={member.checkin!.caption}
                                    createdAt={member.checkin!.created_at}
                                    currentStreak={member.current_streak}
                                    reactionCount={member.checkin!.reaction_count}
                                    hasReacted={member.checkin!.has_reacted}
                                    onReactionChange={fetchGroupData}
                                  />
                                </StaggeredItem>
                              ))}
                          </StaggeredList>
                        </div>
                      )}

                      {/* Resting Today */}
                      {members.filter((m) => m.rested_today && !m.posted_today).length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Moon className="w-4 h-4" /> Resting Today
                          </h2>
                          <div className="space-y-2">
                            {members
                              .filter((m) => m.rested_today && !m.posted_today)
                              .map((member) => (
                                <div
                                  key={member.user_id}
                                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                                >
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={member.photo || undefined} />
                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                      {member.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      😴 Taking a rest day • 🔥 {member.current_streak}-day streak safe
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Hasn't Posted Yet */}
                      {members.filter((m) => !m.posted_today && !m.rested_today).length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-warning uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span>⏰</span> Hasn't Posted Yet
                          </h2>
                          <div className="space-y-2">
                            {members
                              .filter((m) => !m.posted_today && !m.rested_today)
                              .map((member) => (
                                <div
                                  key={member.user_id}
                                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                                >
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={member.photo || undefined} />
                                    <AvatarFallback className="bg-warning/20 text-warning">
                                      {member.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {member.current_streak > 0
                                        ? `🔥 ${member.current_streak}-day streak at risk`
                                        : 'Hasn\'t started yet'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {members.length === 0 && isUnlocked && (
                        <EmptyState
                          emoji="📸"
                          title="No check-ins yet"
                          description="Be the first to post your check-in!"
                          actionLabel="Post Now"
                          onAction={() => {
                            triggerHaptic('light');
                            navigate('/post', { state: { groupId: group?.id } });
                          }}
                        />
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="leaderboard">
                  <LeaderboardTab 
                    members={members} 
                    currentUserId={user?.id} 
                    groupId={group?.id || ''}
                    groupName={group?.name || ''}
                    onRefresh={fetchGroupData}
                  />
                </TabsContent>

                <TabsContent value="invite">
                  {group && (
                    <InviteFriendsSection
                      groupId={group.id}
                      groupName={group.name}
                      habitType={group.habit_type}
                      customHabit={group.custom_habit}
                      inviteCode={group.invite_code}
                      memberCount={members.length}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </main>
        </PageTransition>
      </PullToRefresh>

      {isUnlocked && <FAB />}
      <BottomNav />
    </div>
  );
};

export default GroupDetail;