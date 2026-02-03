-- Create a trigger function to enforce the group member limit
CREATE OR REPLACE FUNCTION public.check_group_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count INTEGER;
BEGIN
  -- Count current members in the group
  SELECT COUNT(*) INTO v_member_count
  FROM group_members
  WHERE group_id = NEW.group_id;
  
  -- Enforce 20-member limit
  IF v_member_count >= 20 THEN
    RAISE EXCEPTION 'Group is full (maximum 20 members)';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert on group_members
DROP TRIGGER IF EXISTS enforce_group_member_limit ON public.group_members;
CREATE TRIGGER enforce_group_member_limit
  BEFORE INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_member_limit();