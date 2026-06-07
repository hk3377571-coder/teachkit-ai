
-- Make lessons publicly accessible (evaluation mode)
ALTER TABLE public.lessons ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users delete own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users insert own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users update own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users view own lessons" ON public.lessons;

CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public insert lessons" ON public.lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lessons" ON public.lessons FOR UPDATE USING (true);
CREATE POLICY "Public delete lessons" ON public.lessons FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO anon;

DROP POLICY IF EXISTS "Users delete own lesson content" ON public.lesson_content;
DROP POLICY IF EXISTS "Users insert own lesson content" ON public.lesson_content;
DROP POLICY IF EXISTS "Users update own lesson content" ON public.lesson_content;
DROP POLICY IF EXISTS "Users view own lesson content" ON public.lesson_content;

CREATE POLICY "Public read lesson content" ON public.lesson_content FOR SELECT USING (true);
CREATE POLICY "Public insert lesson content" ON public.lesson_content FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lesson content" ON public.lesson_content FOR UPDATE USING (true);
CREATE POLICY "Public delete lesson content" ON public.lesson_content FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_content TO anon;
