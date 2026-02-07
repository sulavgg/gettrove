import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { DayData } from '@/hooks/usePostingHistory';

interface DayDetailDialogProps {
  day: DayData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DayDetailDialog = ({ day, open, onOpenChange }: DayDetailDialogProps) => {
  if (!day) return null;

  const dateFormatted = format(parseISO(day.date), 'EEEE, MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">{dateFormatted}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {day.postCount === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No posts this day
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-foreground">{day.postCount}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-primary">{day.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-foreground">{day.groups.length}</p>
                  <p className="text-xs text-muted-foreground">Groups</p>
                </div>
              </div>

              {day.postTimes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Post Times</p>
                  <div className="flex flex-wrap gap-1.5">
                    {day.postTimes.map((time, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {day.groups.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {day.groups.map((name, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
