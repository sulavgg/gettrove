-- Create a security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  )
$$;

-- Create a function to get user's group IDs without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_group_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id
  FROM public.group_members
  WHERE user_id = p_user_id
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view memberships in their groups" ON public.group_members;

-- Create new policy using the security definer function
CREATE POLICY "Users can view memberships in their groups"
ON public.group_members
FOR SELECT
USING (group_id IN (SELECT public.get_user_group_ids(auth.uid())));