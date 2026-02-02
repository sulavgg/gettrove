import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Check, Loader2, Users, Trash2 } from 'lucide-react';
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
  invite_code: string;
}

interface Member {
  user_id: string;
  name: string;
  photo: string | null;
  role: 'admin' | 'member';
}

const GroupSettings = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    try {
      // Get group
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

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

      // Get members
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', id);

      const memberIds = membersData?.map((m) => m.user_id) || [];
      
      // Use profiles_public view to avoid exposing email addresses
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, name, profile_photo_url')
        .in('user_id', memberIds);

      const enrichedMembers: Member[] = (profiles || []).map((p) => {
        const membership = membersData?.find((m) => m.user_id === p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          photo: p.profile_photo_url,
          role: membership?.role as 'admin' | 'member',
        };
      });

      // Sort admins first
      enrichedMembers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.name.localeCompare(b.name);
      });

      setMembers(enrichedMembers);
      setIsAdmin(membersData?.some((m) => m.user_id === user.id && m.role === 'admin') || false);
    } catch (error) {
      console.error('Error fetching group settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = group ? `${window.location.origin}/join/${group.invite_code}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!group) return;
    
    const habit = getHabitDisplay(group.habit_type, group.custom_habit);
    const shareData = {
      title: 'Join my HABITZ group',
      text: `Join my HABITZ group: ${group.name}. Let's compete on ${habit.label}!`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !id) return;

    // Check if user is the only admin
    const admins = members.filter((m) => m.role === 'admin');
    if (isAdmin && admins.length === 1) {
      toast.error('You must transfer admin role before leaving');
      return;
    }

    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);

      toast.success('Left group');
      navigate('/');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
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

  return (
    <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
      {/* Header */}
      <button
        onClick={() => navigate(`/group/${id}`)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="max-w-md mx-auto">
        {/* Group Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-4xl">{habit.emoji}</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">{group.name}</h1>
          <p className="text-muted-foreground">{habit.label}</p>
        </div>

        {/* Invite Section */}
        <Card className="p-4 bg-card border-border mb-6">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Invite People
          </h2>
          
          <div className="p-3 bg-input rounded-lg mb-4 break-all text-sm text-muted-foreground">
            {inviteLink}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              onClick={handleShare}
              className="gap-2 gradient-primary"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3">
            {members.length}/20 members
          </p>
        </Card>

        {/* Members Section */}
        <Card className="p-4 bg-card border-border mb-6">
          <h2 className="font-bold text-foreground mb-3">
            Members ({members.length})
          </h2>
          
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.photo || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {member.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {member.name}
                    {member.user_id === user?.id && ' (You)'}
                  </p>
                </div>
                {member.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Leave Group */}
        <Button
          variant="outline"
          onClick={handleLeaveGroup}
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
          Leave Group
        </Button>
      </div>
    </div>
  );
};

export default GroupSettings;
