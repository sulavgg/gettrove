-- Security fixes migration
-- Addresses: duplicate checkins, missing RLS membership checks,
-- take_rest_day race condition, update_user_streak auth guard,
-- weekly_recaps fabrication, and missing FK cascades.

-- ============================================================
-- 1. Unique constraint: one checkin per user per group per day
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_once_per_day
  ON public.checkins (user_id, group_id, (created_at AT TIME ZONE 'UTC')::date);

-- ============================================================
-- 2. reactions INSERT: require group membership
-- ============================================================
DROP POLICY IF EXISTS "Users can add reactions" ON public.reactions;
CREATE POLICY "Group members can add reactions" ON public.reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.checkins c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = reactions.checkin_id
        AND gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. message_reactions INSERT: require group membership
-- ============================================================
DROP POLICY IF EXISTS "Users can add message reactions" ON public.message_reactions;
CREATE POLICY "Group members can add message reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = message_reactions.message_id
        AND gmem.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. take_rest_day: add advisory lock to prevent TOCTOU race
-- ============================================================
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
  -- Auth guard
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check group membership
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this group');
  END IF;

  -- Serialize concurrent calls for the same user/group pair
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_group_id::text));

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
      AND (created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
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

  -- Count rest days this week (safe: inside the advisory lock)
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

  -- Preserve streak: update last_checkin_date to today
  UPDATE streaks
  SET last_checkin_date = CURRENT_DATE
  WHERE user_id = p_user_id AND group_id = p_group_id;

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

-- ============================================================
-- 5. update_user_streak: add auth guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid, p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_yesterday DATE;
  v_has_rest_day BOOLEAN;
BEGIN
  -- Auth guard: caller must be the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_yesterday := CURRENT_DATE - 1;

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

-- ============================================================
-- 6. weekly_recaps: remove client INSERT (service role only)
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own recaps" ON public.weekly_recaps;
-- generate-weekly-recap edge function uses service_role key → bypasses RLS.
-- No client-accessible INSERT policy means users cannot fabricate recap data.

-- ============================================================
-- 7. Missing FK cascades: orphaned rows on user deletion
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rest_days_user_id_fkey'
  ) THEN
    ALTER TABLE public.rest_days
      ADD CONSTRAINT rest_days_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_recaps_user_id_fkey'
  ) THEN
    ALTER TABLE public.weekly_recaps
      ADD CONSTRAINT weekly_recaps_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_scores_user_id_fkey'
  ) THEN
    ALTER TABLE public.challenge_scores
      ADD CONSTRAINT challenge_scores_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'voice_reply_reactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.voice_reply_reactions
      ADD CONSTRAINT voice_reply_reactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_transactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.point_transactions
      ADD CONSTRAINT point_transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
