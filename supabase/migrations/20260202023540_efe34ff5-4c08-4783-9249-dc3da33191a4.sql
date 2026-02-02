-- Create atomic streak update function to prevent race conditions
-- This replaces the client-side read-modify-write pattern with an atomic upsert

-- First, add a unique constraint on user_id + group_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'streaks_user_group_unique'
  ) THEN
    ALTER TABLE public.streaks 
    ADD CONSTRAINT streaks_user_group_unique UNIQUE (user_id, group_id);
  END IF;
END $$;

-- Create atomic streak update function
CREATE OR REPLACE FUNCTION public.update_user_streak(
  p_user_id uuid,
  p_group_id uuid
) RETURNS void 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO streaks (user_id, group_id, current_streak, longest_streak, total_checkins, last_checkin_date)
  VALUES (p_user_id, p_group_id, 1, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id, group_id) DO UPDATE
  SET 
    current_streak = CASE
      WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.current_streak
      WHEN streaks.last_checkin_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      streaks.longest_streak,
      CASE
        WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.current_streak
        WHEN streaks.last_checkin_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
        ELSE 1
      END
    ),
    total_checkins = CASE
      WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.total_checkins
      ELSE streaks.total_checkins + 1
    END,
    last_checkin_date = CURRENT_DATE;
END;
$$;