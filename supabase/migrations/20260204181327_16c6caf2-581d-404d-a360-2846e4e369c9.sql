-- Fix storage policy: Allow users to read their own uploaded photos
-- This fixes the "Object not found" error when creating signed URLs after upload

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Group members can view checkin photos" ON storage.objects;

-- Create a new policy that allows:
-- 1. Users to read their own uploaded photos (needed immediately after upload)
-- 2. Group members to view checkin photos (for viewing others' posts)
CREATE POLICY "Users can view photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'checkin-photos'
  AND auth.uid() IS NOT NULL
  AND (
    -- User can view their own uploaded photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Group members can view photos from their groups
    EXISTS (
      SELECT 1
      FROM checkins c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.photo_url LIKE '%' || name
      AND gm.user_id = auth.uid()
    )
  )
);