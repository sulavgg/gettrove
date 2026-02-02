import { useState } from 'react';
import { Moon, X, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useRestDays } from '@/hooks/useRestDays';
import { toast } from 'sonner';

interface Member {
  user_id: string;
  name: string;
  photo: string | null;
  posted_today: boolean;
  rested_today: boolean;
  current_streak: number;
}

interface LeaderboardTabProps {
  members: Member[];
  currentUserId?: string;
  groupId: string;
  groupName: string;
  onRefresh: () => void;
}

export const LeaderboardTab = ({
  members,
  currentUserId,
  groupId,
  groupName,
  onRefresh,
}: LeaderboardTabProps) => {
  const { hasRestedToday, restDaysRemaining, cancelRestDay } = useRestDays(groupId);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleCancelRestDay = async () => {
    setCanceling(true);
    const result = await cancelRestDay();
    setCanceling(false);
    setShowCancelDialog(false);

    if (result.success) {
      toast.success('Rest day canceled! You can now post today.', {
        description: `${restDaysRemaining + 1} rest day${restDaysRemaining + 1 !== 1 ? 's' : ''} remaining this week`,
      });
      onRefresh();
    } else {
      toast.error(result.error || 'Failed to cancel rest day');
    }
  };

  const sortedMembers = [...members].sort((a, b) => b.current_streak - a.current_streak);

  return (
    <div className="space-y-4">
      {/* Current user rest day status */}
      {hasRestedToday && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Moon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">You're resting today</p>
                <p className="text-sm text-muted-foreground">
                  Your streak is safe! {restDaysRemaining} rest day{restDaysRemaining !== 1 ? 's' : ''} left this week.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="space-y-2">
        {sortedMembers.map((member, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
          const isCurrentUser = member.user_id === currentUserId;

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
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {member.posted_today ? (
                    '✓ Posted today'
                  ) : member.rested_today ? (
                    <>
                      <Moon className="w-3 h-3" />
                      Resting today
                    </>
                  ) : (
                    'Waiting...'
                  )}
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

      {/* Cancel Rest Day Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Rest Day?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your rest day for <strong>{groupName}</strong>. You'll need to post today to maintain your streak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Keep Resting</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRestDay}
              disabled={canceling}
              className="gap-2"
            >
              {canceling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Cancel Rest Day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
