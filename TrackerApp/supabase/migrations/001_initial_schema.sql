-- ============================================================
-- 001 – Initial schema
-- Run this in your Supabase SQL editor (or via supabase db push)
-- ============================================================

-- Profiles table (one row per auth user)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-level security
alter table public.profiles enable row level security;

-- Users can read any profile (for username uniqueness checks)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Users can only insert/update their own profile
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Future tables (uncomment when features are built)
-- ============================================================

-- create table if not exists public.daily_steps (
--   id         uuid primary key default gen_random_uuid(),
--   user_id    uuid not null references public.profiles(id) on delete cascade,
--   date       date not null,
--   count      int not null default 0,
--   goal       int not null default 10000,
--   created_at timestamptz not null default now(),
--   unique(user_id, date)
-- );

-- create table if not exists public.water_intake ( ... );
-- create table if not exists public.sleep_records ( ... );
-- create table if not exists public.calorie_records ( ... );
-- create table if not exists public.screen_time_records ( ... );
