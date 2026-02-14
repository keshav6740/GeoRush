-- GeoRush duel backend schema
create table if not exists public.duel_rooms (
  id text primary key,
  code text not null unique,
  series_id text not null,
  series_match_number integer not null default 1,
  expires_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists duel_rooms_series_id_idx on public.duel_rooms(series_id);
create index if not exists duel_rooms_expires_at_idx on public.duel_rooms(expires_at);

create or replace function public.set_duel_rooms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_duel_rooms_updated_at on public.duel_rooms;
create trigger trg_duel_rooms_updated_at
before update on public.duel_rooms
for each row execute function public.set_duel_rooms_updated_at();

alter table public.duel_rooms enable row level security;

-- If you use SUPABASE_SERVICE_ROLE_KEY on server, these policies are optional.
-- Keep them permissive so anon server key fallback still works.
drop policy if exists "duel_rooms_public_read" on public.duel_rooms;
create policy "duel_rooms_public_read"
  on public.duel_rooms
  for select
  using (true);

drop policy if exists "duel_rooms_public_insert" on public.duel_rooms;
create policy "duel_rooms_public_insert"
  on public.duel_rooms
  for insert
  with check (true);

drop policy if exists "duel_rooms_public_update" on public.duel_rooms;
create policy "duel_rooms_public_update"
  on public.duel_rooms
  for update
  using (true)
  with check (true);

drop policy if exists "duel_rooms_public_delete" on public.duel_rooms;
create policy "duel_rooms_public_delete"
  on public.duel_rooms
  for delete
  using (true);
