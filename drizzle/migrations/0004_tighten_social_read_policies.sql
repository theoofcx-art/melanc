drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using (auth.uid() is not null);
drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes for select to authenticated using (auth.uid() is not null);
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (auth.uid() is not null);
drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select to authenticated using (auth.uid() is not null);

alter table public.posts add column if not exists view_count integer not null default 0;
update public.posts p set view_count = (select count(*) from public.post_views v where v.post_id = p.id);
create or replace function public.bump_view_count() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin update public.posts set view_count = view_count + 1 where id = new.post_id; return new; end $$;
drop trigger if exists post_views_count on public.post_views;
create trigger post_views_count after insert on public.post_views for each row execute function public.bump_view_count();
revoke execute on function public.bump_view_count() from public, anon, authenticated;

drop policy if exists "views readable" on public.post_views;
create policy "views readable" on public.post_views for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_views.post_id and p.author_id = auth.uid()));

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to authenticated using (bucket_id = 'media' and auth.uid() is not null);