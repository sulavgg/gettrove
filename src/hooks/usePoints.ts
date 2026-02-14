import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { subDays } from 'date-fns';
import { categorizePoints, calculateMomentumScore } from '@/lib/points';

interface PointsSummary {
  posting: number;
  timeBonuses: number;
  engagement: number;
  streakBonuses: number;
  total: number;
  postingPct: number;
  timeBonusesPct: number;
  engagementPct: number;
  streakBonusesPct: number;
  momentumScore: number;
  totalAllTime: number;
}

export function usePoints(period: 'week' | 'month' | 'all' = 'week') {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      let startDate: Date;
      if (period === 'week') startDate = subDays(now, 7);
      else if (period === 'month') startDate = subDays(now, 30);
      else startDate = new Date(0);

      // Fetch period points
      const { data: periodTxns } = await (supabase as any)
        .from('point_transactions')
        .select('point_type, points')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString()) as { data: { point_type: string; points: number }[] | null };

      // Fetch last 30 days for momentum
      const thirtyDaysAgo = subDays(now, 30);
      const { data: last30Txns } = await (supabase as any)
        .from('point_transactions')
        .select('points')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString()) as { data: { points: number }[] | null };

      // Fetch all-time total
      const { data: allTimeTxns } = await (supabase as any)
        .from('point_transactions')
        .select('points')
        .eq('user_id', user.id) as { data: { points: number }[] | null };

      // Get current best streak
      const { data: streaks } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', user.id);

      const bestStreak = Math.max(...(streaks?.map(s => s.current_streak) || [0]));
      const points30d = (last30Txns || []).reduce((s: number, t: any) => s + t.points, 0);
      const totalAllTime = (allTimeTxns || []).reduce((s: number, t: any) => s + t.points, 0);

      const cats = categorizePoints(periodTxns || []);
      const momentumScore = calculateMomentumScore(points30d, bestStreak);

      setSummary({ ...cats, momentumScore, totalAllTime });
    } catch (err) {
      console.error('Error fetching points:', err);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return { summary, loading, refetch: fetchPoints };
}
