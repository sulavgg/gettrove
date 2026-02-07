
-- Weekly challenges assigned to each group
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  challenge_key TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  next_challenge_key TEXT,
  results_announced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, week_start)
);

-- Challenge scores per user per checkin
CREATE TABLE public.challenge_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
  points NUMERIC NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, checkin_id)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_scores ENABLE ROW LEVEL SECURITY;

-- RLS: Group members can view their group's challenges
CREATE POLICY "Group members can view challenges"
ON public.weekly_challenges FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members
  WHERE group_members.group_id = weekly_challenges.group_id
  AND group_members.user_id = auth.uid()
));

-- RLS: System/edge function inserts challenges (service role)
-- Users cannot insert challenges directly
CREATE POLICY "Service role manages challenges"
ON public.weekly_challenges FOR INSERT
WITH CHECK (false);

CREATE POLICY "Service role updates challenges"
ON public.weekly_challenges FOR UPDATE
USING (false);

-- RLS: Group members can view challenge scores in their groups
CREATE POLICY "Group members can view challenge scores"
ON public.challenge_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM weekly_challenges wc
  JOIN group_members gm ON gm.group_id = wc.group_id
  WHERE wc.id = challenge_scores.challenge_id
  AND gm.user_id = auth.uid()
));

-- RLS: Users can insert their own scores (from edge function verification)
CREATE POLICY "Users can insert own challenge scores"
ON public.challenge_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_weekly_challenges_group_week ON public.weekly_challenges(group_id, week_start);
CREATE INDEX idx_weekly_challenges_active ON public.weekly_challenges(week_end DESC);
CREATE INDEX idx_challenge_scores_challenge ON public.challenge_scores(challenge_id);
CREATE INDEX idx_challenge_scores_user ON public.challenge_scores(user_id);
