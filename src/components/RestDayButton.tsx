import { useState } from 'react';
import { Moon, Loader2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RestDayButtonProps {
  groupName: string;
  restDaysRemaining: number;
  hasRestedToday: boolean;
  alreadyPosted: boolean;
  onTakeRestDay: () => Promise<{ success: boolean; error?: string }>;
  variant?: 'default' | 'compact';
}

export const RestDayButton = ({
  groupName,
  restDaysRemaining,
  hasRestedToday,
  alreadyPosted,
  onTakeRestDay,
  variant = 'default',
}: RestDayButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const result = await onTakeRestDay();
    setLoading(false);
    setOpen(false);

    if (result.success) {
      toast.success('Rest day taken! Your streak is safe 😴', {
        description: `${restDaysRemaining - 1} rest day${restDaysRemaining - 1 !== 1 ? 's' : ''} remaining this week`,
      });
    } else {
      toast.error(result.error || 'Failed to take rest day');
    }
  };

  // Already rested today
  if (hasRestedToday) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-muted-foreground',
        variant === 'compact' ? 'text-xs' : 'text-sm'
      )}>
        <Moon className="w-4 h-4" />
        <span>Resting today 😴</span>
      </div>
    );
  }

  // Already posted today
  if (alreadyPosted) {
    return null;
  }

  // No rest days left
  if (restDaysRemaining <= 0) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-muted-foreground',
        variant === 'compact' ? 'text-xs' : 'text-sm'
      )}>
        <Moon className="w-4 h-4 opacity-50" />
        <span>No rest days left this week</span>
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={variant === 'compact' ? 'sm' : 'default'}
          className={cn(
            'gap-2',
            variant === 'default' && 'w-full h-12'
          )}
        >
          <Moon className="w-4 h-4" />
          <span>Take Rest Day</span>
          <span className="text-muted-foreground">
            ({restDaysRemaining} left)
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">😴</span>
            Take a Rest Day?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You'll skip posting to <strong>{groupName}</strong> today, but your streak will stay active!
            </p>
            <p className="text-warning font-medium">
              You have {restDaysRemaining} rest day{restDaysRemaining !== 1 ? 's' : ''} remaining this week.
            </p>
            <p className="text-xs text-muted-foreground">
              Rest days reset every Monday. Use them wisely!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            Confirm Rest Day
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
