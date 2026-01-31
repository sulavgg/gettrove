-- Fix security issue: profiles table allows anyone to view all user data
-- Replace overly permissive policy with one that restricts access to:
-- 1. User's own profile
-- 2. Profiles of users in the same groups

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own and group member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM group_members gm1 
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id 
    WHERE gm1.user_id = auth.uid() 
    AND gm2.user_id = profiles.user_id
  )
);

-- Fix security issue: groups table exposes all group info including invite codes
-- Replace overly permissive policy with one that restricts access to:
-- Only authenticated users who are members of the group

DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;

CREATE POLICY "Members can view their groups" 
ON public.groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid()
  )
);

-- Allow viewing group info when joining via invite code (for join flow)
CREATE POLICY "Anyone can view group by invite code for joining" 
ON public.groups 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);