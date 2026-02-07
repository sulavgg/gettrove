import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invited_name: string;
  invited_identifier: string | null;
  invite_method: string;
  status: 'pending' | 'joined' | 'reminded';
  joined_user_id: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useGroupInvites = (groupId: string | undefined) => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!groupId || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', groupId)
        .eq('invited_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data as GroupInvite[]) || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const trackInvite = useCallback(async (name: string, method: string, identifier?: string) => {
    if (!groupId || !user) return;

    try {
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          invited_by: user.id,
          invited_name: name,
          invited_identifier: identifier || null,
          invite_method: method,
        });

      if (error) throw error;
      await fetchInvites();
    } catch (err) {
      console.error('Error tracking invite:', err);
    }
  }, [groupId, user, fetchInvites]);

  const sendReminder = useCallback(async (inviteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_invites')
        .update({ 
          status: 'reminded',
          reminded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
      await fetchInvites();
    } catch (err) {
      console.error('Error sending reminder:', err);
    }
  }, [user, fetchInvites]);

  const removeInvite = useCallback(async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('group_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      await fetchInvites();
    } catch (err) {
      console.error('Error removing invite:', err);
    }
  }, [fetchInvites]);

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const joinedInvites = invites.filter(i => i.status === 'joined');

  return {
    invites,
    pendingInvites,
    joinedInvites,
    loading,
    trackInvite,
    sendReminder,
    removeInvite,
    refetch: fetchInvites,
  };
};
