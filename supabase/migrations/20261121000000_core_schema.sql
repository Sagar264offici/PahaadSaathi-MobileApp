-- PahaadSaathi Core Database Schema (PostgreSQL + PostGIS)
-- Comprehensive Disaster Coordination & Community Safety Network

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. User Profiles & Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (
    role IN (
      'citizen', 'tourist', 'community_moderator', 'verified_volunteer',
      'field_responder', 'village_administrator', 'district_operator',
      'district_admin', 'state_admin', 'super_admin'
    )
  ),
  district TEXT,
  tehsil TEXT,
  panchayat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Geographic Communities
CREATE TABLE IF NOT EXISTS public.communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  tehsil TEXT,
  panchayat TEXT,
  description TEXT,
  emergency_hotline TEXT,
  sdrf_base TEXT,
  boundary GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Incidents & Disaster Reports
CREATE TABLE IF NOT EXISTS public.incidents (
  id TEXT PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  description TEXT NOT NULL,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOMETRY(Point, 4326),
  accuracy_meters DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (
    status IN ('reported', 'under_review', 'corroborated', 'verified', 'confirmed_closure', 'resolved', 'rejected')
  ),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'community_corroborated', 'authority_verified', 'disputed')
  ),
  corroborations_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_incidents_location ON public.incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- 4. Community Posts & Feeds
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  community_id TEXT REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'citizen',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location_label TEXT,
  corroborations_count INT NOT NULL DEFAULT 1,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Community Help Exchange
CREATE TABLE IF NOT EXISTS public.help_requests (
  id TEXT PRIMARY KEY,
  community_id TEXT REFERENCES public.communities(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  category TEXT NOT NULL CHECK (category IN ('food', 'water', 'shelter', 'transport', 'medical', 'rescue')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'in_progress', 'fulfilled', 'cancelled', 'expired')),
  assigned_volunteer_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. Emergency Resources & Shelters
CREATE TABLE IF NOT EXISTS public.emergency_resources (
  id TEXT PRIMARY KEY,
  community_id TEXT REFERENCES public.communities(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('hospital', 'phc', 'police', 'fire_station', 'shelter', 'water_point')),
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOMETRY(Point, 4326),
  capacity INT,
  current_occupancy INT DEFAULT 0,
  is_operational BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_resources_location ON public.emergency_resources USING GIST(location);

-- 7. Official Public Alerts (CAP / SACHET Interface)
CREATE TABLE IF NOT EXISTS public.district_alerts (
  id TEXT PRIMARY KEY,
  sender_agency TEXT NOT NULL,
  sender_officer_name TEXT NOT NULL,
  target_district TEXT NOT NULL,
  target_region TEXT,
  category TEXT NOT NULL,
  headline_en TEXT NOT NULL,
  headline_hi TEXT NOT NULL,
  instructions_en TEXT NOT NULL,
  instructions_hi TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('ADVISORY', 'WATCH', 'WARNING', 'EXTREME_EMERGENCY')),
  effective_until TIMESTAMPTZ NOT NULL,
  approvals_required INT NOT NULL DEFAULT 2,
  approved_by TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'authorized', 'dispatched', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Audit Logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies for emergency awareness
CREATE POLICY "Public can view communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Public can view incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Public can view community posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Public can view resources and shelters" ON public.emergency_resources FOR SELECT USING (true);
CREATE POLICY "Public can view help requests" ON public.help_requests FOR SELECT USING (true);
CREATE POLICY "Public can view dispatched alerts" ON public.district_alerts FOR SELECT USING (status = 'dispatched');
