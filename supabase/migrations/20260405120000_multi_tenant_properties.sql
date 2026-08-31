/*
  # Multi-tenant: properties + property_users + property_id on business tables

  - One default property is created; existing rows are backfilled.
  - New profiles get a property_users row via trigger (default property).
  - RLS policies are updated in 20260405120100_multi_tenant_rls.sql
*/

-- ---------------------------------------------------------------------------
-- 1) Core tenant tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_users (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON public.property_users(user_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON public.property_users(property_id);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Default property + backfill membership from profiles
-- ---------------------------------------------------------------------------

INSERT INTO public.properties (id, name, slug)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'Default property',
  'default'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.property_users (property_id, user_id, role)
SELECT '00000000-0000-4000-a000-000000000001'::uuid, p.id, p.role
FROM public.profiles p
ON CONFLICT (property_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Helper: membership (used by RLS migration)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.property_id
  FROM public.property_users pu
  WHERE pu.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.user_property_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_ids() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Add property_id columns (nullable first)
-- ---------------------------------------------------------------------------

DO $c$
DECLARE
  default_id uuid := '00000000-0000-4000-a000-000000000001'::uuid;
BEGIN
  -- helper macro-ish: add column if missing
  PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_notifications';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_notifications') THEN
    ALTER TABLE public.community_notifications ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_audit_log') THEN
    ALTER TABLE public.invoice_audit_log ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_anomalies') THEN
    ALTER TABLE public.financial_anomalies ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetings') THEN
    ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_agenda_items') THEN
    ALTER TABLE public.meeting_agenda_items ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_attendees') THEN
    ALTER TABLE public.meeting_attendees ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_votes') THEN
    ALTER TABLE public.meeting_votes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_documents') THEN
    ALTER TABLE public.meeting_documents ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_quota_tracker') THEN
    ALTER TABLE public.meeting_quota_tracker ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_records') THEN
    ALTER TABLE public.meeting_records ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_jobs') THEN
    ALTER TABLE public.procurement_jobs ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_quotes') THEN
    ALTER TABLE public.procurement_quotes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_photos') THEN
    ALTER TABLE public.procurement_photos ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_invoices') THEN
    ALTER TABLE public.procurement_invoices ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_audit_log') THEN
    ALTER TABLE public.procurement_audit_log ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procurement_quote_notifications') THEN
    ALTER TABLE public.procurement_quote_notifications ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hiring_jobs') THEN
    ALTER TABLE public.hiring_jobs ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hiring_candidates') THEN
    ALTER TABLE public.hiring_candidates ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_managers') THEN
    ALTER TABLE public.property_managers ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'residents') THEN
    ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'owner_info') THEN
    ALTER TABLE public.owner_info ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deregistration_requests') THEN
    ALTER TABLE public.deregistration_requests ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disputes') THEN
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispute_messages') THEN
    ALTER TABLE public.dispute_messages ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispute_evidence') THEN
    ALTER TABLE public.dispute_evidence ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispute_timeline') THEN
    ALTER TABLE public.dispute_timeline ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_transactions') THEN
    ALTER TABLE public.ledger_transactions ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monthly_summaries') THEN
    ALTER TABLE public.monthly_summaries ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'special_levies') THEN
    ALTER TABLE public.special_levies ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'owner_documents') THEN
    ALTER TABLE public.owner_documents ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compliance_docs') THEN
    ALTER TABLE public.compliance_docs ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_search_results') THEN
    ALTER TABLE public.vendor_search_results ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_ratings') THEN
    ALTER TABLE public.vendor_ratings ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_history') THEN
    ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_registry') THEN
    ALTER TABLE public.vendor_registry ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
  END IF;

  -- Backfill
  UPDATE public.community_notifications SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.invoices SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.meetings SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.procurement_jobs SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.hiring_jobs SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.property_managers SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.residents SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.owner_info SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.deregistration_requests SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.disputes SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.ledger_transactions SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.monthly_summaries SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.special_levies SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.owner_documents SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.compliance_docs SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.vendor_search_results SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.vendor_ratings SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.price_history SET property_id = default_id WHERE property_id IS NULL;
  UPDATE public.vendor_registry SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.invoice_audit_log ial
  SET property_id = i.property_id
  FROM public.invoices i
  WHERE ial.invoice_id = i.id AND ial.property_id IS NULL;

  UPDATE public.invoice_audit_log SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.financial_anomalies fa
  SET property_id = COALESCE(
    (
      SELECT i.property_id FROM public.invoices i
      WHERE fa.invoice_id IS NOT NULL AND i.id = fa.invoice_id
      LIMIT 1
    ),
    (
      SELECT pj.property_id FROM public.procurement_jobs pj
      WHERE fa.procurement_job_id IS NOT NULL AND pj.id = fa.procurement_job_id
      LIMIT 1
    ),
    default_id
  )
  WHERE fa.property_id IS NULL;

  UPDATE public.meeting_agenda_items mai
  SET property_id = m.property_id
  FROM public.meetings m
  WHERE mai.meeting_id = m.id AND mai.property_id IS NULL;
  UPDATE public.meeting_agenda_items SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.meeting_attendees ma
  SET property_id = m.property_id
  FROM public.meetings m
  WHERE ma.meeting_id = m.id AND ma.property_id IS NULL;
  UPDATE public.meeting_attendees SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.meeting_votes mv
  SET property_id = m.property_id
  FROM public.meeting_agenda_items mai, public.meetings m
  WHERE mv.agenda_item_id = mai.id
    AND mai.meeting_id = m.id
    AND mv.property_id IS NULL;
  UPDATE public.meeting_votes SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.meeting_documents md
  SET property_id = m.property_id
  FROM public.meetings m
  WHERE md.meeting_id = m.id AND md.property_id IS NULL;
  UPDATE public.meeting_documents SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.meeting_quota_tracker mqt
  SET property_id = m.property_id
  FROM public.meetings m
  WHERE mqt.meeting_id = m.id AND mqt.property_id IS NULL;
  UPDATE public.meeting_quota_tracker SET property_id = default_id WHERE property_id IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_records' AND column_name = 'property_id') THEN
    UPDATE public.meeting_records mr
    SET property_id = default_id
    WHERE mr.property_id IS NULL;
  END IF;

  UPDATE public.procurement_quotes pq
  SET property_id = j.property_id
  FROM public.procurement_jobs j
  WHERE pq.job_id = j.id AND pq.property_id IS NULL;
  UPDATE public.procurement_quotes SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.procurement_photos pp
  SET property_id = j.property_id
  FROM public.procurement_jobs j
  WHERE pp.job_id = j.id AND pp.property_id IS NULL;
  UPDATE public.procurement_photos SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.procurement_invoices pi
  SET property_id = j.property_id
  FROM public.procurement_jobs j
  WHERE pi.job_id = j.id AND pi.property_id IS NULL;
  UPDATE public.procurement_invoices SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.procurement_audit_log pal
  SET property_id = j.property_id
  FROM public.procurement_jobs j
  WHERE pal.job_id = j.id AND pal.property_id IS NULL;
  UPDATE public.procurement_audit_log SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.procurement_quote_notifications pqn
  SET property_id = j.property_id
  FROM public.procurement_jobs j
  WHERE pqn.job_id = j.id AND pqn.property_id IS NULL;
  UPDATE public.procurement_quote_notifications SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.hiring_candidates hc
  SET property_id = hj.property_id
  FROM public.hiring_jobs hj
  WHERE hc.job_id = hj.id AND hc.property_id IS NULL;
  UPDATE public.hiring_candidates SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.dispute_messages dm
  SET property_id = d.property_id
  FROM public.disputes d
  WHERE dm.dispute_id = d.id AND dm.property_id IS NULL;
  UPDATE public.dispute_messages SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.dispute_evidence de
  SET property_id = d.property_id
  FROM public.disputes d
  WHERE de.dispute_id = d.id AND de.property_id IS NULL;
  UPDATE public.dispute_evidence SET property_id = default_id WHERE property_id IS NULL;

  UPDATE public.dispute_timeline dt
  SET property_id = d.property_id
  FROM public.disputes d
  WHERE dt.dispute_id = d.id AND dt.property_id IS NULL;
  UPDATE public.dispute_timeline SET property_id = default_id WHERE property_id IS NULL;
END $c$;

-- NOT NULL (skip if column missing on optional tables)
ALTER TABLE public.community_notifications ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.procurement_jobs ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.residents ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.owner_info ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.disputes ALTER COLUMN property_id SET NOT NULL;

DO $n$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoice_audit_log' AND column_name = 'property_id') THEN
    ALTER TABLE public.invoice_audit_log ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'financial_anomalies' AND column_name = 'property_id') THEN
    ALTER TABLE public.financial_anomalies ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_agenda_items' AND column_name = 'property_id') THEN
    ALTER TABLE public.meeting_agenda_items ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_attendees' AND column_name = 'property_id') THEN
    ALTER TABLE public.meeting_attendees ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'property_id') THEN
    ALTER TABLE public.meeting_votes ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_documents' AND column_name = 'property_id') THEN
    ALTER TABLE public.meeting_documents ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_quota_tracker' AND column_name = 'property_id') THEN
    ALTER TABLE public.meeting_quota_tracker ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_quotes' AND column_name = 'property_id') THEN
    ALTER TABLE public.procurement_quotes ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_photos' AND column_name = 'property_id') THEN
    ALTER TABLE public.procurement_photos ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_invoices' AND column_name = 'property_id') THEN
    ALTER TABLE public.procurement_invoices ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_audit_log' AND column_name = 'property_id') THEN
    ALTER TABLE public.procurement_audit_log ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_quote_notifications' AND column_name = 'property_id') THEN
    ALTER TABLE public.procurement_quote_notifications ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hiring_jobs' AND column_name = 'property_id') THEN
    ALTER TABLE public.hiring_jobs ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hiring_candidates' AND column_name = 'property_id') THEN
    ALTER TABLE public.hiring_candidates ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_managers' AND column_name = 'property_id') THEN
    ALTER TABLE public.property_managers ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'deregistration_requests' AND column_name = 'property_id') THEN
    ALTER TABLE public.deregistration_requests ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dispute_messages' AND column_name = 'property_id') THEN
    ALTER TABLE public.dispute_messages ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dispute_evidence' AND column_name = 'property_id') THEN
    ALTER TABLE public.dispute_evidence ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dispute_timeline' AND column_name = 'property_id') THEN
    ALTER TABLE public.dispute_timeline ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ledger_transactions' AND column_name = 'property_id') THEN
    ALTER TABLE public.ledger_transactions ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'monthly_summaries' AND column_name = 'property_id') THEN
    ALTER TABLE public.monthly_summaries ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'special_levies' AND column_name = 'property_id') THEN
    ALTER TABLE public.special_levies ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'owner_documents' AND column_name = 'property_id') THEN
    ALTER TABLE public.owner_documents ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'compliance_docs' AND column_name = 'property_id') THEN
    ALTER TABLE public.compliance_docs ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_search_results' AND column_name = 'property_id') THEN
    ALTER TABLE public.vendor_search_results ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_ratings' AND column_name = 'property_id') THEN
    ALTER TABLE public.vendor_ratings ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'property_id') THEN
    ALTER TABLE public.price_history ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_registry' AND column_name = 'property_id') THEN
    ALTER TABLE public.vendor_registry ALTER COLUMN property_id SET NOT NULL;
  END IF;
END $n$;

-- owner_info: unique per property
ALTER TABLE public.owner_info DROP CONSTRAINT IF EXISTS owner_info_unit_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS owner_info_property_unit_unique ON public.owner_info(property_id, unit_number);

-- monthly_summaries: unique per property + month
ALTER TABLE public.monthly_summaries DROP CONSTRAINT IF EXISTS monthly_summaries_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS monthly_summaries_property_month_unique ON public.monthly_summaries(property_id, month);

-- ---------------------------------------------------------------------------
-- 5) New profile ?default property_users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_profiles_add_default_property_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  pid uuid := '00000000-0000-4000-a000-000000000001'::uuid;
BEGIN
  INSERT INTO public.property_users (property_id, user_id, role)
  VALUES (pid, NEW.id, NEW.role)
  ON CONFLICT (property_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS profiles_add_default_property_user ON public.profiles;
CREATE TRIGGER profiles_add_default_property_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_add_default_property_user();

-- ---------------------------------------------------------------------------
-- 6) Basic RLS on tenant meta tables (tightened in next migration)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "properties_select_members" ON public.properties;
CREATE POLICY "properties_select_members"
  ON public.properties FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "property_users_select_self" ON public.property_users;
CREATE POLICY "property_users_select_self"
  ON public.property_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.properties TO authenticated;
GRANT SELECT ON public.property_users TO authenticated;
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.property_users TO service_role;




