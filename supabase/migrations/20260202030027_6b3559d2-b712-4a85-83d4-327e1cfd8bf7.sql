-- Create table for storing weekly recaps
CREATE TABLE public.weekly_recaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  days_posted INTEGER NOT NULL DEFAULT 0,
  day_statuses JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_streak INTEGER NOT NULL DEFAULT 0,
  streak_change INTEGER NOT NULL DEFAULT 0,
  streak_broken_on TEXT,
  longest_streak_month INTEGER NOT NULL DEFAULT 0,
  group_rank INTEGER,
  group_total INTEGER,
  group_consistency NUMERIC(5,2),
  user_consistency NUMERIC(5,2),
  best_performer_name TEXT,
  best_performer_days INTEGER,
  struggling_member_name TEXT,
  struggling_member_days INTEGER,
  most_productive_day TEXT,
  toughest_day TEXT,
  avg_post_time TIME,
  earliest_post_time TIME,
  earliest_post_day TEXT,
  next_milestone_days INTEGER,
  next_milestone_name TEXT,
  group_id UUID,
  shareable_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recaps
CREATE POLICY "Users can view own recaps"
  ON public.weekly_recaps
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert recaps (via edge function with service role)
CREATE POLICY "Users can insert own recaps"
  ON public.weekly_recaps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recaps (for viewed_at)
CREATE POLICY "Users can update own recaps"
  ON public.weekly_recaps
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_weekly_recaps_user_week ON public.weekly_recaps(user_id, week_start DESC);
CREATE INDEX idx_weekly_recaps_created ON public.weekly_recaps(created_at DESC);