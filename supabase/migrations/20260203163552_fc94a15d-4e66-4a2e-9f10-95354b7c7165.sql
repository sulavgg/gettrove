-- profiles_public is a VIEW – cannot enable RLS on it directly.
-- Secure it by revoking access from anon/public and recreating with security_invoker

-- First revoke all access from anon and public roles
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- Drop and recreate the view with security_invoker enabled
-- This makes the view inherit the RLS of the underlying profiles table
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;

-- Grant access only to authenticated users
-- The view will inherit the profiles table RLS (owner-only access)
-- For cross-user profile access, use the SECURITY DEFINER functions:
--   get_group_member_profiles(p_group_id) and get_public_profile(p_user_id)
GRANT SELECT ON public.profiles_public TO authenticated;

-- Explicitly deny anon access
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;