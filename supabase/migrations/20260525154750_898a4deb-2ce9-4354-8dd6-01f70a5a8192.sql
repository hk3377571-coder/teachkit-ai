
DROP POLICY IF EXISTS "Users view lesson pdfs" ON storage.objects;
CREATE POLICY "Users view own lesson pdfs" ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
