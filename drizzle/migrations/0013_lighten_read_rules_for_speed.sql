drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select to authenticated
  using (
    author_id = (select auth.uid())
    or (select auth.uid()) = any(collaborators)
    or author_id in (select p.id from public.profiles p where not p.is_private)
    or author_id in (select f.following_id from public.follows f where f.follower_id = (select auth.uid()))
    or (select public.has_role((select auth.uid()), 'admin'))
  );

drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "reposts read" on public.reposts;
create policy "reposts read" on public.reposts for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "cl read" on public.comment_likes;
create policy "cl read" on public.comment_likes for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "po read" on public.poll_options;
create policy "po read" on public.poll_options for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "pv read" on public.poll_votes;
create policy "pv read" on public.poll_votes for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using ((select auth.uid()) is not null);