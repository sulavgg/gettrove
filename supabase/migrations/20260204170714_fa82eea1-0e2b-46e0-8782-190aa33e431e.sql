-- Drop the existing profiles_public view and recreate it securely
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view with security_invoker enabled
-- This makes the view respect the RLS policies of the underlying profiles table
CREATE VIEW public.profiles_public 
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  created_at
FROM public.profiles;

-- Revoke all access from anonymous users
REVOKE ALL ON public.profiles_public FROM anon;

-- Grant SELECT only to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;