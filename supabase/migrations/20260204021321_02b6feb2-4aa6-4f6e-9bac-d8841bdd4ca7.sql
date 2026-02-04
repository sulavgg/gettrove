-- Recreate profiles_public view with security_invoker to inherit base table RLS
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS
  SELECT 
    id,
    user_id,
    name,
    profile_photo_url,
    created_at
  FROM public.profiles;

-- Grant access to authenticated users only
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;