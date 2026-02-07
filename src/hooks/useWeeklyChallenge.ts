import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CHALLENGE_MAP, type ChallengeDefinition } from '@/lib/challenges';

export interface ChallengeScore {
  user_id: string;
  user_name: string;
  user_photo: string | null;
  total_points: number;
  qualified_posts: number;
}

export interface WeeklyChallengeData {
  id: string;
  challengeKey: string;
  challenge: ChallengeDefinition | null;
  weekStart: string;
  weekEnd: string;
  nextChallengeKey: string | null;
  nextChallenge: ChallengeDefinition | null;
  scores: ChallengeScore[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useWeeklyChallenge = (groupId: string | undefined): WeeklyChallengeData => {
  const [data, setData] = useState<{
    id: string;
    challengeKey: string;
    weekStart: string;
    weekEnd: string;
    nextChallengeKey: string | null;
  } | null>(null);
  const [scores, setScores] = useState<ChallengeScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    if (!groupId) return;
    setError(null);

    try {
      // Get the current week's Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStartStr = monday.toISOString().split('T')[0];

      const { data: challenge, error: challengeError } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('group_id', groupId)
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (challengeError) throw challengeError;

      if (!challenge) {
        setData(null);
        setScores([]);
        setLoading(false);
        return;
      }

      setData({
        id: challenge.id,
        challengeKey: challenge.challenge_key,
        weekStart: challenge.week_start,
        weekEnd: challenge.week_end,
        nextChallengeKey: challenge.next_challenge_key,
      });

      // Fetch scores with user profiles
      const { data: scoreData, error: scoreError } = await supabase
        .from('challenge_scores')
        .select('user_id, points, verified')
        .eq('challenge_id', challenge.id)
        .eq('verified', true);

      if (scoreError) throw scoreError;

      // Aggregate scores by user
      const userScores: Record<string, { total_points: number; qualified_posts: number }> = {};
      for (const s of scoreData || []) {
        if (!userScores[s.user_id]) {
          userScores[s.user_id] = { total_points: 0, qualified_posts: 0 };
        }
        userScores[s.user_id].total_points += Number(s.points);
        userScores[s.user_id].qualified_posts += 1;
      }

      // Get profiles for scored users
      const userIds = Object.keys(userScores);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_group_member_profiles', { p_group_id: groupId });

        const enrichedScores: ChallengeScore[] = userIds
          .map((userId) => {
            const profile = profiles?.find((p: any) => p.user_id === userId);
            return {
              user_id: userId,
              user_name: profile?.name || 'Unknown',
              user_photo: profile?.profile_photo_url || null,
              total_points: userScores[userId].total_points,
              qualified_posts: userScores[userId].qualified_posts,
            };
          })
          .sort((a, b) => b.total_points - a.total_points);

        setScores(enrichedScores);
      } else {
        setScores([]);
      }
    } catch (err: any) {
      console.error('Error fetching weekly challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const challenge = data ? CHALLENGE_MAP[data.challengeKey] || null : null;
  const nextChallenge = data?.nextChallengeKey ? CHALLENGE_MAP[data.nextChallengeKey] || null : null;

  return {
    id: data?.id || '',
    challengeKey: data?.challengeKey || '',
    challenge,
    weekStart: data?.weekStart || '',
    weekEnd: data?.weekEnd || '',
    nextChallengeKey: data?.nextChallengeKey || null,
    nextChallenge,
    scores,
    loading,
    error,
    refetch: fetchChallenge,
  };
};
