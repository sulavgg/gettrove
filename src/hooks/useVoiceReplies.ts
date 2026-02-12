import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceReply {
  id: string;
  checkin_id: string;
  user_id: string;
  audio_url: string;
  duration_seconds: number;
  created_at: string;
  user_name: string;
  user_photo: string | null;
  parent_reply_id: string | null;
  reactions: ReactionSummary[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useVoiceReplies = (checkinId: string) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<VoiceReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  const fetchReactions = useCallback(async (replyIds: string[]): Promise<Map<string, ReactionSummary[]>> => {
    if (replyIds.length === 0) return new Map();

    const { data: reactions } = await supabase
      .from('voice_reply_reactions')
      .select('*')
      .in('voice_reply_id', replyIds);

    const map = new Map<string, ReactionSummary[]>();
    if (!reactions) return map;

    // Group by reply_id and emoji
    const grouped = new Map<string, Map<string, { count: number; hasReacted: boolean }>>();
    for (const r of reactions) {
      if (!grouped.has(r.voice_reply_id)) grouped.set(r.voice_reply_id, new Map());
      const emojiMap = grouped.get(r.voice_reply_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, { count: 0, hasReacted: false });
      const entry = emojiMap.get(r.emoji)!;
      entry.count++;
      if (r.user_id === user?.id) entry.hasReacted = true;
    }

    for (const [replyId, emojiMap] of grouped) {
      map.set(replyId, Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        hasReacted: data.hasReacted,
      })));
    }

    return map;
  }, [user?.id]);

  const fetchReplies = useCallback(async () => {
    if (!checkinId) return;
    setLoading(true);
    try {
      const { data: voiceReplies, error } = await supabase
        .from('voice_replies')
        .select('*')
        .eq('checkin_id', checkinId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!voiceReplies || voiceReplies.length === 0) {
        setReplies([]);
        setReplyCount(0);
        return;
      }

      // Get unique user IDs and fetch profiles
      const userIds = [...new Set(voiceReplies.map(r => r.user_id))];
      const profilePromises = userIds.map(uid =>
        supabase.rpc('get_public_profile', { p_user_id: uid })
      );
      const profileResults = await Promise.all(profilePromises);

      const profileMap = new Map<string, { name: string; photo: string | null }>();
      profileResults.forEach(result => {
        if (result.data && result.data.length > 0) {
          const p = result.data[0];
          profileMap.set(p.user_id, { name: p.name, photo: p.profile_photo_url });
        }
      });

      // Generate signed URLs for private bucket access
      const signedUrlPromises = voiceReplies.map(r =>
        supabase.storage
          .from('voice-replies')
          .createSignedUrl(r.audio_url, 3600)
      );
      const signedUrlResults = await Promise.all(signedUrlPromises);

      // Fetch reactions for all replies
      const replyIds = voiceReplies.map(r => r.id);
      const reactionsMap = await fetchReactions(replyIds);

      const enriched: VoiceReply[] = voiceReplies.map((r, i) => ({
        id: r.id,
        checkin_id: r.checkin_id,
        user_id: r.user_id,
        audio_url: signedUrlResults[i]?.data?.signedUrl || r.audio_url,
        duration_seconds: Number(r.duration_seconds),
        created_at: r.created_at,
        user_name: profileMap.get(r.user_id)?.name || 'Unknown',
        user_photo: profileMap.get(r.user_id)?.photo || null,
        parent_reply_id: r.parent_reply_id || null,
        reactions: reactionsMap.get(r.id) || [],
      }));

      setReplies(enriched);
      setReplyCount(enriched.filter(r => !r.parent_reply_id).length);
    } catch (err) {
      console.error('Error fetching voice replies:', err);
    } finally {
      setLoading(false);
    }
  }, [checkinId, fetchReactions]);

  const uploadVoiceReply = useCallback(async (audioBlob: Blob, durationSeconds: number, parentReplyId?: string) => {
    if (!user || !checkinId) return false;
    setUploading(true);
    try {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `${user.id}/${checkinId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-replies')
        .upload(fileName, audioBlob, { contentType: audioBlob.type });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('voice_replies')
        .insert({
          checkin_id: checkinId,
          user_id: user.id,
          audio_url: fileName,
          duration_seconds: Math.round(durationSeconds * 10) / 10,
          ...(parentReplyId ? { parent_reply_id: parentReplyId } : {}),
        });

      if (insertError) throw insertError;

      await fetchReplies();
      return true;
    } catch (err) {
      console.error('Error uploading voice reply:', err);
      return false;
    } finally {
      setUploading(false);
    }
  }, [user, checkinId, fetchReplies]);

  const deleteVoiceReply = useCallback(async (replyId: string) => {
    if (!user) return false;
    try {
      const reply = replies.find(r => r.id === replyId);
      
      const { error } = await supabase
        .from('voice_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (reply) {
        const filePath = reply.audio_url.includes('voice-replies') ? reply.audio_url : undefined;
        if (filePath) {
          await supabase.storage.from('voice-replies').remove([filePath]);
        }
      }

      setReplies(prev => prev.filter(r => r.id !== replyId && r.parent_reply_id !== replyId));
      setReplyCount(prev => prev - 1);
      return true;
    } catch (err) {
      console.error('Error deleting voice reply:', err);
      return false;
    }
  }, [user, replies]);

  const toggleReaction = useCallback(async (replyId: string, emoji: string) => {
    if (!user) return;

    const reply = replies.find(r => r.id === replyId);
    const existing = reply?.reactions.find(r => r.emoji === emoji && r.hasReacted);

    if (existing) {
      await supabase
        .from('voice_reply_reactions')
        .delete()
        .eq('voice_reply_id', replyId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('voice_reply_reactions')
        .insert({ voice_reply_id: replyId, user_id: user.id, emoji });
    }

    // Optimistic update
    setReplies(prev => prev.map(r => {
      if (r.id !== replyId) return r;
      const reactions = [...r.reactions];
      const idx = reactions.findIndex(rx => rx.emoji === emoji);
      if (existing) {
        if (idx !== -1) {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, hasReacted: false };
          if (reactions[idx].count <= 0) reactions.splice(idx, 1);
        }
      } else {
        if (idx !== -1) {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, hasReacted: true };
        } else {
          reactions.push({ emoji, count: 1, hasReacted: true });
        }
      }
      return { ...r, reactions };
    }));
  }, [user, replies]);

  // Fetch count on mount
  useEffect(() => {
    if (checkinId) {
      supabase
        .from('voice_replies')
        .select('id', { count: 'exact', head: true })
        .eq('checkin_id', checkinId)
        .is('parent_reply_id', null)
        .then(({ count }) => {
          setReplyCount(count || 0);
        });
    }
  }, [checkinId]);

  // Realtime subscription
  useEffect(() => {
    if (!checkinId) return;

    const channel = supabase
      .channel(`voice-replies-${checkinId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_replies',
          filter: `checkin_id=eq.${checkinId}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkinId, fetchReplies]);

  return {
    replies,
    replyCount,
    loading,
    uploading,
    fetchReplies,
    uploadVoiceReply,
    deleteVoiceReply,
    toggleReaction,
  };
};
