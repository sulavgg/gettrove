-- Create rest_days table to track rest days per user per group per week
CREATE TABLE public.rest_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  rest_date DATE NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure unique rest day per user/group/date
CREATE UNIQUE INDEX idx_rest_days_unique ON public.rest_days (user_id, group_id, rest_date);

-- Index for querying rest days in a week
CREATE INDEX idx_rest_days_week ON public.rest_days (user_id, group_id, week_start);

-- Enable RLS
ALTER TABLE public.rest_days ENABLE ROW LEVEL SECURITY;

-- Users can view rest days in their groups
CREATE POLICY "Users can view rest days in their groups"
ON public.rest_days
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members
  WHERE group_members.group_id = rest_days.group_id
  AND group_members.user_id = auth.uid()
));

-- Users can create their own rest days
CREATE POLICY "Users can create own rest days"
ON public.rest_days
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own rest days (in case of mistake)
CREATE POLICY "Users can delete own rest days"
ON public.rest_days
FOR DELETE
USING (auth.uid() = user_id);

-- Update the streak function to consider rest days
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid, p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_yesterday DATE;
  v_has_rest_day BOOLEAN;
BEGIN
  v_yesterday := CURRENT_DATE - 1;
  
  -- Check if yesterday was a rest day
  SELECT EXISTS (
    SELECT 1 FROM rest_days
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND rest_date = v_yesterday
  ) INTO v_has_rest_day;

  INSERT INTO streaks (user_id, group_id, current_streak, longest_streak, total_checkins, last_checkin_date)
  VALUES (p_user_id, p_group_id, 1, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id, group_id) DO UPDATE
  SET 
    current_streak = CASE
      WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.current_streak
      WHEN streaks.last_checkin_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
      -- If yesterday was a rest day and last checkin was 2 days ago, continue streak
      WHEN v_has_rest_day AND streaks.last_checkin_date = CURRENT_DATE - 2 THEN streaks.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      streaks.longest_streak,
      CASE
        WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.current_streak
        WHEN streaks.last_checkin_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
        WHEN v_has_rest_day AND streaks.last_checkin_date = CURRENT_DATE - 2 THEN streaks.current_streak + 1
        ELSE 1
      END
    ),
    total_checkins = CASE
      WHEN streaks.last_checkin_date = CURRENT_DATE THEN streaks.total_checkins
      ELSE streaks.total_checkins + 1
    END,
    last_checkin_date = CURRENT_DATE;
END;
$function$;

-- Function to check rest days remaining this week
CREATE OR REPLACE FUNCTION public.get_rest_days_remaining(p_user_id uuid, p_group_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start DATE;
  v_rest_count INTEGER;
BEGIN
  -- Calculate Monday of current week
  v_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1;
  -- Adjust for Sunday (DOW = 0)
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    v_week_start := v_week_start - 7;
  END IF;
  
  SELECT COUNT(*) INTO v_rest_count
  FROM rest_days
  WHERE user_id = p_user_id
  AND group_id = p_group_id
  AND week_start = v_week_start;
  
  RETURN 2 - v_rest_count;
END;
$function$;

-- Function to take a rest day
CREATE OR REPLACE FUNCTION public.take_rest_day(p_user_id uuid, p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start DATE;
  v_rest_count INTEGER;
  v_already_posted BOOLEAN;
  v_already_rested BOOLEAN;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if user is member of group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this group');
  END IF;

  -- Calculate Monday of current week
  v_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1;
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    v_week_start := v_week_start - 7;
  END IF;
  
  -- Check if already posted today
  SELECT EXISTS (
    SELECT 1 FROM checkins
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND DATE(created_at) = CURRENT_DATE
  ) INTO v_already_posted;
  
  IF v_already_posted THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already posted today');
  END IF;
  
  -- Check if already took rest day today
  SELECT EXISTS (
    SELECT 1 FROM rest_days
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND rest_date = CURRENT_DATE
  ) INTO v_already_rested;
  
  IF v_already_rested THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already took a rest day today');
  END IF;
  
  -- Count rest days this week
  SELECT COUNT(*) INTO v_rest_count
  FROM rest_days
  WHERE user_id = p_user_id
  AND group_id = p_group_id
  AND week_start = v_week_start;
  
  IF v_rest_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have used all 2 rest days this week');
  END IF;
  
  -- Insert rest day
  INSERT INTO rest_days (user_id, group_id, rest_date, week_start)
  VALUES (p_user_id, p_group_id, CURRENT_DATE, v_week_start);
  
  -- Update streak to preserve it (mark last_checkin_date as today conceptually)
  -- We update the streak's last_checkin_date to today so the streak continues
  UPDATE streaks
  SET last_checkin_date = CURRENT_DATE
  WHERE user_id = p_user_id AND group_id = p_group_id;
  
  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO streaks (user_id, group_id, current_streak, longest_streak, total_checkins, last_checkin_date)
    VALUES (p_user_id, p_group_id, 1, 1, 0, CURRENT_DATE);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'rest_days_remaining', 2 - v_rest_count - 1
  );
END;
$function$;