/*
  Idempotent repair for environments missing:
  - RPC public.property_has_management_staff
  - Table public.invoice_ai_audit_results (+ hybrid flags + sync trigger)

  Safe to run after older migrations; uses IF NOT EXISTS / OR REPLACE.
*/

-- ---------------------------------------------------------------------------
-- 1) RPC: staff presence (matches 20260717120000)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.property_has_management_staff(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'::public.member_status
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role IN (
        'admin'::public.user_role,
        'council'::public.user_role,
        'manager'::public.user_role,
        'property_admin'::public.user_role
      )
  );
END;
$$;

COMMENT ON FUNCTION public.property_has_management_staff(uuid) IS
  'True if the property has at least one active staff member (admin/council/manager/property_admin). Caller must be an active member.';

REVOKE ALL ON FUNCTION public.property_has_management_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_has_management_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_has_management_staff(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Read model: invoice_ai_audit_results
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_ai_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL,
  anomalies jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_ai_audit_results_invoice UNIQUE (invoice_id),
  CONSTRAINT invoice_ai_audit_results_risk_level_chk CHECK (
    risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])
  ),
  CONSTRAINT invoice_ai_audit_results_risk_score_chk CHECK (
    risk_score >= 0::numeric AND risk_score <= 1::numeric
  )
);

ALTER TABLE public.invoice_ai_audit_results
  ADD COLUMN IF NOT EXISTS over_budget boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoice_ai_audit_results
  ADD COLUMN IF NOT EXISTS bypass_approval boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invoice_ai_audit_results_property
  ON public.invoice_ai_audit_results(property_id);

COMMENT ON TABLE public.invoice_ai_audit_results IS
  'AI audit snapshot for dashboards; synced from invoice_ai_audits.';

ALTER TABLE public.invoice_ai_audit_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_ai_audit_results_select_member" ON public.invoice_ai_audit_results;
CREATE POLICY "invoice_ai_audit_results_select_member"
  ON public.invoice_ai_audit_results FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT ON public.invoice_ai_audit_results TO authenticated;
GRANT ALL ON public.invoice_ai_audit_results TO service_role;

-- ---------------------------------------------------------------------------
-- 3) invoice_ai_audits — hybrid flags (only if table exists)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.invoice_ai_audits') IS NOT NULL THEN
    ALTER TABLE public.invoice_ai_audits
      ADD COLUMN IF NOT EXISTS over_budget boolean NOT NULL DEFAULT false;
    ALTER TABLE public.invoice_ai_audits
      ADD COLUMN IF NOT EXISTS bypass_approval boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Sync trigger from invoice_ai_audits (hybrid flags)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._sync_invoice_ai_audit_results_from_audits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score numeric;
  v_level text;
BEGIN
  v_score := LEAST(1::numeric, GREATEST(0::numeric, COALESCE(NEW.risk_score, 0)::numeric / 100.0));
  v_level := COALESCE(NEW.risk_level, 'medium');

  INSERT INTO public.invoice_ai_audit_results (
    invoice_id,
    property_id,
    risk_score,
    risk_level,
    anomalies,
    summary,
    over_budget,
    bypass_approval,
    updated_at
  )
  VALUES (
    NEW.invoice_id,
    NEW.property_id,
    v_score,
    v_level,
    COALESCE(NEW.ai_reasons, '[]'::jsonb),
    COALESCE(NULLIF(trim(NEW.ai_summary_zh), ''), NULLIF(trim(NEW.ai_summary_en), ''), ''),
    COALESCE(NEW.over_budget, false),
    COALESCE(NEW.bypass_approval, false),
    NEW.updated_at
  )
  ON CONFLICT (invoice_id) DO UPDATE SET
    property_id = EXCLUDED.property_id,
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    anomalies = EXCLUDED.anomalies,
    summary = EXCLUDED.summary,
    over_budget = EXCLUDED.over_budget,
    bypass_approval = EXCLUDED.bypass_approval,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.invoice_ai_audits') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_invoice_ai_audit_results ON public.invoice_ai_audits;
    CREATE TRIGGER trg_sync_invoice_ai_audit_results
      AFTER INSERT OR UPDATE ON public.invoice_ai_audits
      FOR EACH ROW
      EXECUTE FUNCTION public._sync_invoice_ai_audit_results_from_audits();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Realtime (ignore if already in publication)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_ai_audit_results;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
