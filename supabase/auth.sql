-- PahaadSaathi Authentication Schema
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Enable RLS on auth.users is handled by Supabase automatically

-- 2. Profiles table - extends auth.users with role and metadata
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  name text not null,
  email text,
  phone text,
  role text not null check (role in ('administrator', 'moderator', 'resident')),
  area text,
  created_at timestamptz default now()
);

-- 3. Moderators table - links users to moderator access
create table if not exists public.moderators (
  user_id uuid references public.profiles(id) not null primary key,
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.moderators enable row level security;

-- 5. RLS Policies for profiles
-- Users can read their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can insert profiles (used during sign up)
create policy "Service role can insert profiles"
  on public.profiles for insert
  with (check (true));

-- 6. RLS Policies for moderators
-- Users can read their own moderator record
create policy "Users can view their own moderator record"
  on public.moderators for select
  using (auth.uid() = user_id);

-- Service role can insert moderator records
create policy "Service role can insert moderator records"
  on public.moderators for insert
  with (check (true));

-- 7. Helper function to create profile on sign up (optional, can also be done client-side)
-- create or replace function public.handle_new_user()
-- returns trigger as $$
-- begin
--   insert into public.profiles (id, name, email, role, created_at)
--   values (
--     new.id,
--     new.raw_user_meta_data->>'name',
--     new.email,
--     new.raw_user_meta_data->>'role',
--     now()
--   );
--   return new;
-- end;
-- $$ language plpgsql security definer;

-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row
--   execute procedure public.handle_new_user();
