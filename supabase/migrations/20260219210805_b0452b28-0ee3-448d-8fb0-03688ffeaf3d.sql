
-- Add campus fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN campus text DEFAULT NULL,
ADD COLUMN show_on_campus_feed boolean NOT NULL DEFAULT true,
ADD COLUMN anonymous_on_campus boolean NOT NULL DEFAULT false;

-- Add shared_to_campus field to checkins
ALTER TABLE public.checkins
ADD COLUMN shared_to_campus boolean NOT NULL DEFAULT false;

-- Create RLS policy for campus feed: authenticated users can view checkins shared to campus feed if same campus
CREATE POLICY "Users can view campus feed checkins"
ON public.checkins
FOR SELECT
USING (
  shared_to_campus = true
  AND EXISTS (
    SELECT 1 FROM profiles viewer
    WHERE viewer.user_id = auth.uid()
    AND viewer.campus IS NOT NULL
    AND viewer.campus = (
      SELECT p.campus FROM profiles p WHERE p.user_id = checkins.user_id
    )
  )
  AND EXISTS (
    SELECT 1 FROM profiles poster
    WHERE poster.user_id = checkins.user_id
    AND poster.show_on_campus_feed = true
  )
);

-- Create a function to get campus stats
CREATE OR REPLACE FUNCTION public.get_campus_stats(p_campus text)
RETURNS TABLE(
  total_students bigint,
  avg_streak numeric,
  top_habit text,
  top_habit_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH campus_users AS (
    SELECT user_id FROM profiles WHERE campus = p_campus AND show_on_campus_feed = true
  ),
  streak_data AS (
    SELECT COALESCE(AVG(s.current_streak), 0) as avg_streak
    FROM streaks s
    WHERE s.user_id IN (SELECT user_id FROM campus_users)
    AND s.current_streak > 0
  ),
  habit_data AS (
    SELECT g.habit_type, COUNT(*) as cnt
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.user_id IN (SELECT user_id FROM campus_users)
    GROUP BY g.habit_type
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*) FROM campus_users)::bigint as total_students,
    (SELECT avg_streak FROM streak_data)::numeric as avg_streak,
    (SELECT habit_type::text FROM habit_data) as top_habit,
    CASE 
      WHEN (SELECT COUNT(*) FROM campus_users) > 0 
      THEN ROUND((SELECT cnt FROM habit_data)::numeric / GREATEST((SELECT COUNT(*) FROM campus_users), 1) * 100, 0)
      ELSE 0 
    END as top_habit_pct;
$$;

-- Create a function to get campus leaderboard
CREATE OR REPLACE FUNCTION public.get_campus_leaderboard(p_campus text, p_habit_filter text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  profile_photo_url text,
  current_streak integer,
  habit_type text,
  is_anonymous boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    CASE WHEN p.anonymous_on_campus THEN 'Anonymous' ELSE p.name END as display_name,
    CASE WHEN p.anonymous_on_campus THEN NULL ELSE p.profile_photo_url END as profile_photo_url,
    s.current_streak,
    g.habit_type::text,
    p.anonymous_on_campus as is_anonymous
  FROM profiles p
  JOIN streaks s ON s.user_id = p.user_id
  JOIN groups g ON g.id = s.group_id
  WHERE p.campus = p_campus
    AND p.show_on_campus_feed = true
    AND s.current_streak > 0
    AND (p_habit_filter IS NULL OR g.habit_type::text = p_habit_filter)
  ORDER BY p.user_id, s.current_streak DESC;
$$;
