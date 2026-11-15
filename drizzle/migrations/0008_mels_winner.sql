ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mels_winner boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS like_color text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_bg text;

CREATE OR REPLACE FUNCTION public.protect_mels_winner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.is_mels_winner is distinct from old.is_mels_winner and auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.is_mels_winner := old.is_mels_winner;
  end if;
  if not new.is_mels_winner then new.like_color := null; new.profile_bg := null; end if;
  if new.like_color is not null and new.like_color !~ '^#[0-9a-fA-F]{6}$' then new.like_color := old.like_color; end if;
  if new.profile_bg is not null and new.profile_bg !~ '^#[0-9a-fA-F]{6}$' then new.profile_bg := old.profile_bg; end if;
  if new.frame in ('mels_onda','mels_dragao') and not new.is_mels_winner then new.frame := null; end if;
  return new;
end $$;
CREATE TRIGGER protect_mels_winner BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_mels_winner();

CREATE OR REPLACE FUNCTION public.protect_frame()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare need int; fol int;
begin
  if new.frame is distinct from old.frame and new.frame is not null then
    if new.frame in ('natal','melancia','estrelas') then return new; end if;
    if new.frame in ('mels_onda','mels_dragao') and new.is_mels_winner then return new; end if;
    if exists (select 1 from public.user_frames where user_id = new.id and frame = new.frame) then return new; end if;
    need := case new.frame when 'nuvem' then 10 when 'neon' then 20 when 'cereja' then 30 when 'laco' then 40 when 'ursinho' then 50 when 'estrela_azul' then 60 else null end;
    select count(*) into fol from public.follows where following_id = new.id;
    if need is null or fol < need then new.frame := old.frame; end if;
  end if;
  return new;
end $function$;