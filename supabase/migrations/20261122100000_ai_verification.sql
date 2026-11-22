-- ============================================================
-- PAHAADSAATHI — NVIDIA AI Hazard Image Verification Schema Migration
-- Migration: 20261122100000_ai_verification.sql
-- ============================================================

-- Step 1: Additive column additions to public.hazards table
DO $$
BEGIN
  -- Add ai_verification_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_status'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_status text DEFAULT 'pending' 
      CHECK (ai_verification_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  -- Add ai_verification_result (JSONB structured analysis)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_result'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_result jsonb;
  END IF;

  -- Add ai_verification_verdict
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_verdict'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_verdict text 
      CHECK (ai_verification_verdict IN ('consistent', 'partially_consistent', 'inconsistent', 'insufficient_evidence'));
  END IF;

  -- Add ai_verified_at (Timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verified_at'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verified_at timestamptz;
  END IF;

  -- Add ai_verification_model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_model'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_model text DEFAULT 'google/paligemma';
  END IF;

  -- Add ai_verification_error_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_error_code'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_error_code text;
  END IF;

  -- Add ai_verification_attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hazards' AND column_name = 'ai_verification_attempts'
  ) THEN
    ALTER TABLE public.hazards 
      ADD COLUMN ai_verification_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Step 2: Performance indexing for moderator and verification queries
CREATE INDEX IF NOT EXISTS idx_hazards_ai_status_verdict 
  ON public.hazards (ai_verification_status, ai_verification_verdict);

CREATE INDEX IF NOT EXISTS idx_hazards_ai_verified_at 
  ON public.hazards (ai_verified_at DESC NULLS LAST);

-- Step 3: Security & Row Level Security (RLS) Policies
-- All users (anon and authenticated) can view AI verification results
DROP POLICY IF EXISTS "Anyone can view AI verification results" ON public.hazards;
CREATE POLICY "Anyone can view AI verification results"
  ON public.hazards FOR SELECT
  USING (true);

-- Ordinary users CANNOT update AI verification columns.
-- Only the backend service_role can update AI verification columns.
-- (Supabase service_role automatically bypasses RLS).
