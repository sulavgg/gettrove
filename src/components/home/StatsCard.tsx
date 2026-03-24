import { Link } from 'react-router-dom';
import { Flame, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  activeStreaks: number;
  postedToday: number;
  totalGroups: number;
  longestStreak: number;
  className?: string;
}

export const StatsCard = ({
  activeStreaks,
  postedToday,
  totalGroups,
  longestStreak,
  className,
}: StatsCardProps) => {
  return (
    <Link to="/profile">
      <Card
        className={cn(
          'relative overflow-hidden p-5 border-0',
          'bg-gradient-to-br from-primary/20 via-primary/10 to-accent/5',
          'shadow-glow hover:shadow-elevated transition-all duration-300',
          className
        )}
      >
        {/* Ambient glow orbs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-accent/10 blur-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Performance
          </h2>
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 relative z-10">
          {/* Active Streaks */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xl animate-pulse-fire">🔥</span>
              <span className="text-2xl font-black text-foreground">{activeStreaks}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Active<br />Streaks
            </p>
          </div>

          {/* Posted Today */}
          <div className="text-center border-x border-border/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" strokeWidth={1.5} />
              <span className="text-2xl font-black text-foreground tabular-nums">
                {postedToday}<span className="text-sm text-muted-foreground">/{totalGroups}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Posted<br />Today
            </p>
          </div>

          {/* Longest Streak */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-warning flex-shrink-0" strokeWidth={1.5} />
              <span className="text-2xl font-black text-foreground tabular-nums">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Longest<br />Streak
            </p>
          </div>
        </div>

        {/* Tap hint */}
        <p className="text-[10px] text-center text-muted-foreground mt-4 relative z-10">
          Tap for detailed insights →
        </p>
      </Card>
    </Link>
  );
};
