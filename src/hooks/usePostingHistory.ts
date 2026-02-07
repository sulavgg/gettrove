import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, eachDayOfInterval, getDay } from 'date-fns';

export type ViewRange = 90 | 180 | 365;

export interface DayData {
  date: string; // YYYY-MM-DD
  postCount: number;
  totalPoints: number;
  postTimes: string[]; // formatted times like "6am"
  groups: string[]; // group names
  habitTypes: string[];
  isToday: boolean;
  isInCurrentStreak: boolean;
  isInLongestStreak: boolean;
}

export interface PostingHistoryStats {
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  mostActiveDay: string; // day name
  mostActiveDayPercent: number;
}

interface CheckinRow {
  id: string;
  created_at: string;
  group_id: string;
}

interface GroupRow {
  id: string;
  name: string;
  habit_type: string;
}

interface ScoreRow {
  checkin_id: string;
  points: number;
}

export function usePostingHistory(viewRange: ViewRange = 90) {
  const { user } = useAuth();
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [stats, setStats] = useState<PostingHistoryStats>({
    activeDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    mostActiveDay: 'N/A',
    mostActiveDayPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [habitTypes, setHabitTypes] = useState<string[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();
      const startDate = subDays(today, viewRange);
      const startISO = startDate.toISOString();

      // Fetch checkins and groups in parallel
      const [checkinsRes, groupsRes, scoresRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('id, created_at, group_id')
          .eq('user_id', user.id)
          .gte('created_at', startISO)
          .order('created_at', { ascending: true }),
        supabase
          .from('groups')
          .select('id, name, habit_type')
          .in(
            'id',
            (await supabase.from('group_members').select('group_id').eq('user_id', user.id)).data?.map(g => g.group_id) || []
          ),
        supabase
          .from('challenge_scores')
          .select('checkin_id, points')
          .eq('user_id', user.id)
          .gte('created_at', startISO),
      ]);

      const checkins = (checkinsRes.data || []) as CheckinRow[];
      const groups = (groupsRes.data || []) as GroupRow[];
      const scores = (scoresRes.data || []) as ScoreRow[];

      const groupMap = new Map(groups.map(g => [g.id, g]));
      const scoreMap = new Map<string, number>();
      scores.forEach(s => {
        scoreMap.set(s.checkin_id, (scoreMap.get(s.checkin_id) || 0) + s.points);
      });

      // Collect unique habit types
      const uniqueHabits = [...new Set(groups.map(g => g.habit_type))];
      setHabitTypes(uniqueHabits);

      // Build day data
      const days = eachDayOfInterval({ start: startDate, end: today });
      const todayStr = format(today, 'yyyy-MM-dd');
      const map = new Map<string, DayData>();

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        map.set(dateStr, {
          date: dateStr,
          postCount: 0,
          totalPoints: 0,
          postTimes: [],
          groups: [],
          habitTypes: [],
          isToday: dateStr === todayStr,
          isInCurrentStreak: false,
          isInLongestStreak: false,
        });
      });

      checkins.forEach(c => {
        const dateStr = format(new Date(c.created_at), 'yyyy-MM-dd');
        const dayData = map.get(dateStr);
        if (!dayData) return;

        const group = groupMap.get(c.group_id);

        // Apply habit filter
        if (selectedHabit && group && group.habit_type !== selectedHabit) return;

        dayData.postCount++;
        dayData.totalPoints += scoreMap.get(c.id) || 0;
        dayData.postTimes.push(format(new Date(c.created_at), 'ha').toLowerCase());
        if (group) {
          if (!dayData.groups.includes(group.name)) dayData.groups.push(group.name);
          if (!dayData.habitTypes.includes(group.habit_type)) dayData.habitTypes.push(group.habit_type);
        }
      });

      // Calculate streaks
      const sortedDates = days.map(d => format(d, 'yyyy-MM-dd')).reverse(); // most recent first
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let longestStreakStart = '';
      let longestStreakEnd = '';
      let currentStreakStart = '';

      // Walk backward from today
      for (let i = 0; i < sortedDates.length; i++) {
        const dayData = map.get(sortedDates[i]);
        if (dayData && dayData.postCount > 0) {
          tempStreak++;
          if (i === 0 || currentStreak > 0) {
            currentStreak = tempStreak;
            currentStreakStart = sortedDates[i];
          }
        } else {
          if (i === 0) {
            // Today has no posts, current streak is 0
            currentStreak = 0;
          }
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            longestStreakEnd = sortedDates[i - tempStreak] || sortedDates[0];
            longestStreakStart = sortedDates[i - 1] || sortedDates[0];
          }
          if (currentStreak === 0 && i > 0) {
            // Stop counting current streak after first gap
          }
          tempStreak = 0;
        }
      }
      // Final check
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestStreakEnd = sortedDates[sortedDates.length - tempStreak] || sortedDates[sortedDates.length - 1];
        longestStreakStart = sortedDates[sortedDates.length - 1];
      }

      // Mark current streak days
      if (currentStreak > 0) {
        for (let i = 0; i < currentStreak; i++) {
          const dayData = map.get(sortedDates[i]);
          if (dayData) dayData.isInCurrentStreak = true;
        }
      }

      // Mark longest streak days (only if different from current)
      if (longestStreak > currentStreak) {
        // Find the longest streak position
        let bestLen = 0;
        let bestStart = 0;
        let runLen = 0;
        const chronDates = [...sortedDates].reverse();
        for (let i = 0; i < chronDates.length; i++) {
          const d = map.get(chronDates[i]);
          if (d && d.postCount > 0) {
            runLen++;
            if (runLen > bestLen) {
              bestLen = runLen;
              bestStart = i - runLen + 1;
            }
          } else {
            runLen = 0;
          }
        }
        for (let i = bestStart; i < bestStart + bestLen; i++) {
          const d = map.get(chronDates[i]);
          if (d) d.isInLongestStreak = true;
        }
      }

      // Compute most active day of week
      const dayCounts: Record<number, { posted: number; total: number }> = {};
      for (let dow = 0; dow < 7; dow++) {
        dayCounts[dow] = { posted: 0, total: 0 };
      }
      days.forEach(day => {
        const dow = getDay(day);
        dayCounts[dow].total++;
        const d = map.get(format(day, 'yyyy-MM-dd'));
        if (d && d.postCount > 0) dayCounts[dow].posted++;
      });

      const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      let mostActiveIdx = 0;
      let mostActivePercent = 0;
      Object.entries(dayCounts).forEach(([dow, { posted, total }]) => {
        const pct = total > 0 ? Math.round((posted / total) * 100) : 0;
        if (pct > mostActivePercent) {
          mostActivePercent = pct;
          mostActiveIdx = Number(dow);
        }
      });

      const activeDays = Array.from(map.values()).filter(d => d.postCount > 0).length;

      setDayMap(map);
      setStats({
        activeDays,
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        mostActiveDay: dayNames[mostActiveIdx],
        mostActiveDayPercent: mostActivePercent,
      });
    } catch (err) {
      console.error('Error fetching posting history:', err);
    } finally {
      setLoading(false);
    }
  }, [user, viewRange, selectedHabit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const calendarDays = useMemo(() => Array.from(dayMap.values()), [dayMap]);

  return {
    calendarDays,
    stats,
    loading,
    habitTypes,
    selectedHabit,
    setSelectedHabit,
    refetch: fetchHistory,
  };
}
