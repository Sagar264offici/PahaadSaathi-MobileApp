-- ============================================================
-- PahaadSaathi — Column & Bucket Fix
-- Run this in Supabase SQL Editor if you already ran schema.sql
-- ============================================================

-- Fix 1: Rename lat/lng → latitude/longitude to match app code
DO $$
BEGIN
  -- Rename lat → latitude if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'lat'
  ) THEN
    ALTER TABLE public.hazards RENAME COLUMN lat TO latitude;
  END IF;

  -- Rename lng → longitude if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'lng'
  ) THEN
    ALTER TABLE public.hazards RENAME COLUMN lng TO longitude;
  END IF;

  -- Add latitude if missing entirely
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN latitude double precision;
  END IF;

  -- Add longitude if missing entirely
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN longitude double precision;
  END IF;

  -- Add other missing columns the app code expects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'area'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN area text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN reported_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'reported_by_role'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN reported_by_role text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'reporter_phone'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN reporter_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.hazards ADD COLUMN updated_at timestamptz default now();
  END IF;
END $$;

-- Fix 2: Create the correct bucket name that the app code uses ("Hazard-Photos")
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Hazard-Photos', 'Hazard-Photos', true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policy for Hazard-Photos
DROP POLICY IF EXISTS "Allow Hazard-Photos uploads" ON storage.objects;
CREATE POLICY "Allow Hazard-Photos uploads"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'Hazard-Photos');

DROP POLICY IF EXISTS "Allow Hazard-Photos reads" ON storage.objects;
CREATE POLICY "Allow Hazard-Photos reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Hazard-Photos');

-- Fix 3: Ensure verification_log table exists
CREATE TABLE IF NOT EXISTS public.verification_log (
  id          uuid primary key default gen_random_uuid(),
  hazard_id   uuid references public.hazards(id) on delete cascade not null,
  officer_id  text not null,
  action      text not null check (action in ('called', 'verified', 'dismissed')),
  reason      text,
  created_at  timestamptz default now()
);

ALTER TABLE public.verification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers can view verification log" ON public.verification_log;
CREATE POLICY "Officers can view verification log"
  ON public.verification_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Officers can insert verification log" ON public.verification_log;
CREATE POLICY "Officers can insert verification log"
  ON public.verification_log FOR INSERT WITH CHECK (true);

-- Fix 4: Allow anonymous & authenticated hazard reports in emergency
DROP POLICY IF EXISTS "Authenticated users can report hazards" ON public.hazards;
DROP POLICY IF EXISTS "Anyone can report hazards" ON public.hazards;
CREATE POLICY "Anyone can report hazards"
  ON public.hazards FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view hazards" ON public.hazards;
CREATE POLICY "Anyone can view hazards"
  ON public.hazards FOR SELECT
  USING (true);

-- Fix 5: NVIDIA AI Hazard Image Verification columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_status'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_status text DEFAULT 'pending' 
      CHECK (ai_verification_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_result'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_result jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_verdict'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_verdict text 
      CHECK (ai_verification_verdict IN ('consistent', 'partially_consistent', 'inconsistent', 'insufficient_evidence'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verified_at'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_model'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_model text DEFAULT 'google/paligemma';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_error_code'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_error_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_attempts'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_attempts integer DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hazards_ai_status_verdict 
  ON public.hazards (ai_verification_status, ai_verification_verdict);


