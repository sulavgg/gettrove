
-- 1. Fix get_user_group_ids to use auth.uid() internally
CREATE OR REPLACE FUNCTION public.get_user_group_ids(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT group_id
  FROM public.group_members
  WHERE user_id = auth.uid()
$function$;

-- 2. Fix group_invites SELECT policy to restrict invited_identifier to creator
DROP POLICY IF EXISTS "Group members can view invites" ON public.group_invites;
CREATE POLICY "Invite creators can view full invites"
  ON public.group_invites FOR SELECT
  USING (auth.uid() = invited_by);

-- 3. Lock challenge_scores INSERT to service role only
DROP POLICY IF EXISTS "Users can insert own challenge scores" ON public.challenge_scores;
CREATE POLICY "Service role only inserts challenge scores"
  ON public.challenge_scores FOR INSERT
  WITH CHECK (false);

-- 4. Fix storage upload policies for checkin-photos
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Users can upload own checkin photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checkin-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Fix storage upload policies for voice-replies
DROP POLICY IF EXISTS "Authenticated users can upload voice replies" ON storage.objects;
CREATE POLICY "Users can upload own voice replies" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-replies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
