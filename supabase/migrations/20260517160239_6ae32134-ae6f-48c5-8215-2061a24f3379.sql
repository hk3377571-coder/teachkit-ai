
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration TEXT NOT NULL,
  objectives TEXT,
  language TEXT NOT NULL DEFAULT 'English',
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lessons" ON public.lessons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lessons" ON public.lessons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lessons" ON public.lessons
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lessons" ON public.lessons
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_lessons_user ON public.lessons(user_id, created_at DESC);

-- Lesson content
CREATE TABLE public.lesson_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lesson content" ON public.lesson_content
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_content.lesson_id AND l.user_id = auth.uid()
  ));
CREATE POLICY "Users insert own lesson content" ON public.lesson_content
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_content.lesson_id AND l.user_id = auth.uid()
  ));
CREATE POLICY "Users update own lesson content" ON public.lesson_content
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_content.lesson_id AND l.user_id = auth.uid()
  ));
CREATE POLICY "Users delete own lesson content" ON public.lesson_content
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_content.lesson_id AND l.user_id = auth.uid()
  ));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
