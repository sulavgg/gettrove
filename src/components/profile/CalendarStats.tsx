import { Flame, Trophy, CalendarDays, TrendingUp } from 'lucide-react';
import type { PostingHistoryStats, ViewRange } from '@/hooks/usePostingHistory';

interface CalendarStatsProps {
  stats: PostingHistoryStats;
  viewRange: ViewRange;
}

export const CalendarStats = ({ stats, viewRange }: CalendarStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
        <CalendarDays className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Active</p>
          <p className="text-sm font-bold text-foreground truncate">
            {stats.activeDays} days <span className="text-muted-foreground font-normal text-xs">/ {viewRange}d</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
        <Flame className="w-4 h-4 text-warning shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Current</p>
          <p className="text-sm font-bold text-foreground truncate">
            🔥 {stats.currentStreak} days
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
        <Trophy className="w-4 h-4 text-[hsl(var(--cal-streak-gold))] shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Longest</p>
          <p className="text-sm font-bold text-foreground truncate">
            🏆 {stats.longestStreak} days
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
        <TrendingUp className="w-4 h-4 text-success shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Best day</p>
          <p className="text-sm font-bold text-foreground truncate">
            {stats.mostActiveDay.replace('s', '')} <span className="text-muted-foreground font-normal text-xs">{stats.mostActiveDayPercent}%</span>
          </p>
        </div>
      </div>
    </div>
  );
};
