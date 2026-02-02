import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface RestDayInfo {
  restDaysRemaining: number;
  hasRestedToday: boolean;
  loading: boolean;
}

export const useRestDays = (groupId: string | null) => {
  const { user } = useAuth();
  const [info, setInfo] = useState<RestDayInfo>({
    restDaysRemaining: 2,
    hasRestedToday: false,
    loading: true,
  });

  const fetchRestDayInfo = useCallback(async () => {
    if (!user || !groupId) {
      setInfo(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Get rest days remaining
      const { data: remaining } = await supabase.rpc('get_rest_days_remaining', {
        p_user_id: user.id,
        p_group_id: groupId,
      });

      // Check if rested today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRest } = await supabase
        .from('rest_days')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('rest_date', today)
        .maybeSingle();

      setInfo({
        restDaysRemaining: remaining ?? 2,
        hasRestedToday: !!todayRest,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching rest day info:', error);
      setInfo(prev => ({ ...prev, loading: false }));
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchRestDayInfo();
  }, [fetchRestDayInfo]);

  const takeRestDay = async (): Promise<{ success: boolean; error?: string; restDaysRemaining?: number }> => {
    if (!user || !groupId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('take_rest_day', {
        p_user_id: user.id,
        p_group_id: groupId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; rest_days_remaining?: number };

      if (result.success) {
        setInfo(prev => ({
          ...prev,
          restDaysRemaining: result.rest_days_remaining ?? prev.restDaysRemaining - 1,
          hasRestedToday: true,
        }));
      }

      return {
        success: result.success,
        error: result.error,
        restDaysRemaining: result.rest_days_remaining,
      };
    } catch (error: any) {
      console.error('Error taking rest day:', error);
      return { success: false, error: error.message || 'Failed to take rest day' };
    }
  };

  const cancelRestDay = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !groupId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('rest_days')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('rest_date', today);

      if (error) throw error;

      setInfo(prev => ({
        ...prev,
        restDaysRemaining: prev.restDaysRemaining + 1,
        hasRestedToday: false,
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling rest day:', error);
      return { success: false, error: error.message || 'Failed to cancel rest day' };
    }
  };

  return {
    ...info,
    takeRestDay,
    cancelRestDay,
    refetch: fetchRestDayInfo,
  };
};

// Hook for multiple groups at once
export const useRestDaysForGroups = (groupIds: string[]) => {
  const { user } = useAuth();
  const [restDaysMap, setRestDaysMap] = useState<Record<string, { remaining: number; restedToday: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user || groupIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's rest days for all groups
        const { data: todayRests } = await supabase
          .from('rest_days')
          .select('group_id')
          .eq('user_id', user.id)
          .eq('rest_date', today)
          .in('group_id', groupIds);

        const restedTodaySet = new Set(todayRests?.map(r => r.group_id) || []);

        // Get remaining for each group
        const results: Record<string, { remaining: number; restedToday: boolean }> = {};
        
        await Promise.all(
          groupIds.map(async (groupId) => {
            const { data: remaining } = await supabase.rpc('get_rest_days_remaining', {
              p_user_id: user.id,
              p_group_id: groupId,
            });
            
            results[groupId] = {
              remaining: remaining ?? 2,
              restedToday: restedTodaySet.has(groupId),
            };
          })
        );

        setRestDaysMap(results);
      } catch (error) {
        console.error('Error fetching rest days for groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, groupIds.join(',')]);

  return { restDaysMap, loading };
};
