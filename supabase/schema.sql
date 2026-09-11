-- About This Much — database schema
-- Run this once in Supabase: Project > SQL Editor > New query > paste this whole file > Run.

-- Extra profile fields beyond what Supabase Auth already stores (email, id, etc).
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  target_group text check (target_group in ('women', 'men')) default 'women',
  breakfast_time time default '08:00',
  lunch_time time default '12:30',
  dinner_time time default '18:30',
  water_target_oz numeric default 73,
  sugar_target_g numeric default 25,
  fiber_target_g numeric default 25,
  newsletter_optin boolean default false,
  created_at timestamp with time zone default now()
);

-- Every single log entry, raw and timestamped — never just daily totals.
-- This is what makes lifetime stats, streaks, and future gamification possible later.
create table if not exists logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tracker text check (tracker in ('water', 'sugar', 'fiber', 'protein', 'movement', 'artificial_sweetener', 'meal_source')) not null,
  category text,
  item_name text,
  unit text,
  quantity numeric default 1,
  water_oz numeric default 0,        -- for dual-routing beverages (soda logs here too)
  sugar_g numeric default 0,         -- for dual-routing (dried fruit, sweetened drinks)
  fiber_g numeric default 0,
  protein_g numeric default 0,
  movement_tier text check (movement_tier in ('none','light','moderate','vigorous')),
  meal_source text check (meal_source in ('home_cooked','eaten_out')),
  logged_at timestamp with time zone default now(),
  log_date date default current_date  -- convenience column for fast daily/weekly queries
);

-- A user's saved personal quick-adds (up to 3 per tracker, enforced in the app, not the DB).
create table if not exists saved_quick_adds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tracker text not null,
  label text not null,
  water_oz numeric default 0,
  sugar_g numeric default 0,
  fiber_g numeric default 0,
  protein_g numeric default 0,
  created_at timestamp with time zone default now()
);

-- Row Level Security: every user can only ever see and write their own data.
alter table profiles enable row level security;
alter table logs enable row level security;
alter table saved_quick_adds enable row level security;

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users manage their own logs" on logs
  for all using (auth.uid() = user_id);

create policy "Users manage their own quick-adds" on saved_quick_adds
  for all using (auth.uid() = user_id);
