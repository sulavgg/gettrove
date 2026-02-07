import { useState } from 'react';
import { UserPlus, Copy, Check, Share2, MessageCircle, Send, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getHabitDisplay, HabitType } from '@/lib/supabase';
import { useGroupInvites } from '@/hooks/useGroupInvites';
import { TrackInviteDialog } from './TrackInviteDialog';
import { PendingInvitesList } from './PendingInvitesList';

interface InviteFriendsSectionProps {
  groupId: string;
  groupName: string;
  habitType: HabitType;
  customHabit: string | null;
  inviteCode: string;
  memberCount: number;
}

export const InviteFriendsSection = ({
  groupId,
  groupName,
  habitType,
  customHabit,
  inviteCode,
  memberCount,
}: InviteFriendsSectionProps) => {
  const [copied, setCopied] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [pendingShareMethod, setPendingShareMethod] = useState<string>('link');
  const { pendingInvites, joinedInvites, trackInvite, sendReminder, removeInvite } = useGroupInvites(groupId);

  const inviteLink = `${window.location.origin}/join/${inviteCode}`;
  const habit = getHabitDisplay(habitType, customHabit);
  const shareMessage = `Join my ${habit.label} group "${groupName}" on LOCKD! Let's hold each other accountable 💪\n\n${inviteLink}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    const shareData = {
      title: `Join ${groupName} on LOCKD`,
      text: `Join my ${habit.label} group "${groupName}" on LOCKD! Let's hold each other accountable 💪`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setPendingShareMethod('share');
        setTrackDialogOpen(true);
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleShareVia = (method: string) => {
    let url = '';
    const encodedMessage = encodeURIComponent(shareMessage);

    switch (method) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedMessage}`;
        break;
      case 'text':
        url = `sms:?body=${encodedMessage}`;
        break;
      case 'instagram':
        // Instagram doesn't have a direct share URL, copy to clipboard instead
        navigator.clipboard.writeText(shareMessage);
        toast.success('Message copied! Paste it in Instagram DM');
        setPendingShareMethod('instagram');
        setTrackDialogOpen(true);
        return;
      default:
        handleCopy();
        return;
    }

    window.open(url, '_blank');
    setPendingShareMethod(method);
    setTrackDialogOpen(true);
  };

  const handleTrackInvite = async (name: string) => {
    await trackInvite(name, pendingShareMethod);
    toast.success(`Invite to ${name} tracked!`);
  };

  const handleReminder = async (inviteId: string, name: string) => {
    // Re-share the invite link for the reminder
    const reminderMessage = `Hey ${name}! You haven't joined our group "${groupName}" on LOCKD yet. Join here: ${inviteLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reminder: Join ${groupName}`,
          text: reminderMessage,
          url: inviteLink,
        });
        await sendReminder(inviteId);
        toast.success(`Reminder sent to ${name}!`);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(reminderMessage);
      await sendReminder(inviteId);
      toast.success('Reminder message copied!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Prominent Invite Card */}
      <Card className="p-5 border-primary/30 bg-primary/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Invite Friends</h3>
            <p className="text-sm text-muted-foreground">
              {memberCount} member{memberCount !== 1 ? 's' : ''} • Share to grow your group
            </p>
          </div>
        </div>

        {/* Pre-written message preview */}
        <div className="p-3 bg-card rounded-lg border border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Join my {habit.label} group "{groupName}" on LOCKD! Let's hold each other accountable 💪
          </p>
          <p className="text-xs text-primary mt-1 truncate">{inviteLink}</p>
        </div>

        {/* Quick share buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleShareVia('text')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
              <MessageCircle className="w-4.5 h-4.5 text-green-500" />
            </div>
            <span className="text-xs text-muted-foreground">Text</span>
          </button>

          <button
            onClick={() => handleShareVia('whatsapp')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Send className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <span className="text-xs text-muted-foreground">WhatsApp</span>
          </button>

          <button
            onClick={() => handleShareVia('instagram')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">Insta</span>
          </button>

          <button
            onClick={handleShareNative}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Share2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </button>
        </div>

        {/* Copy link fallback */}
        <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </Button>
      </Card>

      {/* Pending Invites Tracker */}
      {(pendingInvites.length > 0 || joinedInvites.length > 0) && (
        <PendingInvitesList
          pendingInvites={pendingInvites}
          joinedInvites={joinedInvites}
          onReminder={handleReminder}
          onRemove={removeInvite}
        />
      )}

      {/* Track Invite Dialog */}
      <TrackInviteDialog
        open={trackDialogOpen}
        onOpenChange={setTrackDialogOpen}
        onTrack={handleTrackInvite}
        method={pendingShareMethod}
      />
    </div>
  );
};
