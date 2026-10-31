ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS filter text,
  ADD COLUMN IF NOT EXISTS collaborators uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
CREATE INDEX IF NOT EXISTS posts_collaborators_idx ON public.posts USING gin (collaborators);

CREATE OR REPLACE FUNCTION public.protect_post_boost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.boosted_until IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND current_user <> 'service_role' AND auth.uid() IS NOT NULL THEN
    NEW.boosted_until := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_post_boost ON public.posts;
CREATE TRIGGER protect_post_boost BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.protect_post_boost();