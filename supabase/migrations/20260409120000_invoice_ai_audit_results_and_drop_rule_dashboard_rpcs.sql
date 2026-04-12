/*
  AI dashboard read model + remove legacy rule-based dashboard RPCs.
*/

-- ---------------------------------------------------------------------------
-- 1) invoice_ai_audit_results (normalized 0–1 risk_score; synced from invoice_ai_audits)
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
  CONSTRAINT invoice_ai_audit_results_risk_score_chk CHECK (risk_score >= 0::numeric AND risk_score <= 1::numeric)
);

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
    updated_at
  )
  VALUES (
    NEW.invoice_id,
    NEW.property_id,
    v_score,
    v_level,
    COALESCE(NEW.ai_reasons, '[]'::jsonb),
    COALESCE(NULLIF(trim(NEW.ai_summary_zh), ''), NULLIF(trim(NEW.ai_summary_en), ''), ''),
    NEW.updated_at
  )
  ON CONFLICT (invoice_id) DO UPDATE SET
    property_id = EXCLUDED.property_id,
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    anomalies = EXCLUDED.anomalies,
    summary = EXCLUDED.summary,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_ai_audit_results ON public.invoice_ai_audits;
CREATE TRIGGER trg_sync_invoice_ai_audit_results
  AFTER INSERT OR UPDATE ON public.invoice_ai_audits
  FOR EACH ROW
  EXECUTE FUNCTION public._sync_invoice_ai_audit_results_from_audits();

INSERT INTO public.invoice_ai_audit_results (
  invoice_id,
  property_id,
  risk_score,
  risk_level,
  anomalies,
  summary,
  updated_at
)
SELECT
  a.invoice_id,
  a.property_id,
  LEAST(1::numeric, GREATEST(0::numeric, COALESCE(a.risk_score, 0)::numeric / 100.0)),
  COALESCE(a.risk_level, 'medium'),
  COALESCE(a.ai_reasons, '[]'::jsonb),
  COALESCE(NULLIF(trim(a.ai_summary_zh), ''), NULLIF(trim(a.ai_summary_en), ''), ''),
  a.updated_at
FROM public.invoice_ai_audits a
ON CONFLICT (invoice_id) DO UPDATE SET
  property_id = EXCLUDED.property_id,
  risk_score = EXCLUDED.risk_score,
  risk_level = EXCLUDED.risk_level,
  anomalies = EXCLUDED.anomalies,
  summary = EXCLUDED.summary,
  updated_at = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- 2) Drop legacy dashboard rule RPCs (replaced by AI-driven app queries)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.dashboard_budget_alerts(uuid, int);
DROP FUNCTION IF EXISTS public.dashboard_recent_abnormal_invoices(uuid, int, int);
DROP FUNCTION IF EXISTS public.dashboard_monthly_abnormal_distinct_count(uuid, int);
