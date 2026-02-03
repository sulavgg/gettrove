import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, parseISO } from 'date-fns';
import type { RecapData, WeekPhoto } from '@/components/recap/WeeklyRecapSlides';

interface DayStatus {
  day: string;
  posted: boolean;
}

export const useWeeklyRecap = () => {
  const { user } = useAuth();
  const [latestRecap, setLatestRecap] = useState<RecapData | null>(null);
  const [recaps, setRecaps] = useState<RecapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnviewedRecap, setHasUnviewedRecap] = useState(false);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapDbToRecapData = (db: any): RecapData => {
    const dayStatuses = (db.day_statuses as DayStatus[] | null) || [];
    // Photos will be fetched separately and merged
    return {
      id: db.id,
      weekRange: `${format(parseISO(db.week_start), 'MMM d')} - ${format(parseISO(db.week_end), 'MMM d, yyyy')}`,
      weekStart: db.week_start,
      weekEnd: db.week_end,
      daysPosted: db.days_posted,
      dayStatuses,
      weekPhotos: [], // Will be populated separately
      currentStreak: db.current_streak,
      streakChange: db.streak_change,
      streakBrokenOn: db.streak_broken_on || undefined,
      longestStreakMonth: db.longest_streak_month,
      groupRank: db.group_rank || undefined,
      groupTotal: db.group_total || undefined,
      groupConsistency: db.group_consistency || undefined,
      userConsistency: db.user_consistency || undefined,
      bestPerformerName: db.best_performer_name || undefined,
      bestPerformerDays: db.best_performer_days || undefined,
      strugglingMemberName: db.struggling_member_name || undefined,
      strugglingMemberDays: db.struggling_member_days || undefined,
      mostProductiveDay: db.most_productive_day || undefined,
      toughestDay: db.toughest_day || undefined,
      avgPostTime: db.avg_post_time || undefined,
      earliestPostTime: db.earliest_post_time || undefined,
      earliestPostDay: db.earliest_post_day || undefined,
      nextMilestoneDays: db.next_milestone_days || undefined,
      nextMilestoneName: db.next_milestone_name || undefined,
    };
  };

  const fetchWeekPhotos = async (weekStart: string, weekEnd: string): Promise<WeekPhoto[]> => {
    if (!user) return [];
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    try {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id, photo_url, caption, created_at')
        .eq('user_id', user.id)
        .gte('created_at', `${weekStart}T00:00:00`)
        .lte('created_at', `${weekEnd}T23:59:59`)
        .order('created_at', { ascending: true });

      if (!checkins) return [];

      return checkins.map(c => ({
        id: c.id,
        photoUrl: c.photo_url,
        caption: c.caption,
        createdAt: c.created_at,
        dayName: dayNames[parseISO(c.created_at).getDay()],
      }));
    } catch (error) {
      console.error('Error fetching week photos:', error);
      return [];
    }
  };

  const fetchRecaps = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('weekly_recaps')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(4);

      if (error) throw error;

      // Map recaps and fetch photos for each
      const mappedRecaps = await Promise.all(
        (data || []).map(async (db) => {
          const baseRecap = mapDbToRecapData(db);
          const weekPhotos = await fetchWeekPhotos(db.week_start, db.week_end);
          return { ...baseRecap, weekPhotos };
        })
      );
      
      setRecaps(mappedRecaps);
      
      if (mappedRecaps.length > 0) {
        setLatestRecap(mappedRecaps[0]);
        // Check if latest recap is unviewed
        const latestDb = data?.[0];
        setHasUnviewedRecap(latestDb && !latestDb.viewed_at);
      }
    } catch (error) {
      console.error('Error fetching recaps:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsViewed = useCallback(async (recapId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('weekly_recaps')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', recapId);
      
      setHasUnviewedRecap(false);
    } catch (error) {
      console.error('Error marking recap as viewed:', error);
    }
  }, [user]);

  const generateRecapLocally = useCallback(async (): Promise<RecapData | null> => {
    if (!user) return null;

    try {
      // Calculate last week's date range
      const now = new Date();
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      
      const weekDays = eachDayOfInterval({ start: lastWeekStart, end: lastWeekEnd });
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      // Get user's checkins for last week
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id, created_at, group_id, photo_url, caption')
        .eq('user_id', user.id)
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString());

      // Build day statuses
      const dayStatuses = weekDays.map((day, idx) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const posted = checkins?.some(c => 
          format(parseISO(c.created_at), 'yyyy-MM-dd') === dayStr
        ) || false;
        return { day: dayNames[idx], posted };
      });

      const daysPosted = dayStatuses.filter(d => d.posted).length;

      // Get current streak
      const { data: streaks } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id);

      const currentStreak = streaks?.[0]?.current_streak || 0;
      const longestStreakMonth = Math.max(...(streaks?.map(s => s.longest_streak) || [0]));

      // Get group info
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      let groupRank, groupTotal, groupConsistency, userConsistency;
      let bestPerformerName, bestPerformerDays, strugglingMemberName, strugglingMemberDays;

      if (memberships && memberships.length > 0) {
        const groupId = memberships[0].group_id;
        
        // Get all members of the group
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        if (members) {
          groupTotal = members.length;
          
          // Get checkins for all members
          const memberStats = await Promise.all(
            members.map(async (m) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('user_id', m.user_id)
                .single();

              const { data: memberCheckins } = await supabase
                .from('checkins')
                .select('created_at')
                .eq('user_id', m.user_id)
                .eq('group_id', groupId)
                .gte('created_at', lastWeekStart.toISOString())
                .lte('created_at', lastWeekEnd.toISOString());

              const uniqueDays = new Set(
                memberCheckins?.map(c => format(parseISO(c.created_at), 'yyyy-MM-dd'))
              ).size;

              return {
                userId: m.user_id,
                name: profile?.name || 'Unknown',
                daysPosted: uniqueDays,
              };
            })
          );

          // Sort by days posted
          memberStats.sort((a, b) => b.daysPosted - a.daysPosted);
          
          // Find user's rank
          const userIdx = memberStats.findIndex(m => m.userId === user.id);
          groupRank = userIdx + 1;
          
          // Group and user consistency
          const totalGroupDays = memberStats.reduce((sum, m) => sum + m.daysPosted, 0);
          groupConsistency = Math.round((totalGroupDays / (members.length * 7)) * 100);
          userConsistency = Math.round((daysPosted / 7) * 100);

          // Best and struggling members
          if (memberStats.length > 0) {
            bestPerformerName = memberStats[0].name;
            bestPerformerDays = memberStats[0].daysPosted;
            strugglingMemberName = memberStats[memberStats.length - 1].name;
            strugglingMemberDays = memberStats[memberStats.length - 1].daysPosted;
          }
        }
      }

      // Calculate next milestone
      const milestones = [
        { days: 7, name: '7-day streak 🔥' },
        { days: 14, name: '2-week streak 💪' },
        { days: 30, name: '30-day streak 🏆' },
        { days: 60, name: '60-day streak 👑' },
        { days: 100, name: '100-day streak 🌟' },
        { days: 365, name: '1-year streak 🎉' },
      ];
      
      const nextMilestone = milestones.find(m => m.days > currentStreak);
      const nextMilestoneDays = nextMilestone ? nextMilestone.days - currentStreak : undefined;
      const nextMilestoneName = nextMilestone?.name;

      // Find most productive and toughest days
      const dayPostCounts: Record<string, number> = {};
      dayNames.forEach(day => { dayPostCounts[day] = 0; });
      
      checkins?.forEach(c => {
        const dayIdx = parseISO(c.created_at).getDay();
        const dayName = dayNames[dayIdx === 0 ? 6 : dayIdx - 1];
        dayPostCounts[dayName]++;
      });

      const sortedDays = Object.entries(dayPostCounts).sort((a, b) => b[1] - a[1]);
      const mostProductiveDay = sortedDays[0]?.[1] > 0 ? sortedDays[0][0] : undefined;
      const toughestDay = sortedDays[sortedDays.length - 1]?.[0];

      // Find earliest post time
      let earliestPostTime, earliestPostDay;
      if (checkins && checkins.length > 0) {
        const withTimes = checkins.map(c => ({
          time: format(parseISO(c.created_at), 'HH:mm'),
          day: dayNames[parseISO(c.created_at).getDay() === 0 ? 6 : parseISO(c.created_at).getDay() - 1],
        }));
        withTimes.sort((a, b) => a.time.localeCompare(b.time));
        earliestPostTime = withTimes[0].time;
        earliestPostDay = withTimes[0].day;
      }

      // Build week photos from checkins
      const weekPhotosData: WeekPhoto[] = checkins?.map(c => ({
        id: c.id,
        photoUrl: c.photo_url,
        caption: c.caption,
        createdAt: c.created_at,
        dayName: dayNames[parseISO(c.created_at).getDay() === 0 ? 6 : parseISO(c.created_at).getDay() - 1],
      })) || [];

      return {
        id: 'local-' + Date.now(),
        weekRange: `${format(lastWeekStart, 'MMM d')} - ${format(lastWeekEnd, 'MMM d, yyyy')}`,
        weekStart: format(lastWeekStart, 'yyyy-MM-dd'),
        weekEnd: format(lastWeekEnd, 'yyyy-MM-dd'),
        daysPosted,
        dayStatuses,
        weekPhotos: weekPhotosData,
        currentStreak,
        streakChange: 0,
        longestStreakMonth,
        groupRank,
        groupTotal,
        groupConsistency,
        userConsistency,
        bestPerformerName,
        bestPerformerDays,
        strugglingMemberName,
        strugglingMemberDays,
        mostProductiveDay,
        toughestDay,
        earliestPostTime,
        earliestPostDay,
        nextMilestoneDays,
        nextMilestoneName,
      };
    } catch (error) {
      console.error('Error generating recap:', error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    fetchRecaps();
  }, [fetchRecaps]);

  return {
    latestRecap,
    recaps,
    loading,
    hasUnviewedRecap,
    markAsViewed,
    generateRecapLocally,
    refetch: fetchRecaps,
  };
};
