import { Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getHabitDisplay, HabitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  id: string;
  name: string;
  habitType: HabitType;
  customHabit?: string | null;
  currentStreak: number;
  postedToday: boolean;
  memberCount: number;
  postedTodayCount: number;
  streakBroken?: boolean;
}

export const GroupCard = ({
  id,
  name,
  habitType,
  customHabit,
  currentStreak,
  postedToday,
  memberCount,
  postedTodayCount,
  streakBroken,
}: GroupCardProps) => {
  const habit = getHabitDisplay(habitType, customHabit);

  return (
    <Link to={`/group/${id}`}>
      <Card className="p-4 bg-card hover:bg-card/80 transition-all duration-200 border-border shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{habit.emoji}</span>
              <h3 className="font-bold text-foreground truncate">{name}</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{habit.label}</p>

            <div className="flex items-center gap-4">
              {/* Streak */}
              <div className="flex items-center gap-1.5">
                {streakBroken ? (
                  <span className="text-lg animate-shake">💀</span>
                ) : currentStreak > 0 ? (
                  <span className="text-lg animate-pulse-fire">🔥</span>
                ) : (
                  <span className="text-lg opacity-50">🔥</span>
                )}
                <span className={cn(
                  'font-bold',
                  streakBroken ? 'text-destructive' : currentStreak > 0 ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {currentStreak} days
                </span>
              </div>

              {/* Posted today status */}
              <div className="text-sm text-muted-foreground">
                {postedTodayCount}/{memberCount} posted
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Status indicator */}
            {postedToday ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-success uppercase">Done</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-medium text-destructive uppercase">Post now</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </Card>
    </Link>
  );
};
