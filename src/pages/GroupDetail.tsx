import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckInCard } from '@/components/CheckInCard';
import { EmptyState } from '@/components/EmptyState';
import { BottomNav } from '@/components/ui/BottomNav';
import { FAB } from '@/components/ui/FAB';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');

  useEffect(() => {
    if (id && user) {
      fetchGroupData();
    }
  }, [id, user]);

  const fetchGroupData = async () => {
    if (!id || !user) return;

    try {
      // First try to get group by ID
      let groupData;
      const { data: groupById } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupById) {
        groupData = groupById;
      } else {
        // Try by invite code
        const { data: groupByCode } = await supabase
          .from('groups')
          .select('*')
          .eq('invite_code', id.toUpperCase())
          .single();
        groupData = groupByCode;
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

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo_url')
        .in('user_id', memberIds);

      // Get today's checkins
      const { data: checkins } = await supabase
        .from('checkins')
        .select('*')
        .eq('group_id', groupData.id)
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false });

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
    } catch (error) {
      console.error('Error fetching group:', error);
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

  if (!group) return null;

  const habit = getHabitDisplay(group.habit_type, group.custom_habit);
  const postedCount = members.filter((m) => m.posted_today).length;
  const percentage = members.length > 0 ? Math.round((postedCount / members.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span>{habit.emoji}</span>
              <h1 className="font-bold text-foreground">{group.name}</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {postedCount}/{members.length} posted today • {percentage}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/group/${group.id}/chat`}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link
              to={`/group/${group.id}/settings`}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-6 bg-card">
            <TabsTrigger value="feed" className="flex-1">Feed</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            {/* Posted Today */}
            {members.filter((m) => m.posted_today).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-success uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span>✓</span> Posted Today
                </h2>
                <div className="space-y-4">
                  {members
                    .filter((m) => m.posted_today && m.checkin)
                    .map((member) => (
                      <CheckInCard
                        key={member.checkin!.id}
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
                    ))}
                </div>
              </div>
            )}

            {/* Hasn't Posted Yet */}
            {members.filter((m) => !m.posted_today).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-warning uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span>⏰</span> Hasn't Posted Yet
                </h2>
                <div className="space-y-2">
                  {members
                    .filter((m) => !m.posted_today)
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

            {members.length === 0 && (
              <EmptyState
                emoji="📸"
                title="No check-ins yet"
                description="Be the first to post your check-in!"
                actionLabel="Post Now"
                onAction={() => navigate('/post', { state: { groupId: group.id } })}
              />
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="space-y-2">
              {members
                .sort((a, b) => b.current_streak - a.current_streak)
                .map((member, index) => {
                  const rank = index + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                  const isCurrentUser = member.user_id === user?.id;

                  return (
                    <div
                      key={member.user_id}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl border transition-colors',
                        isCurrentUser
                          ? 'bg-primary/10 border-primary/20'
                          : 'bg-card border-border'
                      )}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-muted-foreground font-bold">{rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.photo || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {member.name[0]}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {member.name}
                          {isCurrentUser && ' (You)'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.posted_today ? '✓ Posted today' : 'Waiting...'}
                        </p>
                      </div>

                      {/* Streak */}
                      <div className="text-right">
                        <p className="font-bold text-warning flex items-center gap-1">
                          {member.current_streak > 0 && (
                            <span className="animate-pulse-fire">🔥</span>
                          )}
                          {member.current_streak} days
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <FAB />
      <BottomNav />
    </div>
  );
};

export default GroupDetail;
