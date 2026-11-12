CREATE TABLE public.post_views (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT ALL ON public.post_views TO service_role;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views readable" ON public.post_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "own view" ON public.post_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_path text,
  media_type text NOT NULL DEFAULT 'text',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.statuses TO authenticated;
GRANT ALL ON public.statuses TO service_role;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status visible to author and followers" ON public.statuses FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = statuses.author_id));
CREATE POLICY "own status insert" ON public.statuses FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "own status delete" ON public.statuses FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.status_views (
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, user_id)
);
CREATE TABLE public.status_likes (
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.status_views, public.status_likes TO authenticated;
GRANT ALL ON public.status_views, public.status_likes TO service_role;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sv read" ON public.status_views FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_id AND s.author_id = auth.uid()));
CREATE POLICY "sv own" ON public.status_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sl read" ON public.status_likes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_id AND s.author_id = auth.uid()));
CREATE POLICY "sl own" ON public.status_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sl own del" ON public.status_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.profiles ADD COLUMN frame text;
CREATE TABLE public.user_frames (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frame text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, frame)
);
GRANT SELECT ON public.user_frames TO authenticated;
GRANT ALL ON public.user_frames TO service_role;
ALTER TABLE public.user_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own frames" ON public.user_frames FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protect_frame()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.frame is distinct from old.frame and new.frame is not null and new.frame <> 'natal'
     and not exists (select 1 from public.user_frames where user_id = new.id and frame = new.frame) then
    new.frame := old.frame;
  end if;
  return new;
end $$;
CREATE TRIGGER protect_frame BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_frame();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare base text; uname text; i int := 0; referrer uuid;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_.]', '', 'g'));
  if base = '' then base := 'user'; end if;
  uname := base;
  while exists(select 1 from public.profiles where username = uname) loop
    i := i + 1; uname := base || i::text;
  end loop;
  insert into public.profiles (id, username, display_name, bio, avatar_url)
  values (new.id, uname, coalesce(new.raw_user_meta_data->>'display_name', uname),
          coalesce(new.raw_user_meta_data->>'bio',''), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if new.email_confirmed_at is not null and lower(new.email) = 'theoofcx@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  if coalesce(new.raw_user_meta_data->>'ref','') <> '' then
    select id into referrer from public.profiles where username = lower(new.raw_user_meta_data->>'ref') and id <> new.id;
    if referrer is not null then
      insert into public.user_frames(user_id, frame) values (referrer, 'nyan'), (new.id, 'nyan') on conflict do nothing;
    end if;
  end if;
  return new;
end; $function$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;