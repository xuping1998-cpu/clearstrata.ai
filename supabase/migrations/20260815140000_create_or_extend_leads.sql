/*
  20260815140000_create_or_extend_leads.sql
  Internal sales leads (upgrade/contact-sales funnel)

  Goal:
  - Reuse existing public.leads if present, otherwise create
  - Add/align minimal fields for UpgradePage + internal Leads Dashboard
  - Keep migration safe across mixed environments
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create table if missing (minimal)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  -- Legacy fields (used by demo / marketing); keep as-is if already present
  building text NULL,
  units text NULL,
  message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Extend schema for upgrade funnel (safe)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS property_name text NULL,
  ADD COLUMN IF NOT EXISTS selected_plan text NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upgrade_page',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS note text NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at_snapshot timestamptz NULL,
  ADD COLUMN IF NOT EXISTS subscription_status_snapshot text NULL;

-- 3) Backfill (best-effort)
UPDATE public.leads
SET property_name = COALESCE(property_name, NULLIF(trim(building), ''))
WHERE property_name IS NULL;

UPDATE public.leads
SET note = COALESCE(note, NULLIF(trim(message), ''))
WHERE note IS NULL AND message IS NOT NULL;

-- 4) Optional check constraints (NOT VALID so it won't block legacy rows)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_selected_plan_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_selected_plan_check
      CHECK (selected_plan IS NULL OR selected_plan IN ('starter', 'standard', 'pro', 'unknown'))
      NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost'))
      NOT VALID;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_selected_plan ON public.leads(selected_plan);

-- 6) updated_at trigger (reuse public.set_updated_at if available)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
    CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- 7) Minimal RLS:
-- - authenticated can INSERT their own lead (created_by = auth.uid())
-- - internal roles (profiles.role in admin/property_admin/manager) can SELECT/UPDATE all leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_self" ON public.leads;
CREATE POLICY "leads_insert_self"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "leads_internal_select" ON public.leads;
CREATE POLICY "leads_internal_select"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'property_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "leads_internal_update" ON public.leads;
CREATE POLICY "leads_internal_update"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'property_admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'property_admin', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

