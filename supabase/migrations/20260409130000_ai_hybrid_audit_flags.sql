/*
  Hybrid audit: hard flags (over budget, approval bypass) + AI reasoning.
  - invoices.approved: set true when council approves; used for bypass detection.
  - invoice_ai_audits / invoice_ai_audit_results: mirror flags for dashboard.
*/

-- ---------------------------------------------------------------------------
-- 1) invoices.approved (workflow; backfill from status)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.approved IS
  'True after formal approval. Used with status=paid to detect bypass (paid without approval).';

UPDATE public.invoices
SET approved = true
WHERE status IN ('approved', 'paid')
  AND approved IS NOT TRUE;

-- ---------------------------------------------------------------------------
-- 2) invoice_ai_audits — hard flags (filled by Edge Function run-invoice-ai-audit)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_ai_audits
  ADD COLUMN IF NOT EXISTS over_budget boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoice_ai_audits
  ADD COLUMN IF NOT EXISTS bypass_approval boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoice_ai_audits.over_budget IS
  'Category spend after this invoice exceeds active annual budget line (hard truth).';

COMMENT ON COLUMN public.invoice_ai_audits.bypass_approval IS
  'True when payment recorded without prior approval (hard truth).';

-- ---------------------------------------------------------------------------
-- 3) invoice_ai_audit_results — same flags (synced from audits)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_ai_audit_results
  ADD COLUMN IF NOT EXISTS over_budget boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoice_ai_audit_results
  ADD COLUMN IF NOT EXISTS bypass_approval boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 4) Sync trigger: copy hard flags into read model
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
SELECT
  a.invoice_id,
  a.property_id,
  LEAST(1::numeric, GREATEST(0::numeric, COALESCE(a.risk_score, 0)::numeric / 100.0)),
  COALESCE(a.risk_level, 'medium'),
  COALESCE(a.ai_reasons, '[]'::jsonb),
  COALESCE(NULLIF(trim(a.ai_summary_zh), ''), NULLIF(trim(a.ai_summary_en), ''), ''),
  COALESCE(a.over_budget, false),
  COALESCE(a.bypass_approval, false),
  a.updated_at
FROM public.invoice_ai_audits a
ON CONFLICT (invoice_id) DO UPDATE SET
  property_id = EXCLUDED.property_id,
  risk_score = EXCLUDED.risk_score,
  risk_level = EXCLUDED.risk_level,
  anomalies = EXCLUDED.anomalies,
  summary = EXCLUDED.summary,
  over_budget = EXCLUDED.over_budget,
  bypass_approval = EXCLUDED.bypass_approval,
  updated_at = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- 5) Realtime: home dashboard refresh
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_ai_audit_results;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
