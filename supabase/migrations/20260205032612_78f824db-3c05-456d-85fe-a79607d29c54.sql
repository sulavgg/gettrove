
-- Fix profiles table security: Ensure only authenticated users can access
-- The table already has RLS enabled with proper policies, but we need to:
-- 1. Revoke any access from anon role
-- 2. Make policies explicitly target authenticated role only

-- Revoke all permissions from anon role on profiles table
REVOKE ALL ON public.profiles FROM anon;

-- Drop existing policies to recreate with explicit role targeting
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate policies targeting authenticated role explicitly
CREATE POLICY "Users can only view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure authenticated users have proper grants
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
