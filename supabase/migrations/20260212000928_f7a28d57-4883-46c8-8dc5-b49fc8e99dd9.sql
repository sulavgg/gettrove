
-- Add parent_reply_id to support threaded/nested voice replies
ALTER TABLE public.voice_replies 
ADD COLUMN parent_reply_id UUID REFERENCES public.voice_replies(id) ON DELETE CASCADE;

-- Create voice reply reactions table
CREATE TABLE public.voice_reply_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_reply_id UUID NOT NULL REFERENCES public.voice_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💪',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voice_reply_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.voice_reply_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_reply_reactions
CREATE POLICY "Users can view reactions on replies in their groups"
ON public.voice_reply_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voice_replies vr
    JOIN public.checkins c ON c.id = vr.checkin_id
    JOIN public.group_members gm ON gm.group_id = c.group_id
    WHERE vr.id = voice_reply_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions"
ON public.voice_reply_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
ON public.voice_reply_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_reply_reactions;

-- Index for performance
CREATE INDEX idx_voice_reply_reactions_reply_id ON public.voice_reply_reactions(voice_reply_id);
CREATE INDEX idx_voice_replies_parent ON public.voice_replies(parent_reply_id);
