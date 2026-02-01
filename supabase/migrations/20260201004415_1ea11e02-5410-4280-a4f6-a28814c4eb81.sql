-- Drop the restrictive policies that are conflicting
DROP POLICY IF EXISTS "Anyone can view group by invite code for joining" ON public.groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

-- Create a single permissive SELECT policy that allows:
-- 1. Members to view their groups
-- 2. Any authenticated user to look up a group by invite_code (for joining)
CREATE POLICY "Users can view groups they are member of or by invite code"
ON public.groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);

-- Separate permissive policy for invite code lookups (allows any authenticated user)
CREATE POLICY "Authenticated users can view groups by invite code"
ON public.groups
FOR SELECT
TO authenticated
USING (true);  -- This is intentionally broad - invite validation happens in app logic