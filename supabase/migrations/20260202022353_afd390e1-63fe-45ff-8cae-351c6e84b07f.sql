-- Fix group_members SELECT policy: restrict to members of the same groups only
-- This prevents users from querying other users' group memberships across the platform

DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;

CREATE POLICY "Users can view memberships in their groups" 
ON public.group_members 
FOR SELECT 
USING (
  group_id IN (
    SELECT gm.group_id FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
  )
);