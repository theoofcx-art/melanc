create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists likes_user_idx on public.likes (user_id);
create index if not exists comments_post_idx on public.comments (post_id);
create index if not exists comment_likes_user_idx on public.comment_likes (user_id);
create index if not exists reposts_user_idx on public.reposts (user_id);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id);
create index if not exists profiles_avatar_idx on public.profiles (avatar_url);
create index if not exists profiles_banner_idx on public.profiles (banner_url);
create index if not exists stickers_path_idx on public.stickers (path);

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.can_view_user(((storage.foldername(name))[1])::uuid)
    or exists (select 1 from public.profiles p where p.avatar_url = name)
    or exists (select 1 from public.profiles p where p.banner_url = name)
    or exists (select 1 from public.stickers s where s.path = name)
    or exists (select 1 from public.messages m where m.sender_id = ((storage.foldername(name))[1])::uuid and m.recipient_id = (select auth.uid()))
  ));