/*
  Vendor risk signals: hard metrics + AI explanation (risk hints, not legal findings).
*/

CREATE TABLE IF NOT EXISTS public.vendor_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  vendor_name text NOT NULL DEFAULT '',
  signal_type text NOT NULL,
  risk_level text NOT NULL,
  risk_score numeric NOT NULL DEFAULT 0,
  summary_zh text NOT NULL DEFAULT '',
  summary_en text NOT NULL DEFAULT '',
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_risk_signals_signal_type_chk CHECK (
    signal_type = ANY (
      ARRAY[
        'price_outlier_persistent'::text,
        'vendor_concentration_high'::text,
        'quote_competition_weak'::text,
        'relationship_risk_pattern'::text
      ]
    )
  ),
  CONSTRAINT vendor_risk_signals_risk_level_chk CHECK (
    risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])
  ),
  CONSTRAINT vendor_risk_signals_status_chk CHECK (
    status = ANY (ARRAY['open'::text, 'resolved'::text, 'ignored'::text])
  ),
  CONSTRAINT vendor_risk_signals_risk_score_chk CHECK (risk_score >= 0::numeric AND risk_score <= 100::numeric)
);

CREATE INDEX IF NOT EXISTS idx_vendor_risk_signals_property ON public.vendor_risk_signals(property_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_signals_vendor ON public.vendor_risk_signals(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_signals_type ON public.vendor_risk_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_signals_risk_level ON public.vendor_risk_signals(risk_level);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_signals_status ON public.vendor_risk_signals(status);

COMMENT ON TABLE public.vendor_risk_signals IS
  'Vendor-level risk hints from data patterns + AI wording; not adjudication of wrongdoing.';

CREATE OR REPLACE FUNCTION public._touch_vendor_risk_signals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_risk_signals_touch ON public.vendor_risk_signals;
CREATE TRIGGER trg_vendor_risk_signals_touch
  BEFORE UPDATE ON public.vendor_risk_signals
  FOR EACH ROW
  EXECUTE FUNCTION public._touch_vendor_risk_signals_updated_at();

ALTER TABLE public.vendor_risk_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_risk_signals_select_member" ON public.vendor_risk_signals;
CREATE POLICY "vendor_risk_signals_select_member"
  ON public.vendor_risk_signals FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "vendor_risk_signals_insert_member" ON public.vendor_risk_signals;
CREATE POLICY "vendor_risk_signals_insert_member"
  ON public.vendor_risk_signals FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "vendor_risk_signals_update_member" ON public.vendor_risk_signals;
CREATE POLICY "vendor_risk_signals_update_member"
  ON public.vendor_risk_signals FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT, INSERT, UPDATE ON public.vendor_risk_signals TO authenticated;
GRANT ALL ON public.vendor_risk_signals TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_risk_signals;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
