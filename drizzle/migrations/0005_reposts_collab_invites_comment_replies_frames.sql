-- Comments: replies, pin, likes
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists pinned boolean not null default false;
grant update on public.comments to authenticated;
create policy "post owner pins comment" on public.comments for update to authenticated
  using (exists (select 1 from public.posts p where p.id = comments.post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = comments.post_id and p.author_id = auth.uid()));
create or replace function public.protect_comment_update() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  new.content := old.content; new.sticker := old.sticker; new.author_id := old.author_id; new.post_id := old.post_id; new.parent_id := old.parent_id; new.created_at := old.created_at;
  return new;
end $$;
create trigger protect_comment_update before update on public.comments for each row execute function public.protect_comment_update();

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
grant select, insert, delete on public.comment_likes to authenticated;
grant all on public.comment_likes to service_role;
alter table public.comment_likes enable row level security;
create policy "cl read" on public.comment_likes for select to authenticated using (auth.uid() is not null);
create policy "cl own add" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "cl own del" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- Reposts
create table public.reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
grant select, insert, delete on public.reposts to authenticated;
grant all on public.reposts to service_role;
alter table public.reposts enable row level security;
create policy "reposts read" on public.reposts for select to authenticated using (auth.uid() is not null);
create policy "own repost" on public.reposts for insert to authenticated with check (user_id = auth.uid());
create policy "own unrepost" on public.reposts for delete to authenticated using (user_id = auth.uid());

-- Collab invites
create table public.collab_invites (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
grant select, insert, update, delete on public.collab_invites to authenticated;
grant all on public.collab_invites to service_role;
alter table public.collab_invites enable row level security;
create policy "ci read" on public.collab_invites for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "ci author invites" on public.collab_invites for insert to authenticated
  with check (status = 'pending' and user_id <> auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    and (select count(*) from public.collab_invites c where c.post_id = collab_invites.post_id) < 5);
create policy "ci invitee answers" on public.collab_invites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('accepted','declined'));
create policy "ci delete" on public.collab_invites for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create or replace function public.apply_collab_invite() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, actor_id, kind, post_id) values (new.user_id, owner, 'collab_invite', new.post_id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    update public.posts set collaborators = array_append(array_remove(collaborators, new.user_id), new.user_id) where id = new.post_id;
    insert into public.notifications(user_id, actor_id, kind, post_id) values (owner, new.user_id, 'collab_accepted', new.post_id);
  elsif new.status = 'declined' then
    update public.posts set collaborators = array_remove(collaborators, new.user_id) where id = new.post_id;
  end if;
  return new;
end $$;
create trigger collab_invites_apply after insert or update on public.collab_invites for each row execute function public.apply_collab_invite();

create or replace function public.remove_collab_on_delete() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin update public.posts set collaborators = array_remove(collaborators, old.user_id) where id = old.post_id; return old; end $$;
create trigger collab_invites_remove after delete on public.collab_invites for each row execute function public.remove_collab_on_delete();

-- Collaborators only come from accepted invites
create or replace function public.protect_post_collabs() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is not null and current_user <> 'service_role' then new.collaborators := '{}'; end if;
  return new;
end $$;
create trigger protect_post_collabs before insert on public.posts for each row execute function public.protect_post_collabs();

-- Referrals that work for Google sign-ups and invites opened in another browser
create table public.referrals (
  invitee_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "own referral" on public.referrals for select to authenticated using (invitee_id = auth.uid() or referrer_id = auth.uid());

create or replace function public.claim_referral(_ref text) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); referrer uuid; joined timestamptz;
begin
  if me is null then return false; end if;
  if exists (select 1 from public.referrals where invitee_id = me) then return false; end if;
  select created_at into joined from public.profiles where id = me;
  if joined < now() - interval '7 days' then return false; end if;
  select id into referrer from public.profiles where username = lower(trim(leading '@' from _ref)) and id <> me;
  if referrer is null then return false; end if;
  insert into public.referrals(invitee_id, referrer_id) values (me, referrer);
  insert into public.user_frames(user_id, frame) values (referrer, 'nyan'), (me, 'nyan') on conflict do nothing;
  return true;
end $$;
revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

-- Frames: free ones, and "nuvem" with 10 followers
create or replace function public.protect_frame() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.frame is distinct from old.frame and new.frame is not null and new.frame not in ('natal','melancia')
     and not exists (select 1 from public.user_frames where user_id = new.id and frame = new.frame)
     and not (new.frame = 'nuvem' and (select count(*) from public.follows where following_id = new.id) >= 10) then
    new.frame := old.frame;
  end if;
  return new;
end $$;