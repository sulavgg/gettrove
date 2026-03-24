-- Fix challenge_scores INSERT policy.
-- The previous migration set WITH CHECK (false), which blocks ALL inserts including
-- from the service role via edge functions. The service role bypasses RLS entirely,
-- so we just need to drop the blocking policy. User-initiated inserts remain blocked
-- by the absence of any permissive user policy.

DROP POLICY IF EXISTS "Service role only inserts challenge scores" ON public.challenge_scores;
DROP POLICY IF EXISTS "Users can insert own challenge scores" ON public.challenge_scores;

-- Allow authenticated users to read their own challenge scores
DROP POLICY IF EXISTS "Users can view own challenge scores" ON public.challenge_scores;
CREATE POLICY "Users can view own challenge scores"
  ON public.challenge_scores FOR SELECT
  USING (auth.uid() = user_id);
