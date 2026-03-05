
-- Create server-side function to award post points
CREATE OR REPLACE FUNCTION public.award_post_points(p_checkin_id uuid, p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_current_streak integer;
  v_capture_ts timestamptz;
  v_hour integer;
  v_dow integer;
  v_base integer := 25;
  v_subtotal integer;
  v_multiplier numeric;
  v_multiplier_bonus integer;
  v_streak_milestone integer;
  v_perfect_bonus integer;
  v_total integer;
  v_bonus_key text;
  v_bonus_label text;
  v_bonus_pts integer;
BEGIN
  -- Verify the checkin belongs to the caller
  SELECT user_id, COALESCE(capture_timestamp, created_at)
  INTO v_user_id, v_capture_ts
  FROM checkins
  WHERE id = p_checkin_id AND group_id = p_group_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Prevent double-awarding
  IF EXISTS (SELECT 1 FROM point_transactions WHERE checkin_id = p_checkin_id AND point_type = 'post_base') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Points already awarded for this checkin');
  END IF;

  -- Get current streak
  SELECT COALESCE(current_streak, 0) INTO v_current_streak
  FROM streaks WHERE user_id = v_user_id AND group_id = p_group_id;
  IF v_current_streak IS NULL THEN v_current_streak := 0; END IF;

  v_hour := EXTRACT(HOUR FROM v_capture_ts);
  v_dow := EXTRACT(DOW FROM v_capture_ts);
  v_subtotal := v_base;

  -- Insert base points
  INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
  VALUES (v_user_id, p_group_id, p_checkin_id, 'post_base', v_base, 'Base posting points');

  -- Time bonuses
  IF v_hour >= 4 AND v_hour < 7 THEN
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'early_morning', 25, '🌅 Early Bonus');
    v_subtotal := v_subtotal + 25;
  END IF;
  IF v_hour >= 21 THEN
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'late_night', 20, '🌙 Late Bonus');
    v_subtotal := v_subtotal + 20;
  END IF;
  IF v_hour >= 0 AND v_hour < 4 THEN
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'midnight', 30, '🦉 Night Owl Bonus');
    v_subtotal := v_subtotal + 30;
  END IF;
  IF v_dow = 0 OR v_dow = 6 THEN
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'weekend', 15, '📅 Weekend Bonus');
    v_subtotal := v_subtotal + 15;
  END IF;

  -- Streak multiplier
  v_multiplier := CASE
    WHEN v_current_streak >= 365 THEN 1.5
    WHEN v_current_streak >= 100 THEN 1.3
    WHEN v_current_streak >= 60 THEN 1.2
    WHEN v_current_streak >= 30 THEN 1.1
    ELSE 1.0
  END;

  v_multiplier_bonus := 0;
  IF v_multiplier > 1 THEN
    v_multiplier_bonus := ROUND(v_subtotal * (v_multiplier - 1));
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'streak_multiplier', v_multiplier_bonus, '🔥 Streak ×' || v_multiplier || ' bonus');
  END IF;

  -- Streak milestones
  v_streak_milestone := CASE v_current_streak
    WHEN 7 THEN 100 WHEN 14 THEN 150 WHEN 21 THEN 200 WHEN 30 THEN 500
    WHEN 60 THEN 750 WHEN 90 THEN 1000 WHEN 100 THEN 2500
    WHEN 180 THEN 2000 WHEN 365 THEN 5000 ELSE 0
  END;

  IF v_streak_milestone > 0 THEN
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'streak_milestone', v_streak_milestone, '🏆 ' || v_current_streak || '-day streak milestone!');
  END IF;

  -- Perfect week/month
  v_perfect_bonus := 0;
  IF v_current_streak > 0 AND v_current_streak % 7 = 0 THEN
    v_perfect_bonus := v_perfect_bonus + 200;
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'perfect_week', 200, '⭐ Perfect Week (' || v_current_streak || ' days)!');
  END IF;
  IF v_current_streak = 30 THEN
    v_perfect_bonus := v_perfect_bonus + 1000;
    INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
    VALUES (v_user_id, p_group_id, p_checkin_id, 'perfect_month', 1000, '🌟 Perfect Month!');
  END IF;

  v_total := v_subtotal + v_multiplier_bonus + v_streak_milestone + v_perfect_bonus;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'base', v_base,
    'multiplier', v_multiplier,
    'multiplier_bonus', v_multiplier_bonus,
    'streak_milestone', v_streak_milestone,
    'perfect_bonus', v_perfect_bonus,
    'streak', v_current_streak
  );
END;
$$;

-- Remove the client INSERT policy
DROP POLICY IF EXISTS "Users can insert own points" ON public.point_transactions;
