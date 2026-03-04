import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getHabitDisplay, HabitType } from '@/lib/supabase';
import { toast } from 'sonner';

interface GroupInfo {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  member_count: number;
  members: { name: string; photo: string | null }[];
}

const JoinGroup = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      fetchGroupInfo();
    }
  }, [code, user]);

  const fetchGroupInfo = async () => {
    try {
      // Use RPC function for secure invite code lookup (doesn't expose all groups)
      const { data: groupData, error: groupError } = await supabase
        .rpc('lookup_group_by_invite_code', { code: code?.toUpperCase() || '' });

      if (groupError || !groupData || groupData.length === 0) {
        setError('This invite link is invalid or invites have been disabled for this group');
        setLoading(false);
        return;
      }

      const groupInfo = groupData[0];

      // Check if already a member
      if (user) {
        const { data: membership } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupInfo.id)
          .eq('user_id', user.id)
          .single();

        if (membership) {
          setAlreadyMember(true);
        }
      }

      // Get member count and member previews using secure RPC function
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupInfo.id);

      const memberIds = members?.map((m) => m.user_id) || [];
      
      // Use preview RPC that doesn't require membership (limited data, no email)
      const { data: previews } = await supabase
        .rpc('get_group_member_preview', { p_group_id: groupInfo.id } as any);

      setGroup({
        id: groupInfo.id,
        name: groupInfo.name,
        habit_type: groupInfo.habit_type as HabitType,
        custom_habit: groupInfo.custom_habit,
        member_count: memberIds.length,
        members: (previews || []).map((p: any) => ({
          name: p.name,
          photo: p.profile_photo_url,
        })),
      });
    } catch (error) {
      console.error('Error fetching group:', error);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !group) return;

    // Check member limit
    if (group.member_count >= 20) {
      toast.error('This group is full (20/20 members)');
      return;
    }

    setJoining(true);
    try {
      // Add user to group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: group.id,
          role: 'member',
        });

      if (memberError) throw memberError;

      // Initialize streak
      await supabase.from('streaks').insert({
        user_id: user.id,
        group_id: group.id,
      });

      // Add system message to chat - user can still view own profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      await supabase.from('group_messages').insert({
        group_id: group.id,
        user_id: user.id,
        message_text: `${profile?.name || 'Someone'} just joined! 👋`,
        is_system_message: true,
      });

      toast.success('Welcome to the group! 🎉');
      navigate(`/group/${group.id}`);
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <span className="text-6xl mb-4">❌</span>
        <h1 className="text-xl font-bold text-foreground mb-2">Invalid Link</h1>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  if (!group) return null;

  const habit = getHabitDisplay(group.habit_type, group.custom_habit);

  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <CheckCircle className="w-16 h-16 text-success mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Already a Member!</h1>
        <p className="text-muted-foreground text-center mb-6">
          You're already in {group.name}
        </p>
        <Button 
          onClick={() => navigate(`/group/${group.id}`)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Go to Group
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6 bg-card border-border shadow-card">
        {/* Group Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-4xl">{habit.emoji}</span>
          </div>
        </div>

        {/* Group Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-foreground mb-1">
            {group.name}
          </h1>
          <p className="text-muted-foreground">{habit.label}</p>
        </div>

        {/* Members preview */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex -space-x-2">
            {group.members.slice(0, 4).map((member, i) => (
              <Avatar key={i} className="w-8 h-8 border-2 border-card">
                <AvatarImage src={member.photo || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {member.name[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            {group.member_count} member{group.member_count !== 1 && 's'}
          </span>
        </div>

        {/* Join button */}
        <Button
          onClick={handleJoin}
          disabled={joining}
          className="w-full h-12 bg-primary text-primary-foreground font-bold uppercase tracking-wide shadow-glow hover:bg-primary/90"
        >
          {joining ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Join Group'
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="w-full mt-2"
        >
          Cancel
        </Button>
      </Card>
    </div>
  );
};

export default JoinGroup;
