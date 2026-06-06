ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_plan jsonb,
  ADD COLUMN IF NOT EXISTS worksheet jsonb,
  ADD COLUMN IF NOT EXISTS quiz jsonb,
  ADD COLUMN IF NOT EXISTS answer_key jsonb;