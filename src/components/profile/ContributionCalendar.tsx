import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isAfter } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarStats } from './CalendarStats';
import { DayDetailDialog } from './DayDetailDialog';
import { ShareableCalendarCard } from './ShareableCalendarCard';
import { usePostingHistory, ViewRange, DayData } from '@/hooks/usePostingHistory';
import { useAuth } from '@/contexts/AuthContext';
import { habitTypeLabels, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VIEW_OPTIONS: { label: string; value: ViewRange }[] = [
  { label: '90d', value: 90 },
  { label: '180d', value: 180 },
  { label: '1y', value: 365 },
];

function getDotColors(day: DayData): string[] {
  if (day.postCount === 0) return [];
  if (day.postCount === 1) return ['bg-[hsl(var(--cal-level-1))]'];
  if (day.postCount === 2) return ['bg-[hsl(var(--cal-level-2))]', 'bg-[hsl(var(--cal-level-2))]'];
  return ['bg-[hsl(var(--cal-level-3))]', 'bg-[hsl(var(--cal-level-3))]', 'bg-[hsl(var(--cal-level-3))]'];
}

export const ContributionCalendar = () => {
  const [viewRange, setViewRange] = useState<ViewRange>(90);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { profile } = useAuth();

  const {
    calendarDays,
    stats,
    loading,
    habitTypes,
    selectedHabit,
    setSelectedHabit,
  } = usePostingHistory(viewRange);

  const dayMap = useMemo(() => {
    return new Map(calendarDays.map(d => [d.date, d]));
  }, [calendarDays]);

  // Build the month grid (6 rows x 7 cols, Mon-Sun)
  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const today = new Date();

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };

  const canGoNext = !isAfter(startOfMonth(addMonths(currentMonth, 1)), startOfMonth(today));

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
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
        <div className="flex items-center gap-2">
          <ShareableCalendarCard
            stats={stats}
            viewRange={viewRange}
            calendarDays={calendarDays}
            userName={profile?.name || 'User'}
          />
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

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!canGoNext}
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px">
        {/* Weekday headers */}
        {WEEKDAY_LABELS.map(label => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-muted-foreground pb-2"
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {calendarGrid.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayData = dayMap.get(dateStr);
          const inMonth = isSameMonth(date, currentMonth);
          const isToday = isSameDay(date, today);
          const isFuture = isAfter(date, today);
          const dots = dayData ? getDotColors(dayData) : [];

          return (
            <button
              key={dateStr}
              disabled={!dayData || isFuture || !inMonth}
              onClick={() => dayData && handleDayClick(dayData)}
              className={cn(
                'relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors min-h-[44px]',
                inMonth ? 'text-foreground' : 'text-muted-foreground/30',
                isFuture && inMonth && 'text-muted-foreground/40',
                isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                dayData && dayData.postCount > 0 && inMonth && 'bg-[hsl(var(--cal-level-1)/0.15)] hover:bg-[hsl(var(--cal-level-2)/0.25)]',
                dayData && !isFuture && inMonth && 'cursor-pointer',
                (!dayData || isFuture || !inMonth) && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium leading-none',
                  isToday && 'font-bold text-primary',
                  dayData?.isInCurrentStreak && inMonth && 'text-[hsl(var(--cal-streak-gold))]',
                )}
              >
                {format(date, 'd')}
              </span>
              {/* Activity dots */}
              {dots.length > 0 && inMonth && (
                <div className="flex gap-0.5 mt-1">
                  {dots.slice(0, 3).map((color, i) => (
                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full', color)} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cal-level-1))]" />
          <span>1 post</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cal-level-2))]" />
          <span>2 posts</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cal-level-3))]" />
          <span>3+ posts</span>
        </div>
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
