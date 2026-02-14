
-- Function to auto-award engagement points via triggers
CREATE OR REPLACE FUNCTION public.award_engagement_points()
RETURNS TRIGGER AS $$
DECLARE
  v_today_start timestamptz;
  v_daily_count integer;
  v_checkin_user_id uuid;
  v_checkin_group_id uuid;
  v_reaction_count integer;
  v_voice_reply_count integer;
BEGIN
  v_today_start := date_trunc('day', now());

  IF TG_TABLE_NAME = 'reactions' THEN
    -- Award 1 point to reactor (max 20/day)
    SELECT count(*) INTO v_daily_count
    FROM point_transactions
    WHERE user_id = NEW.user_id
      AND point_type = 'reaction_given'
      AND created_at >= v_today_start;

    IF v_daily_count < 20 THEN
      INSERT INTO point_transactions (user_id, checkin_id, point_type, points, description)
      VALUES (NEW.user_id, NEW.checkin_id, 'reaction_given', 1, 'Reaction given');
    END IF;

    -- Check if checkin hit 10 or 20 reactions
    SELECT user_id, group_id INTO v_checkin_user_id, v_checkin_group_id
    FROM checkins WHERE id = NEW.checkin_id;

    SELECT count(*) INTO v_reaction_count
    FROM reactions WHERE checkin_id = NEW.checkin_id;

    IF v_reaction_count = 10 AND v_checkin_user_id IS NOT NULL THEN
      INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
      VALUES (v_checkin_user_id, v_checkin_group_id, NEW.checkin_id, 'reactions_received_10', 10, '🎉 Post hit 10+ reactions!');
    END IF;

    IF v_reaction_count = 20 AND v_checkin_user_id IS NOT NULL THEN
      INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
      VALUES (v_checkin_user_id, v_checkin_group_id, NEW.checkin_id, 'reactions_received_20', 25, '🎉 Post hit 20+ reactions!');
    END IF;

  ELSIF TG_TABLE_NAME = 'voice_replies' THEN
    -- Award 3 points to voice replier
    INSERT INTO point_transactions (user_id, checkin_id, point_type, points, description)
    VALUES (NEW.user_id, NEW.checkin_id, 'voice_reply_given', 3, 'Voice reply sent');

    -- Check if checkin hit 5 voice replies
    SELECT user_id, group_id INTO v_checkin_user_id, v_checkin_group_id
    FROM checkins WHERE id = NEW.checkin_id;

    SELECT count(*) INTO v_voice_reply_count
    FROM voice_replies WHERE checkin_id = NEW.checkin_id AND parent_reply_id IS NULL;

    IF v_voice_reply_count = 5 AND v_checkin_user_id IS NOT NULL THEN
      INSERT INTO point_transactions (user_id, group_id, checkin_id, point_type, points, description)
      VALUES (v_checkin_user_id, v_checkin_group_id, NEW.checkin_id, 'voice_replies_received_5', 15, '🎤 Post hit 5+ voice replies!');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on reactions
CREATE TRIGGER trg_reaction_engagement_points
  AFTER INSERT ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_engagement_points();

-- Trigger on voice_replies
CREATE TRIGGER trg_voice_reply_engagement_points
  AFTER INSERT ON public.voice_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.award_engagement_points();
