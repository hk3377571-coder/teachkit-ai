
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view lesson pdfs" ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-pdfs');

CREATE POLICY "Users upload own lesson pdfs" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own lesson pdfs" ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own lesson pdfs" ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
