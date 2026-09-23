-- =====================================================
-- Pizarra Virtual — Supabase schema
-- Pegar en: SQL Editor (https://ltgejignmnljxjlhimyo.supabase.co)
-- =====================================================

create table if not exists public.whiteboard_state (
  id int primary key default 1,
  next_clear_at timestamptz not null default (now() + interval '5 minutes'),
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.whiteboard_state (id, next_clear_at)
values (1, now() + interval '5 minutes')
on conflict (id) do nothing;

create table if not exists public.whiteboard_strokes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  color text not null,
  width real not null,
  points jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists strokes_created_at_idx
  on public.whiteboard_strokes (created_at desc);

alter table public.whiteboard_strokes enable row level security;
alter table public.whiteboard_state enable row level security;

drop policy if exists "anon read strokes" on public.whiteboard_strokes;
create policy "anon read strokes"
  on public.whiteboard_strokes for select to anon using (true);

drop policy if exists "anon insert strokes" on public.whiteboard_strokes;
create policy "anon insert strokes"
  on public.whiteboard_strokes for insert to anon with check (true);

drop policy if exists "anon delete strokes" on public.whiteboard_strokes;
create policy "anon delete strokes"
  on public.whiteboard_strokes for delete to anon using (true);

drop policy if exists "anon read state" on public.whiteboard_state;
create policy "anon read state"
  on public.whiteboard_state for select to anon using (true);

drop policy if exists "anon update state" on public.whiteboard_state;
create policy "anon update state"
  on public.whiteboard_state for update to anon using (true) with check (true);