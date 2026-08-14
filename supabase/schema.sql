-- =========================================================
-- FLOW — Focus Blocks Pomodoro App
-- Supabase schema: tables, indexes, RLS policies, triggers
-- Run this in the Supabase SQL Editor (or via `supabase db push`)
-- =========================================================

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. profiles
--    One row per auth user. Created automatically on signup.
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_focus_minutes int not null default 30,
  default_break_minutes int not null default 5,
  default_long_break_minutes int not null default 15,
  sessions_before_long_break int not null default 4,
  long_breaks_enabled boolean not null default true,
  time_passed_notify_enabled boolean not null default false,
  time_passed_notify_interval_minutes int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user preferences, keyed 1:1 to auth.users';

-- Safe to re-run against an existing database that predates these columns.
alter table public.profiles add column if not exists long_breaks_enabled boolean not null default true;
alter table public.profiles add column if not exists time_passed_notify_enabled boolean not null default false;
alter table public.profiles add column if not exists time_passed_notify_interval_minutes int not null default 30;

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2. focus_blocks
--    A "Focus Block" = a total time goal divided into cycles.
--    e.g. "Deep Work: Thesis", 180 min total, 30/5 ratio.
-- ---------------------------------------------------------
create table if not exists public.focus_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'General',        -- e.g. "Coding", "Studying", "Writing" — used for analytics grouping
  total_minutes int not null check (total_minutes > 0),
  focus_minutes int not null default 30 check (focus_minutes > 0),
  break_minutes int not null default 5 check (break_minutes >= 0),
  long_break_minutes int not null default 15 check (long_break_minutes >= 0),
  sessions_before_long_break int not null default 4 check (sessions_before_long_break > 0),
  strict_mode boolean not null default false,
  ambient_youtube_url text,
  ambient_volume int not null default 50 check (ambient_volume between 0 and 100),
  status text not null default 'planned'            -- 'planned' | 'active' | 'paused' | 'completed' | 'archived'
    check (status in ('planned', 'active', 'paused', 'completed', 'archived')),
  -- live timer state, persisted so it can be resumed from any device
  current_segment_index int not null default 0,
  elapsed_seconds_in_segment int not null default 0,
  last_started_at timestamptz,                      -- null when paused/not running
  completed_minutes int not null default 0,
  -- 0-based position in the user's "queue" of blocks to run back-to-back; null when not queued.
  queue_position int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run against an existing database that predates these columns.
alter table public.focus_blocks add column if not exists queue_position int;
alter table public.focus_blocks add column if not exists ambient_youtube_url text;
alter table public.focus_blocks add column if not exists ambient_volume int not null default 50 check (ambient_volume between 0 and 100);

create index if not exists idx_focus_blocks_user_id on public.focus_blocks (user_id);
create index if not exists idx_focus_blocks_status on public.focus_blocks (user_id, status);
create index if not exists idx_focus_blocks_queue on public.focus_blocks (user_id, queue_position) where queue_position is not null;

comment on table public.focus_blocks is 'A user-defined time block split into focus/break cycles';

-- ---------------------------------------------------------
-- 3. block_segments
--    The generated timeline for a block: an ordered list of
--    ('focus' | 'break' | 'long_break') segments with durations.
--    Materialized so edits mid-session don't reshuffle history,
--    and so the exact timeline can be rendered identically
--    across devices.
-- ---------------------------------------------------------
create table if not exists public.block_segments (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.focus_blocks (id) on delete cascade,
  position int not null,                              -- 0-based order within the block
  kind text not null check (kind in ('focus', 'break', 'long_break')),
  duration_minutes int not null check (duration_minutes > 0),
  is_completed boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  unique (block_id, position)
);

create index if not exists idx_block_segments_block_id on public.block_segments (block_id);

-- ---------------------------------------------------------
-- 4. tasks
--    Goals/tasks attached to a focus block. Supports rollover
--    to a future block via `rolled_over_from`.
-- ---------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.focus_blocks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position int not null default 0,
  rolled_over_from uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_block_id on public.tasks (block_id);
create index if not exists idx_tasks_user_id on public.tasks (user_id);

-- ---------------------------------------------------------
-- 5. focus_sessions
--    Append-only log of completed segments, used for analytics
--    (weekly hours by block/category chart).
-- ---------------------------------------------------------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id uuid references public.focus_blocks (id) on delete set null,
  block_name text not null,          -- denormalized so history survives block deletion
  category text not null default 'General',
  kind text not null check (kind in ('focus', 'break', 'long_break')),
  duration_minutes int not null check (duration_minutes > 0),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_focus_sessions_user_id on public.focus_sessions (user_id, occurred_at desc);

-- ---------------------------------------------------------
-- 6. categories
--    User-defined focus block categories, in addition to the
--    built-in common ones offered client-side.
-- ---------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_categories_user_id on public.categories (user_id);

-- ---------------------------------------------------------
-- 7. ambient_links
--    User-saved YouTube/YouTube Music links for ambient audio,
--    so a block's "Background Audio" link can be picked from a
--    list instead of pasted every time.
-- ---------------------------------------------------------
create table if not exists public.ambient_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists idx_ambient_links_user_id on public.ambient_links (user_id);

-- ---------------------------------------------------------
-- 8. hidden_categories
--    Built-in categories (COMMON_CATEGORIES, hardcoded client-side)
--    that a user has "deleted" — since they're not DB rows, deleting
--    one just remembers to hide it from that user's pickers.
-- ---------------------------------------------------------
create table if not exists public.hidden_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_hidden_categories_user_id on public.hidden_categories (user_id);

-- ---------------------------------------------------------
-- 9. queue_items
--    A user's "run these blocks back-to-back" queue: an ordered list
--    mixing block references and manually-inserted breaks. Replaces
--    the older focus_blocks.queue_position approach (left in place,
--    unused) — mutations always replace the whole ordered list rather
--    than patching individual rows, so no update policy is needed.
-- ---------------------------------------------------------
create table if not exists public.queue_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('block', 'break')),
  block_id uuid references public.focus_blocks (id) on delete cascade,
  break_minutes int check (break_minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_queue_items_user_id on public.queue_items (user_id, position);

-- ---------------------------------------------------------
-- updated_at auto-touch trigger (generic, reused by tables that have the column)
-- ---------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_focus_blocks on public.focus_blocks;
create trigger touch_focus_blocks before update on public.focus_blocks
  for each row execute procedure public.touch_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- Every table is scoped strictly to auth.uid() = user_id
-- (or, for block_segments, to the parent block's owner).
-- =========================================================

alter table public.profiles enable row level security;
alter table public.focus_blocks enable row level security;
alter table public.block_segments enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.ambient_links enable row level security;
alter table public.hidden_categories enable row level security;
alter table public.queue_items enable row level security;

-- Policies have no `IF NOT EXISTS` / `CREATE OR REPLACE` in Postgres, so each
-- is preceded by a `DROP POLICY IF EXISTS` — same re-run-safe spirit as the
-- `DROP TRIGGER IF EXISTS` pattern used above.

-- profiles: a user can only read/update their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- focus_blocks: full CRUD, own rows only
drop policy if exists "focus_blocks_select_own" on public.focus_blocks;
create policy "focus_blocks_select_own" on public.focus_blocks
  for select using (auth.uid() = user_id);

drop policy if exists "focus_blocks_insert_own" on public.focus_blocks;
create policy "focus_blocks_insert_own" on public.focus_blocks
  for insert with check (auth.uid() = user_id);

drop policy if exists "focus_blocks_update_own" on public.focus_blocks;
create policy "focus_blocks_update_own" on public.focus_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "focus_blocks_delete_own" on public.focus_blocks;
create policy "focus_blocks_delete_own" on public.focus_blocks
  for delete using (auth.uid() = user_id);

-- block_segments: scoped through the parent block's ownership
drop policy if exists "block_segments_select_own" on public.block_segments;
create policy "block_segments_select_own" on public.block_segments
  for select using (
    exists (select 1 from public.focus_blocks b where b.id = block_id and b.user_id = auth.uid())
  );

drop policy if exists "block_segments_insert_own" on public.block_segments;
create policy "block_segments_insert_own" on public.block_segments
  for insert with check (
    exists (select 1 from public.focus_blocks b where b.id = block_id and b.user_id = auth.uid())
  );

drop policy if exists "block_segments_update_own" on public.block_segments;
create policy "block_segments_update_own" on public.block_segments
  for update using (
    exists (select 1 from public.focus_blocks b where b.id = block_id and b.user_id = auth.uid())
  );

drop policy if exists "block_segments_delete_own" on public.block_segments;
create policy "block_segments_delete_own" on public.block_segments
  for delete using (
    exists (select 1 from public.focus_blocks b where b.id = block_id and b.user_id = auth.uid())
  );

-- tasks: full CRUD, own rows only
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- focus_sessions: insert + select own only (append-only log, no update/delete by design)
drop policy if exists "focus_sessions_select_own" on public.focus_sessions;
create policy "focus_sessions_select_own" on public.focus_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "focus_sessions_insert_own" on public.focus_sessions;
create policy "focus_sessions_insert_own" on public.focus_sessions
  for insert with check (auth.uid() = user_id);

-- categories: full CRUD, own rows only
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ambient_links: select/insert/delete own rows only (no rename support)
drop policy if exists "ambient_links_select_own" on public.ambient_links;
create policy "ambient_links_select_own" on public.ambient_links
  for select using (auth.uid() = user_id);

drop policy if exists "ambient_links_insert_own" on public.ambient_links;
create policy "ambient_links_insert_own" on public.ambient_links
  for insert with check (auth.uid() = user_id);

drop policy if exists "ambient_links_delete_own" on public.ambient_links;
create policy "ambient_links_delete_own" on public.ambient_links
  for delete using (auth.uid() = user_id);

-- hidden_categories: select/insert/delete own rows only
drop policy if exists "hidden_categories_select_own" on public.hidden_categories;
create policy "hidden_categories_select_own" on public.hidden_categories
  for select using (auth.uid() = user_id);

drop policy if exists "hidden_categories_insert_own" on public.hidden_categories;
create policy "hidden_categories_insert_own" on public.hidden_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "hidden_categories_delete_own" on public.hidden_categories;
create policy "hidden_categories_delete_own" on public.hidden_categories
  for delete using (auth.uid() = user_id);

-- queue_items: select/insert/delete own rows only (always replaced as a whole list)
drop policy if exists "queue_items_select_own" on public.queue_items;
create policy "queue_items_select_own" on public.queue_items
  for select using (auth.uid() = user_id);

drop policy if exists "queue_items_insert_own" on public.queue_items;
create policy "queue_items_insert_own" on public.queue_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "queue_items_delete_own" on public.queue_items;
create policy "queue_items_delete_own" on public.queue_items
  for delete using (auth.uid() = user_id);

-- =========================================================
-- Realtime (optional but recommended for cross-device sync)
-- Enable these in Database > Replication, or via SQL:
-- =========================================================
-- `ALTER PUBLICATION ... ADD TABLE` has no `IF NOT EXISTS` guard either, and
-- errors if the table's already a member — so check pg_publication_tables first.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'focus_blocks'
  ) then
    alter publication supabase_realtime add table public.focus_blocks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'block_segments'
  ) then
    alter publication supabase_realtime add table public.block_segments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
