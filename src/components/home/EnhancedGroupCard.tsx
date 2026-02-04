import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { WeekProgress } from './WeekProgress';
import { getHabitDisplay, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DayStatus {
  day: string;
  posted: boolean;
  isToday: boolean;
  rested?: boolean;
}

interface EnhancedGroupCardProps {
  id: string;
  name: string;
  habitType: HabitType;
  customHabit?: string | null;
  currentStreak: number;
  postedToday: boolean;
  restedToday?: boolean;
  memberCount: number;
  postedTodayCount: number;
  streakBroken?: boolean;
  lastCheckinTime?: string | null;
  weekProgress: DayStatus[];
  hoursLeft?: number;
}

export const EnhancedGroupCard = ({
  id,
  name,
  habitType,
  customHabit,
  currentStreak,
  postedToday,
  restedToday,
  memberCount,
  postedTodayCount,
  streakBroken,
  lastCheckinTime,
  weekProgress,
  hoursLeft,
}: EnhancedGroupCardProps) => {
  const habit = getHabitDisplay(habitType, customHabit);

  // Determine card background based on status
  const getCardBackground = () => {
    if (streakBroken) return 'bg-muted/50 border-muted';
    if (postedToday) return 'bg-success/5 border-success/30';
    if (restedToday) return 'bg-muted/30 border-muted';
    return 'bg-destructive/5 border-destructive/30';
  };

  // Format last check-in time
  const getLastCheckinText = () => {
    if (postedToday && lastCheckinTime) {
      return `Posted ${formatDistanceToNow(new Date(lastCheckinTime), { addSuffix: true })}`;
    }
    if (restedToday) {
      return '😴 Taking a rest day';
    }
    if (hoursLeft !== undefined && hoursLeft > 0) {
      return `⏰ ${hoursLeft}h left to post`;
    }
    return "⚠️ Haven't posted today";
  };

  return (
    <Link to={`/group/${id}`}>
      <Card
        className={cn(
          'p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated',
          'border',
          getCardBackground()
        )}
      >
        {/* Top Row: Name, Habit, Streak */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{habit.emoji}</span>
              <h3 className="font-bold text-lg text-foreground truncate">{name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{habit.label}</p>
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-2 ml-3">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl',
                streakBroken
                  ? 'bg-muted'
                  : currentStreak > 0
                  ? 'bg-warning/10'
                  : 'bg-muted/50'
              )}
            >
              {streakBroken ? (
                <span className="text-xl">💀</span>
              ) : currentStreak > 0 ? (
                <span className="text-xl animate-pulse-fire">🔥</span>
              ) : (
                <span className="text-xl opacity-40">🔥</span>
              )}
              <span
                className={cn(
                  'text-xl font-black',
                  streakBroken
                    ? 'text-muted-foreground'
                    : currentStreak > 0
                    ? 'text-warning'
                    : 'text-muted-foreground'
                )}
              >
                {currentStreak}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Middle Row: Last Check-in & Group Activity */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div
            className={cn(
              'flex items-center gap-1.5',
              postedToday
                ? 'text-success'
                : restedToday
                ? 'text-muted-foreground'
                : 'text-destructive'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{getLastCheckinText()}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
            <Users className="w-3.5 h-3.5" />
            <span>
              {postedTodayCount}/{memberCount} posted
            </span>
          </div>
        </div>

        {/* Bottom Row: Week Progress */}
        <div className="flex items-center justify-between">
          <WeekProgress days={weekProgress} />
          
          {/* Status Pill */}
          <div
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
              postedToday
                ? 'bg-success/20 text-success'
                : restedToday
                ? 'bg-muted text-muted-foreground'
                : streakBroken
                ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/20 text-destructive animate-pulse'
            )}
          >
            {postedToday ? '✓ Done' : restedToday ? '😴 Rest' : streakBroken ? 'Broken' : 'Post Now'}
          </div>
        </div>
      </Card>
    </Link>
  );
};
