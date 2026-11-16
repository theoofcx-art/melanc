UPDATE public.profiles SET frame = NULL WHERE frame = 'natal';
CREATE OR REPLACE FUNCTION public.protect_frame()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare need int; fol int; vneed int; vmax int;
begin
  if new.frame is distinct from old.frame and new.frame is not null then
    if new.frame in ('melancia','estrelas','luz','galaxia','katseye','ciano') then return new; end if;
    if new.frame in ('mels_onda','mels_dragao') and new.is_mels_winner then return new; end if;
    if exists (select 1 from public.user_frames where user_id = new.id and frame = new.frame) then return new; end if;
    vneed := case new.frame when 'patinho' then 60 when 'boia' then 150 else null end;
    if vneed is not null then
      select coalesce(max(view_count),0) into vmax from public.posts where author_id = new.id;
      if vmax < vneed then new.frame := old.frame; end if;
      return new;
    end if;
    need := case new.frame when 'nuvem' then 10 when 'neon' then 20 when 'cereja' then 30 when 'laco' then 40 when 'ursinho' then 50 when 'estrela_azul' then 60 when 'rosa' then 70 when 'folhas' then 80 when 'melodia' then 90 else null end;
    select count(*) into fol from public.follows where following_id = new.id;
    if need is null or fol < need then new.frame := old.frame; end if;
  end if;
  return new;
end $function$;