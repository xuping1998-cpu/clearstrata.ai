/*
  Project One Phase 3 — Constitutional Deliberation Assistant (CDA)
  Append-only AI analysis artifacts for governance matters.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.governance_matter_cda_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.governance_matters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'deliberation_analysis' CHECK (
    report_type IN ('deliberation_analysis')
  ),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  constitutional_basis jsonb NOT NULL DEFAULT '[]'::jsonb,
  principles_reviewed jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_governance_matter_cda_reports_matter
  ON public.governance_matter_cda_reports(matter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_governance_matter_cda_reports_property
  ON public.governance_matter_cda_reports(property_id, created_at DESC);

COMMENT ON TABLE public.governance_matter_cda_reports IS
  'Append-only Constitutional Deliberation Assistant outputs. AI assists; people decide.';

-- Append-only: no updates or deletes
CREATE OR REPLACE FUNCTION public.governance_matter_cda_report_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'CDA reports are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'CDA reports cannot be deleted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_governance_matter_cda_report_immutable ON public.governance_matter_cda_reports;
CREATE TRIGGER trg_governance_matter_cda_report_immutable
  BEFORE UPDATE OR DELETE ON public.governance_matter_cda_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.governance_matter_cda_report_immutable();

ALTER TABLE public.governance_matter_cda_reports ENABLE ROW LEVEL SECURITY;

-- RC-011 IU-3: guarded policy for idempotent re-apply (OOB catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'governance_matter_cda_reports'
      AND policyname = 'gm_cda_select_tenant'
  ) THEN
    CREATE POLICY "gm_cda_select_tenant"
      ON public.governance_matter_cda_reports FOR SELECT TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;
END $$;

GRANT SELECT ON public.governance_matter_cda_reports TO authenticated;
GRANT ALL ON public.governance_matter_cda_reports TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
