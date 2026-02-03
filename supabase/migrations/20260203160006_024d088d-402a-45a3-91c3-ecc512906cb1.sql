-- Fix security issues: email exposure and profiles_public protection

-- 1. Drop the existing profiles SELECT policy that exposes emails to group members
DROP POLICY IF EXISTS "Require authentication for profile access" ON public.profiles;

-- 2. Create a new restrictive policy: users can ONLY see their OWN profile from the base table
-- Group members should access other profiles through the profiles_public view
CREATE POLICY "Users can only view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 3. The profiles_public view already excludes email - we need to ensure authenticated users can access it
-- But ONLY through the view, and the base table's RLS will prevent direct email access
-- The view already has security_invoker=on and grants for authenticated

-- 4. Create a secure RLS policy approach for the view access
-- Since views with security_invoker inherit RLS from base table, and we just restricted base table to owner-only,
-- we need a different approach: create a security definer function to get public profile data

-- Create a function that safely returns public profile data for group members
CREATE OR REPLACE FUNCTION public.get_group_member_profiles(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  profile_photo_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.name, p.profile_photo_url, p.created_at
  FROM profiles p
  INNER JOIN group_members gm ON gm.user_id = p.user_id
  WHERE gm.group_id = p_group_id
    AND EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = p_group_id 
      AND gm2.user_id = auth.uid()
    );
$$;

-- Create a function to get a single user's public profile if they share a group
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  profile_photo_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.name, p.profile_photo_url, p.created_at
  FROM profiles p
  WHERE p.user_id = p_user_id
    AND (
      -- User can see their own profile
      p.user_id = auth.uid()
      OR 
      -- Or they share a group
      EXISTS (
        SELECT 1 FROM group_members gm1
        INNER JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = p.user_id
      )
    );
$$;

-- 5. Now update profiles_public view to work correctly for authenticated users only
-- Drop and recreate with proper security
DROP VIEW IF EXISTS public.profiles_public;

-- Create a secure view that only authenticated users can access
-- This view will be used for displaying member info without exposing email
CREATE VIEW public.profiles_public
WITH (security_invoker = off)
AS SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;

-- Grant access only to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- Create RLS-like protection using a wrapper function that's the recommended way to use
-- Note: Views don't have RLS directly, so we control access via grants and security_invoker setting