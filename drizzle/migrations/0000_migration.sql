
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  bio text default '',
  pronouns text default '',
  link text default '',
  avatar_url text,
  banner_url text,
  is_private boolean not null default false,
  is_verified boolean not null default false,
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.protect_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified is distinct from old.is_verified and not public.has_role(auth.uid(),'admin') then
    new.is_verified := old.is_verified;
  end if;
  return new;
end; $$;
create trigger protect_verified before update on public.profiles for each row execute function public.protect_verified();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; uname text; i int := 0;
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
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.grant_admin_on_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'theoofcx@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_admin_on_confirm();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text',
  content text default '',
  media_urls text[] not null default '{}',
  media_types text[] not null default '{}',
  hashtags text[] not null default '{}',
  spotify_url text,
  created_at timestamptz not null default now()
);
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select using (true);
create policy "own posts insert" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "own or admin delete" on public.posts for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
grant select on public.likes to anon;
grant select, insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes readable" on public.likes for select using (true);
create policy "own like" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "own unlike" on public.likes for delete to authenticated using (user_id = auth.uid());

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text default '',
  sticker text,
  created_at timestamptz not null default now()
);
grant select on public.comments to anon;
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments readable" on public.comments for select using (true);
create policy "own comment" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "own or admin comment delete" on public.comments for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
grant select on public.follows to anon;
grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select using (true);
create policy "own follow" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "own unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text default '',
  sticker text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "dm read" on public.messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "dm send" on public.messages for insert to authenticated with check (sender_id = auth.uid());
create policy "dm delete own" on public.messages for delete to authenticated using (sender_id = auth.uid());
alter publication supabase_realtime add table public.messages;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifs" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifs update" on public.notifications for update to authenticated using (user_id = auth.uid());

create or replace function public.notify_like() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if; return new;
end; $$;
create trigger likes_notify after insert on public.likes for each row execute function public.notify_like();

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into public.notifications(user_id, actor_id, kind, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if; return new;
end; $$;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_follow() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id, actor_id, kind) values (new.following_id, new.follower_id, 'follow');
  return new;
end; $$;
create trigger follows_notify after insert on public.follows for each row execute function public.notify_follow();

create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media own upload" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
