-- ============================================================
-- Debt Command Center — Supabase Setup
-- Run this entire file in your Supabase SQL Editor once.
-- Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================


-- 1. USER DATA TABLE
-- Stores the entire app state as JSONB per user.
-- One row per user, upserted on every save.
-- ============================================================
create table if not exists user_data (
  user_id    uuid references auth.users not null primary key,
  state_json jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 2. ROW LEVEL SECURITY
-- Users can only read and write their own row.
-- ============================================================
alter table user_data enable row level security;

-- Drop policy first if re-running this script
drop policy if exists "Users can manage their own data" on user_data;

create policy "Users can manage their own data"
  on user_data
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3. AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on user_data;

create trigger set_updated_at
  before update on user_data
  for each row
  execute function update_updated_at_column();


-- 4. OPTIONAL: VERIFY SETUP
-- Run this after the above to confirm everything is correct.
-- ============================================================
-- select
--   tablename,
--   rowsecurity
-- from pg_tables
-- where tablename = 'user_data';
--
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename = 'user_data';


-- ============================================================
-- AUTH SETTINGS (configure in Supabase Dashboard, not SQL)
-- ============================================================
-- Dashboard → Authentication → Settings:
--   • Confirm email: ON (recommended for production)
--   • Minimum password length: 8
--   • Enable email provider: ON
--
-- Dashboard → Authentication → URL Configuration:
--   • Site URL: your production domain (e.g. https://debtcommand.app)
--   • Redirect URLs: same domain + http://localhost:5173 for local dev
--
-- .env.local (never commit this file):
--   VITE_SUPABASE_URL=https://your-project-id.supabase.co
--   VITE_SUPABASE_ANON_KEY=your-anon-key
-- ============================================================
