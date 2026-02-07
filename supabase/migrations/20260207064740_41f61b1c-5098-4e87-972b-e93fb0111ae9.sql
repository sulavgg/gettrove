
-- Create voice_replies table
CREATE TABLE public.voice_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC(4,1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_replies ENABLE ROW LEVEL SECURITY;

-- Members of the same group can view voice replies on checkins in their group
CREATE POLICY "Group members can view voice replies"
  ON public.voice_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.checkins c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = voice_replies.checkin_id
        AND gm.user_id = auth.uid()
    )
  );

-- Authenticated users can create voice replies on checkins in their groups
CREATE POLICY "Group members can create voice replies"
  ON public.voice_replies
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.checkins c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = voice_replies.checkin_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can delete their own voice replies
CREATE POLICY "Users can delete own voice replies"
  ON public.voice_replies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for fast lookup by checkin
CREATE INDEX idx_voice_replies_checkin_id ON public.voice_replies(checkin_id);
CREATE INDEX idx_voice_replies_created_at ON public.voice_replies(created_at);

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-replies', 'voice-replies', true, 5242880, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']);

-- Storage policies
CREATE POLICY "Anyone can read voice replies"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-replies');

CREATE POLICY "Authenticated users can upload voice replies"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-replies' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own voice reply files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-replies' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for voice replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_replies;
