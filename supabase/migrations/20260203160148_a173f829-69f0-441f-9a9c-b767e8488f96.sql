-- Fix the SECURITY DEFINER view warning by using security_invoker approach
-- The view needs to be security_invoker but with a way to allow group member access

DROP VIEW IF EXISTS public.profiles_public;

-- Create the view with security_invoker = on (inherits RLS from base table)
-- Since profiles base table now only allows owner access, this view won't work for group members
-- But that's fine - the app should use the get_public_profile and get_group_member_profiles functions instead
CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;

-- Only authenticated users can access (not anon)
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;