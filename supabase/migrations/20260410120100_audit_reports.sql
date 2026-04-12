/*
  AI-generated “业委会质疑报告” stored for PDF export and meeting use.
*/

CREATE TABLE IF NOT EXISTS public.audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  recommendations text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_reports_property ON public.audit_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_invoice ON public.audit_reports(invoice_id);

COMMENT ON TABLE public.audit_reports IS 'AI-generated council questioning reports per invoice.';

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_reports_select_member" ON public.audit_reports;
CREATE POLICY "audit_reports_select_member"
  ON public.audit_reports FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "audit_reports_insert_member" ON public.audit_reports;
CREATE POLICY "audit_reports_insert_member"
  ON public.audit_reports FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "audit_reports_update_own" ON public.audit_reports;
CREATE POLICY "audit_reports_update_own"
  ON public.audit_reports FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT, INSERT, UPDATE ON public.audit_reports TO authenticated;
GRANT ALL ON public.audit_reports TO service_role;
