alter table public.profiles add column if not exists badge text;
alter table public.posts add column if not exists sticker text;

create or replace function public.protect_badge()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.badge is not null and new.badge not in ('vampiro','pomba','folha','olhos') then new.badge := old.badge; end if;
  return new;
end $$;
drop trigger if exists protect_badge on public.profiles;
create trigger protect_badge before update on public.profiles for each row execute function public.protect_badge();

create or replace function public.protect_frame()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare need int; fol int;
begin
  if new.frame is distinct from old.frame and new.frame is not null then
    if new.frame in ('natal','melancia','estrelas') then return new; end if;
    if exists (select 1 from public.user_frames where user_id = new.id and frame = new.frame) then return new; end if;
    need := case new.frame when 'nuvem' then 10 when 'neon' then 20 when 'cereja' then 30 when 'laco' then 40 when 'ursinho' then 50 when 'estrela_azul' then 60 else null end;
    select count(*) into fol from public.follows where following_id = new.id;
    if need is null or fol < need then new.frame := old.frame; end if;
  end if;
  return new;
end $$;

create or replace function public.invite_collabs(_post_id uuid, _usernames text[])
returns int language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); n int := 0; uid uuid;
begin
  if me is null or not exists (select 1 from public.posts where id = _post_id and author_id = me) then raise exception 'Forbidden'; end if;
  for uid in select id from public.profiles where username = any(select lower(trim(leading '@' from u)) from unnest(_usernames) u) and id <> me limit 5 loop
    insert into public.collab_invites(post_id, user_id) values (_post_id, uid) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.invite_collabs(uuid, text[]) to authenticated;

create or replace function public.notify_mentions()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare actor uuid; pid uuid; uid uuid;
begin
  if tg_table_name = 'posts' then actor := new.author_id; pid := new.id; else actor := new.author_id; pid := new.post_id; end if;
  for uid in select distinct p.id from public.profiles p
    where p.username in (select lower(m[1]) from regexp_matches(coalesce(new.content,''), '@([a-zA-Z0-9_.]+)', 'g') m) and p.id <> actor limit 10 loop
    insert into public.notifications(user_id, actor_id, kind, post_id) values (uid, actor, 'mention', pid);
  end loop;
  return new;
end $$;
drop trigger if exists posts_mentions on public.posts;
create trigger posts_mentions after insert on public.posts for each row execute function public.notify_mentions();
drop trigger if exists comments_mentions on public.comments;
create trigger comments_mentions after insert on public.comments for each row execute function public.notify_mentions();