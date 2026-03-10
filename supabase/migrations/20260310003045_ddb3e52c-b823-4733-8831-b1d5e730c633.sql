DROP POLICY "Users can view photos" ON storage.objects;

CREATE POLICY "Users can view photos" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'checkin-photos'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM checkins c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE gm.user_id = auth.uid()
        AND (
          c.photo_url LIKE '%' || objects.name
          OR c.selfie_url LIKE '%' || objects.name
        )
    )
  )
);