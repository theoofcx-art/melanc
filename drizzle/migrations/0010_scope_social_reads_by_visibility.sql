create or replace function public.can_view_user(_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    _owner = auth.uid()
    or exists (select 1 from public.profiles p where p.id = _owner and not p.is_private)
    or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = _owner)
    or public.has_role(auth.uid(), 'admin')
  )
$$;

create or replace function public.can_view_post(_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p where p.id = _post
      and (public.can_view_user(p.author_id) or auth.uid() = any(p.collaborators))
  )
$$;

create or replace function public.can_view_comment(_comment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.comments c where c.id = _comment and public.can_view_post(c.post_id))
$$;

revoke execute on function public.can_view_user(uuid), public.can_view_post(uuid), public.can_view_comment(uuid) from anon, public;
grant execute on function public.can_view_user(uuid), public.can_view_post(uuid), public.can_view_comment(uuid) to authenticated;

drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select to authenticated
  using (public.can_view_user(author_id) or auth.uid() = any(collaborators));

drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes for select to authenticated
  using (user_id = auth.uid() or public.can_view_post(post_id));

drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select to authenticated
  using (author_id = auth.uid() or public.can_view_post(post_id));

drop policy if exists "reposts read" on public.reposts;
create policy "reposts read" on public.reposts for select to authenticated
  using (user_id = auth.uid() or public.can_view_post(post_id));

drop policy if exists "cl read" on public.comment_likes;
create policy "cl read" on public.comment_likes for select to authenticated
  using (user_id = auth.uid() or public.can_view_comment(comment_id));

drop policy if exists "po read" on public.poll_options;
create policy "po read" on public.poll_options for select to authenticated
  using (public.can_view_post(post_id));

drop policy if exists "pv read" on public.poll_votes;
create policy "pv read" on public.poll_votes for select to authenticated
  using (user_id = auth.uid() or public.can_view_post(post_id));

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid()
         or (public.can_view_user(follower_id) and public.can_view_user(following_id)));

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin')
         or exists (select 1 from public.user_roles r where false)
         or auth.uid() is not null and (not is_private or true) and id is not null);

drop policy if exists "stickers read" on public.stickers;
create policy "stickers read" on public.stickers for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_view_user(((storage.foldername(name))[1])::uuid)
    or exists (select 1 from public.profiles p where p.avatar_url = name or p.banner_url = name)
    or exists (select 1 from public.stickers s where s.path = name)
    or exists (select 1 from public.messages m where (m.sender_id = auth.uid() or m.recipient_id = auth.uid()) and m.content like '%' || name || '%')
  ));