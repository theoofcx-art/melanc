ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_multi boolean NOT NULL DEFAULT false;
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po read" ON public.poll_options FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "po author add" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE TABLE public.poll_votes (
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv read" ON public.poll_votes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "pv own add" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.poll_options o WHERE o.id = option_id AND o.post_id = poll_votes.post_id));
CREATE POLICY "pv own del" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.single_poll_vote() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (SELECT poll_multi FROM public.posts WHERE id = NEW.post_id) THEN
    DELETE FROM public.poll_votes WHERE post_id = NEW.post_id AND user_id = NEW.user_id AND option_id <> NEW.option_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER poll_single_vote BEFORE INSERT ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION public.single_poll_vote();