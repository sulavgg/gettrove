import { cn } from '@/lib/utils';

interface DayStatus {
  day: string;
  posted: boolean;
  isToday: boolean;
  rested?: boolean;
}

interface WeekProgressProps {
  days: DayStatus[];
  className?: string;
}

export const WeekProgress = ({ days, className }: WeekProgressProps) => {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {days.map((day, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all',
              day.posted
                ? 'bg-success text-success-foreground'
                : day.rested
                ? 'bg-muted text-muted-foreground'
                : day.isToday
                ? 'bg-destructive/20 border-2 border-destructive text-destructive animate-pulse'
                : 'bg-muted/50 text-muted-foreground/50'
            )}
          >
            {day.posted ? '✓' : day.rested ? '–' : day.day[0]}
          </div>
        </div>
      ))}
    </div>
  );
};
