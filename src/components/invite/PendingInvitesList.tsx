import { Clock, CheckCircle2, Bell, X, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupInvite } from '@/hooks/useGroupInvites';
import { formatDistanceToNow } from 'date-fns';

interface PendingInvitesListProps {
  pendingInvites: GroupInvite[];
  joinedInvites: GroupInvite[];
  onReminder: (inviteId: string, name: string) => Promise<void>;
  onRemove: (inviteId: string) => Promise<void>;
}

const methodEmoji: Record<string, string> = {
  text: '💬',
  whatsapp: '📱',
  instagram: '📸',
  share: '📤',
  link: '🔗',
};

export const PendingInvitesList = ({
  pendingInvites,
  joinedInvites,
  onReminder,
  onRemove,
}: PendingInvitesListProps) => {
  const canRemind = (invite: GroupInvite) => {
    if (!invite.reminded_at) return true;
    // Allow re-reminder after 24 hours
    const lastReminder = new Date(invite.reminded_at);
    const now = new Date();
    return now.getTime() - lastReminder.getTime() > 24 * 60 * 60 * 1000;
  };

  return (
    <Card className="p-4 bg-card border-border space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        Invite Tracker
        <span className="text-xs font-normal text-muted-foreground ml-auto">
          {pendingInvites.length} pending
        </span>
      </h3>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20"
            >
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">{methodEmoji[invite.invite_method] || '🔗'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {invite.invited_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invite.status === 'reminded' ? 'Reminded' : 'Invited'}{' '}
                  {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {canRemind(invite) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                    onClick={() => onReminder(invite.id, invite.invited_name)}
                    title="Send reminder"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(invite.id)}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Joined invites */}
      {joinedInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Joined
          </p>
          {joinedInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20"
            >
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {invite.invited_name}
                </p>
                <p className="text-xs text-success">
                  Joined! 🎉
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Tap the bell to send a reminder
        </p>
      )}
    </Card>
  );
};
