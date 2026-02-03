-- profiles_public is a VIEW, not a table, so we need to ensure RLS works properly
-- The view was created with security_invoker=on, which means it inherits RLS from the base table
-- However, the scanner is detecting it as unprotected, so let's verify and fix

-- First, let's make sure the view doesn't have any issues by recreating it properly
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

-- Grant appropriate permissions to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;