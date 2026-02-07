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
}

export const useVoiceReplies = (checkinId: string) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<VoiceReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

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
          .createSignedUrl(r.audio_url, 3600) // 1 hour expiry
      );
      const signedUrlResults = await Promise.all(signedUrlPromises);

      const enriched: VoiceReply[] = voiceReplies.map((r, i) => ({
        id: r.id,
        checkin_id: r.checkin_id,
        user_id: r.user_id,
        audio_url: signedUrlResults[i]?.data?.signedUrl || r.audio_url,
        duration_seconds: Number(r.duration_seconds),
        created_at: r.created_at,
        user_name: profileMap.get(r.user_id)?.name || 'Unknown',
        user_photo: profileMap.get(r.user_id)?.photo || null,
      }));

      setReplies(enriched);
      setReplyCount(enriched.length);
    } catch (err) {
      console.error('Error fetching voice replies:', err);
    } finally {
      setLoading(false);
    }
  }, [checkinId]);

  const uploadVoiceReply = useCallback(async (audioBlob: Blob, durationSeconds: number) => {
    if (!user || !checkinId) return false;
    setUploading(true);
    try {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `${user.id}/${checkinId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-replies')
        .upload(fileName, audioBlob, { contentType: audioBlob.type });

      if (uploadError) throw uploadError;

      // Store the file path (not a public URL) since the bucket is private
      const { error: insertError } = await supabase
        .from('voice_replies')
        .insert({
          checkin_id: checkinId,
          user_id: user.id,
          audio_url: fileName,
          duration_seconds: Math.round(durationSeconds * 10) / 10,
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

  // Fetch count on mount
  useEffect(() => {
    if (checkinId) {
      supabase
        .from('voice_replies')
        .select('id', { count: 'exact', head: true })
        .eq('checkin_id', checkinId)
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
  };
};
