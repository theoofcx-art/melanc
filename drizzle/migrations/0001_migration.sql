
create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.stickers to authenticated;
grant all on public.stickers to service_role;
alter table public.stickers enable row level security;
create policy "stickers read" on public.stickers for select to authenticated using (true);
create policy "own sticker add" on public.stickers for insert to authenticated with check (owner_id = auth.uid());
create policy "own sticker del" on public.stickers for delete to authenticated using (owner_id = auth.uid());
