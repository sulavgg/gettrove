import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const MIN_MEMBERS = 3;

interface UseGroupUnlockResult {
  memberCount: number;
  isUnlocked: boolean;
  membersNeeded: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useGroupUnlock = (groupId: string | undefined): UseGroupUnlockResult => {
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMemberCount = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (!error && count !== null) {
        setMemberCount(count);
      }
    } catch (err) {
      console.error('Error fetching member count:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMemberCount();
  }, [fetchMemberCount]);

  const isUnlocked = memberCount >= MIN_MEMBERS;
  const membersNeeded = Math.max(0, MIN_MEMBERS - memberCount);

  return {
    memberCount,
    isUnlocked,
    membersNeeded,
    loading,
    refetch: fetchMemberCount,
  };
};

export const MIN_GROUP_MEMBERS = MIN_MEMBERS;
