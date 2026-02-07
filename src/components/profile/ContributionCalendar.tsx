import { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, eachWeekOfInterval, addDays, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarStats } from './CalendarStats';
import { DayDetailDialog } from './DayDetailDialog';
import { usePostingHistory, ViewRange, DayData } from '@/hooks/usePostingHistory';
import { habitTypeLabels, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const VIEW_OPTIONS: { label: string; value: ViewRange }[] = [
  { label: '90d', value: 90 },
  { label: '180d', value: 180 },
  { label: '1y', value: 365 },
];

function getCellColorClass(day: DayData): string {
  if (day.postCount === 0) return 'bg-[hsl(var(--cal-empty))]';
  if (day.postCount === 1) return 'bg-[hsl(var(--cal-level-1))]';
  if (day.postCount === 2) return 'bg-[hsl(var(--cal-level-2))]';
  return 'bg-[hsl(var(--cal-level-3))]';
}

function getTooltipText(day: DayData): string {
  const dateStr = format(parseISO(day.date), 'MMM d');
  if (day.postCount === 0) return `${dateStr}: No posts`;
  const timesStr = day.postTimes.length > 0 ? `, ${day.postTimes.join('/')}` : '';
  const pointsStr = day.totalPoints > 0 ? `, ${day.totalPoints} points` : '';
  return `${dateStr}: ${day.postCount} post${day.postCount > 1 ? 's' : ''}${pointsStr}${timesStr}`;
}

export const ContributionCalendar = () => {
  const [viewRange, setViewRange] = useState<ViewRange>(90);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    calendarDays,
    stats,
    loading,
    habitTypes,
    selectedHabit,
    setSelectedHabit,
  } = usePostingHistory(viewRange);

  // Build calendar grid: columns = weeks, rows = days (Mon-Sun)
  const { weeks, monthLabels } = useMemo(() => {
    if (calendarDays.length === 0) return { weeks: [], monthLabels: [] };

    const today = new Date();
    const startDate = subDays(today, viewRange);

    // Align to start of week (Monday)
    const firstMonday = startOfWeek(startDate, { weekStartsOn: 1 });
    const weekStarts = eachWeekOfInterval(
      { start: firstMonday, end: today },
      { weekStartsOn: 1 }
    );

    const dayMap = new Map(calendarDays.map(d => [d.date, d]));

    const weeks = weekStarts.map(weekStart => {
      const days: (DayData | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayData = dayMap.get(dateStr);
        // Only include days within range
        if (day < startDate || day > today) {
          days.push(null);
        } else {
          days.push(dayData || null);
        }
      }
      return { weekStart, days };
    });

    // Month labels: find first week of each month
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      // Use the first valid day in the week for month detection
      const validDay = week.days.find(d => d !== null);
      if (validDay) {
        const month = parseISO(validDay.date).getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: format(parseISO(validDay.date), 'MMM'),
            weekIndex: idx,
          });
          lastMonth = month;
        }
      }
    });

    return { weeks, monthLabels };
  }, [calendarDays, viewRange]);

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Posting History
        </h3>
        <div className="flex gap-1">
          {VIEW_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={viewRange === opt.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setViewRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <CalendarStats stats={stats} viewRange={viewRange} />

      {/* Habit filter */}
      {habitTypes.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={selectedHabit === null ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs shrink-0"
            onClick={() => setSelectedHabit(null)}
          >
            All
          </Button>
          {habitTypes.map(ht => {
            const info = habitTypeLabels[ht as HabitType];
            return (
              <Button
                key={ht}
                variant={selectedHabit === ht ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs shrink-0"
                onClick={() => setSelectedHabit(ht)}
              >
                {info?.emoji} {info?.label || ht}
              </Button>
            );
          })}
        </div>
      )}

      {/* Calendar Grid */}
      <TooltipProvider delayDuration={200}>
        <div className="overflow-x-auto scrollbar-none">
          <div className="inline-flex flex-col gap-0.5 min-w-full">
            {/* Month labels row */}
            <div className="flex gap-0.5 ml-6 mb-1">
              {weeks.map((_, weekIdx) => {
                const monthLabel = monthLabels.find(m => m.weekIndex === weekIdx);
                return (
                  <div key={weekIdx} className="w-3 shrink-0 text-center">
                    {monthLabel && (
                      <span className="text-[9px] text-muted-foreground">
                        {monthLabel.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid rows (Mon–Sun) */}
            {DAY_LABELS.map((dayLabel, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-0.5">
                <span className="w-5 text-[9px] text-muted-foreground text-right shrink-0 pr-0.5">
                  {rowIdx % 2 === 0 ? dayLabel : ''}
                </span>
                {weeks.map((week, weekIdx) => {
                  const day = week.days[rowIdx];
                  if (!day) {
                    return (
                      <div
                        key={weekIdx}
                        className="w-3 h-3 rounded-[2px] shrink-0"
                      />
                    );
                  }
                  return (
                    <Tooltip key={weekIdx}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDayClick(day)}
                          className={cn(
                            'w-3 h-3 rounded-[2px] shrink-0 transition-all duration-150',
                            'hover:ring-2 hover:ring-primary/50 hover:scale-125',
                            getCellColorClass(day),
                            day.isToday && 'ring-2 ring-[hsl(var(--cal-streak-gold))]',
                            day.isInLongestStreak && !day.isInCurrentStreak && 'ring-1 ring-[hsl(var(--cal-streak-gold))]',
                          )}
                          aria-label={getTooltipText(day)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                        {getTooltipText(day)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-muted-foreground">Less</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px] bg-[hsl(var(--cal-empty))]" />
          <div className="w-3 h-3 rounded-[2px] bg-[hsl(var(--cal-level-1))]" />
          <div className="w-3 h-3 rounded-[2px] bg-[hsl(var(--cal-level-2))]" />
          <div className="w-3 h-3 rounded-[2px] bg-[hsl(var(--cal-level-3))]" />
        </div>
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>

      {/* Day Detail Dialog */}
      <DayDetailDialog
        day={selectedDay}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
};
