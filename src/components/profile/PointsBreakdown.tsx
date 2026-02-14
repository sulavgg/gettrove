import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePoints } from '@/hooks/usePoints';
import { cn } from '@/lib/utils';

export const PointsBreakdown = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const { summary, loading } = usePoints(period);

  const periodLabels = { week: 'This Week', month: 'This Month', all: 'All Time' };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <Card className="p-4 bg-card border-border text-center">
        <p className="text-muted-foreground text-sm">No points earned yet. Start posting to earn points!</p>
      </Card>
    );
  }

  const categories = [
    { label: '📝 Posting', value: summary.posting, pct: summary.postingPct, color: 'bg-primary' },
    { label: '⏰ Time Bonuses', value: summary.timeBonuses, pct: summary.timeBonusesPct, color: 'bg-warning' },
    { label: '💬 Engagement', value: summary.engagement, pct: summary.engagementPct, color: 'bg-success' },
    { label: '🔥 Streak Bonuses', value: summary.streakBonuses, pct: summary.streakBonusesPct, color: 'bg-destructive' },
  ].filter(c => c.value > 0);

  return (
    <Card className="p-4 bg-card border-border">
      {/* Period selector */}
      <div className="flex gap-1 mb-4">
        {(['week', 'month', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Momentum Score */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Momentum Score</p>
          <p className="text-2xl font-black text-primary">{summary.momentumScore.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">All Time</p>
          <p className="text-lg font-bold text-foreground">{summary.totalAllTime.toLocaleString()} pts</p>
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-3">
        {categories.map(c => (
          <div key={c.label} className={cn('h-full', c.color)} style={{ width: `${c.pct}%` }} />
        ))}
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', c.color)} />
              <span className="text-foreground">{c.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{c.value.toLocaleString()} pts</span>
              <span className="text-muted-foreground text-xs">({c.pct}%)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="font-semibold text-foreground">Total ({periodLabels[period]})</span>
        <span className="text-lg font-black text-primary">{summary.total.toLocaleString()} pts</span>
      </div>
    </Card>
  );
};
