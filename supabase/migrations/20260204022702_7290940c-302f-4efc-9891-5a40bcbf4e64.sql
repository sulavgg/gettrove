-- Fix: Allow group creators to see their groups immediately after creation
-- The current SELECT policy only allows members, but creator isn't a member yet during INSERT...SELECT

DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

CREATE POLICY "Members and creators can view their groups"
ON public.groups
FOR SELECT
USING (
  created_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);