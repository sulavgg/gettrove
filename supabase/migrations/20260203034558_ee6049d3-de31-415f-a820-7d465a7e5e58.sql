-- Fix 1: profiles table - Add policy to require authentication for viewing
-- (Currently only has "Users can view own profile" but nothing preventing unauthenticated access)
CREATE POLICY "Require authentication for profile access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view their own profile
  auth.uid() = user_id
  OR
  -- OR users who share a group with them (for showing member names/photos in groups)
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    INNER JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = profiles.user_id
  )
);

-- Drop the old overly restrictive policy (users couldn't see group members' profiles)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Fix 2: badges table - Replace permissive "Anyone can view badges" with group-scoped policy
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;

CREATE POLICY "Group members can view badges"
ON public.badges
FOR SELECT
TO authenticated
USING (
  -- Badges with a group_id: only visible to group members
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = badges.group_id
    AND group_members.user_id = auth.uid()
  ))
  OR
  -- Badges without a group_id (global badges): visible to the owner
  (group_id IS NULL AND user_id = auth.uid())
);

-- Fix 3: profiles_public view - Recreate with security_invoker to inherit RLS from base table
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;