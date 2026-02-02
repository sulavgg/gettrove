-- ==============================================
-- FIX 1: STORAGE - Make checkin-photos bucket private
-- ==============================================

-- Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'checkin-photos';

-- Drop overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view checkin photos" ON storage.objects;

-- Create restrictive storage policy - only group members can view photos
DROP POLICY IF EXISTS "Group members can view checkin photos" ON storage.objects;
CREATE POLICY "Group members can view checkin photos" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'checkin-photos' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.checkins c 
    JOIN public.group_members gm ON gm.group_id = c.group_id 
    WHERE c.photo_url LIKE '%' || storage.objects.name 
    AND gm.user_id = auth.uid()
  )
);

-- ==============================================
-- FIX 2: GROUPS TABLE - Restrict access to members only + RPC for invite lookup
-- ==============================================

-- Drop all existing SELECT policies on groups
DROP POLICY IF EXISTS "Authenticated users can view groups by invite code" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are member of or by invite code" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups by invite code" ON public.groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

-- Create restrictive policy - only members can view their groups
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

-- Create an RPC function for invite code lookups
-- This allows users to look up group info by invite code without exposing all groups
CREATE OR REPLACE FUNCTION public.lookup_group_by_invite_code(code text)
RETURNS TABLE (
  id uuid,
  name text,
  habit_type habit_type,
  custom_habit text,
  invites_enabled boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT g.id, g.name, g.habit_type, g.custom_habit, g.invites_enabled
  FROM groups g
  WHERE g.invite_code = UPPER(code)
  AND g.invites_enabled = true;
END;
$$;

-- ==============================================
-- FIX 3: PROFILES TABLE - Hide email from other users
-- ==============================================

-- Create a view that excludes sensitive fields for public profile viewing
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;

-- Drop overly permissive profile policies
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own and group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create restrictive policy - users can only fully view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Grant select on the view to authenticated users (for viewing other members' basic info)
GRANT SELECT ON public.profiles_public TO authenticated;