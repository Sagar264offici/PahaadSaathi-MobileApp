-- ============================================================
-- PahaadSaathi — Complete Database Schema
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- Project: https://ffateqhpdyotsypahapf.supabase.co
-- ============================================================

-- ============================================================
-- SECTION 1: PROFILES & ROLES
-- ============================================================

create table if not exists public.profiles (
  id          uuid references auth.users not null primary key,
  name        text not null,
  email       text,
  phone       text,
  role        text not null check (role in ('administrator', 'moderator', 'resident')),
  area        text,
  created_at  timestamptz default now()
);

create table if not exists public.moderators (
  user_id     uuid references public.profiles(id) not null primary key,
  created_at  timestamptz default now()
);

alter table public.profiles   enable row level security;
alter table public.moderators enable row level security;

-- profiles RLS
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Service role can insert profiles" on public.profiles;
create policy "Service role can insert profiles"
  on public.profiles for insert with check (true);

-- moderators RLS
drop policy if exists "Users can view their own moderator record" on public.moderators;
create policy "Users can view their own moderator record"
  on public.moderators for select using (auth.uid() = user_id);

drop policy if exists "Service role can insert moderator records" on public.moderators;
create policy "Service role can insert moderator records"
  on public.moderators for insert with check (true);

-- ============================================================
-- SECTION 2: HAZARD INCIDENTS
-- ============================================================

create table if not exists public.hazards (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references public.profiles(id),
  type            text not null,
  severity        text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status          text not null default 'reported'
                    check (status in ('reported', 'corroborated', 'verified', 'resolved', 'dismissed')),
  lat             double precision not null,
  lng             double precision not null,
  description     text,
  photo_url       text,
  corroboration_count int not null default 0,
  area            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Corroborations (upvotes confirming a hazard)
create table if not exists public.hazard_corroborations (
  id          uuid primary key default gen_random_uuid(),
  hazard_id   uuid references public.hazards(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) not null,
  created_at  timestamptz default now(),
  unique (hazard_id, user_id)
);

alter table public.hazards               enable row level security;
alter table public.hazard_corroborations enable row level security;

-- hazards RLS
drop policy if exists "Anyone can view hazards" on public.hazards;
create policy "Anyone can view hazards"
  on public.hazards for select using (true);

drop policy if exists "Authenticated users can report hazards" on public.hazards;
create policy "Authenticated users can report hazards"
  on public.hazards for insert to authenticated with check (true);

drop policy if exists "Moderators can update hazard status" on public.hazards;
create policy "Moderators can update hazard status"
  on public.hazards for update using (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

-- corroborations RLS
drop policy if exists "Anyone can view corroborations" on public.hazard_corroborations;
create policy "Anyone can view corroborations"
  on public.hazard_corroborations for select using (true);

drop policy if exists "Authenticated users can corroborate" on public.hazard_corroborations;
create policy "Authenticated users can corroborate"
  on public.hazard_corroborations for insert to authenticated with check (auth.uid() = user_id);

-- Auto-increment corroboration_count on hazards
create or replace function public.increment_corroboration_count()
returns trigger language plpgsql security definer as $$
begin
  update public.hazards
  set corroboration_count = corroboration_count + 1,
      updated_at = now()
  where id = new.hazard_id;
  return new;
end;
$$;

drop trigger if exists on_corroboration_added on public.hazard_corroborations;
create trigger on_corroboration_added
  after insert on public.hazard_corroborations
  for each row execute procedure public.increment_corroboration_count();

-- ============================================================
-- SECTION 3: COMMUNITY POSTS & HELP EXCHANGE
-- ============================================================

create table if not exists public.community_posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id),
  community_id    text not null,  -- e.g. 'chamoli', 'rudraprayag'
  type            text not null check (type in ('update', 'help_request', 'resource', 'alert', 'general')),
  title           text,
  body            text not null,
  image_url       text,
  is_pinned       boolean not null default false,
  upvote_count    int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.help_requests (
  id              uuid primary key default gen_random_uuid(),
  requester_id    uuid references public.profiles(id),
  community_id    text not null,
  category        text not null check (category in ('medical', 'food', 'shelter', 'rescue', 'transport', 'other')),
  title           text not null,
  description     text,
  urgency         text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'cancelled')),
  responder_id    uuid references public.profiles(id),
  lat             double precision,
  lng             double precision,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.community_posts enable row level security;
alter table public.help_requests   enable row level security;

-- community_posts RLS
drop policy if exists "Anyone can view community posts" on public.community_posts;
create policy "Anyone can view community posts"
  on public.community_posts for select using (true);

drop policy if exists "Authenticated users can post" on public.community_posts;
create policy "Authenticated users can post"
  on public.community_posts for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "Authors can update their own posts" on public.community_posts;
create policy "Authors can update their own posts"
  on public.community_posts for update using (auth.uid() = author_id);

-- help_requests RLS
drop policy if exists "Anyone can view help requests" on public.help_requests;
create policy "Anyone can view help requests"
  on public.help_requests for select using (true);

drop policy if exists "Authenticated users can create help requests" on public.help_requests;
create policy "Authenticated users can create help requests"
  on public.help_requests for insert to authenticated with check (auth.uid() = requester_id);

drop policy if exists "Requester or responder can update" on public.help_requests;
create policy "Requester or responder can update"
  on public.help_requests for update using (
    auth.uid() = requester_id or auth.uid() = responder_id
  );

-- ============================================================
-- SECTION 4: VOLUNTEER REGISTRY
-- ============================================================

create table if not exists public.volunteers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) not null unique,
  skills          text[] not null default '{}',
  availability    text not null check (availability in ('available', 'busy', 'offline')),
  community_id    text not null,
  lat             double precision,
  lng             double precision,
  verified        boolean not null default false,
  verified_by     uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.volunteers enable row level security;

drop policy if exists "Anyone can view volunteers" on public.volunteers;
create policy "Anyone can view volunteers"
  on public.volunteers for select using (true);

drop policy if exists "Users can register as volunteer" on public.volunteers;
create policy "Users can register as volunteer"
  on public.volunteers for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Volunteers can update their own record" on public.volunteers;
create policy "Volunteers can update their own record"
  on public.volunteers for update using (auth.uid() = user_id);

drop policy if exists "Moderators can verify volunteers" on public.volunteers;
create policy "Moderators can verify volunteers"
  on public.volunteers for update using (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

-- ============================================================
-- SECTION 5: OFFICIAL ALERTS (CONTROL ROOM)
-- ============================================================

create table if not exists public.official_alerts (
  id                  uuid primary key default gen_random_uuid(),
  created_by          uuid references public.profiles(id) not null,
  type                text not null check (type in ('evacuation', 'shelter', 'road_closure', 'weather', 'general')),
  severity            text not null check (severity in ('advisory', 'watch', 'warning', 'emergency')),
  headline_en         text not null,
  headline_hi         text not null,
  instructions_en     text not null,
  instructions_hi     text not null,
  area                text not null,
  status              text not null default 'draft'
                        check (status in ('draft', 'pending_approval', 'approved', 'published', 'expired', 'cancelled')),
  approval_count      int not null default 0,
  required_approvals  int not null default 2,
  expires_at          timestamptz,
  published_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists public.alert_approvals (
  id          uuid primary key default gen_random_uuid(),
  alert_id    uuid references public.official_alerts(id) on delete cascade not null,
  officer_id  uuid references public.profiles(id) not null,
  approved_at timestamptz default now(),
  unique (alert_id, officer_id)
);

alter table public.official_alerts enable row level security;
alter table public.alert_approvals  enable row level security;

-- alerts RLS
drop policy if exists "Anyone can view published alerts" on public.official_alerts;
create policy "Anyone can view published alerts"
  on public.official_alerts for select using (status = 'published' or auth.uid() = created_by or
    exists (select 1 from public.moderators where user_id = auth.uid()));

drop policy if exists "Moderators can create alerts" on public.official_alerts;
create policy "Moderators can create alerts"
  on public.official_alerts for insert to authenticated with check (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

drop policy if exists "Moderators can update alerts" on public.official_alerts;
create policy "Moderators can update alerts"
  on public.official_alerts for update using (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

-- approvals RLS
drop policy if exists "Moderators can view approvals" on public.alert_approvals;
create policy "Moderators can view approvals"
  on public.alert_approvals for select using (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

drop policy if exists "Moderators can approve alerts" on public.alert_approvals;
create policy "Moderators can approve alerts"
  on public.alert_approvals for insert to authenticated with check (
    exists (select 1 from public.moderators where user_id = auth.uid())
  );

-- Auto-increment approval count
create or replace function public.increment_alert_approval()
returns trigger language plpgsql security definer as $$
begin
  update public.official_alerts
  set approval_count = approval_count + 1,
      status = case when approval_count + 1 >= required_approvals then 'approved' else status end,
      updated_at = now()
  where id = new.alert_id;
  return new;
end;
$$;

drop trigger if exists on_alert_approved on public.alert_approvals;
create trigger on_alert_approved
  after insert on public.alert_approvals
  for each row execute procedure public.increment_alert_approval();

-- ============================================================
-- SECTION 6: STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hazard-photos', 'hazard-photos', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow hazard photo uploads" on storage.objects;
create policy "Allow hazard photo uploads"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'hazard-photos');

drop policy if exists "Allow avatar uploads" on storage.objects;
create policy "Allow avatar uploads"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Anyone can view storage objects" on storage.objects;
create policy "Anyone can view storage objects"
  on storage.objects for select using (true);

-- ============================================================
-- SECTION 7: REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for key tables
alter publication supabase_realtime add table public.hazards;
alter publication supabase_realtime add table public.official_alerts;
alter publication supabase_realtime add table public.community_posts;
alter publication supabase_realtime add table public.help_requests;
