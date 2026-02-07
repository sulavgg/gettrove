
-- Make voice-replies bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'voice-replies';

-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Anyone can read voice replies" ON storage.objects;

-- Create proper group-member-only read policy
CREATE POLICY "Group members can view voice replies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-replies'
  AND auth.uid() IS NOT NULL
  AND (
    -- User can view their own uploaded voice replies
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Group members can view voice replies in their groups
    EXISTS (
      SELECT 1
      FROM voice_replies vr
      JOIN checkins c ON c.id = vr.checkin_id
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE vr.audio_url = name
      AND gm.user_id = auth.uid()
    )
  )
);
