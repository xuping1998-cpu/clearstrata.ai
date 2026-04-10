/*
  # SaaS: property_members (rename from property_users), invites, join requests, RPCs, RLS refresh
*/

-- ---------------------------------------------------------------------------
-- 1) Enums + extend user_role
-- ---------------------------------------------------------------------------

DO $e$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
END $e$;

DO $e$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'join_request_status') THEN
    CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $e$;

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'property_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'tenant';

-- ---------------------------------------------------------------------------
-- 2) Rename property_users ?property_members + columns
-- ---------------------------------------------------------------------------

DO $r$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_users'
  ) THEN
    ALTER TABLE public.property_users RENAME TO property_members;
  END IF;
END $r$;

ALTER TABLE public.property_members
  ADD COLUMN IF NOT EXISTS status public.member_status,
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE public.property_members SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.property_members ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.property_members ALTER COLUMN status SET NOT NULL;

ALTER INDEX IF EXISTS idx_property_users_user_id RENAME TO idx_property_members_user_id;
ALTER INDEX IF EXISTS idx_property_users_property_id RENAME TO idx_property_members_property_id;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS allow_public_join_requests boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.list_properties_open_for_join()
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.slug
  FROM public.properties p
  WHERE p.allow_public_join_requests = true
  ORDER BY p.name;
$$;

REVOKE ALL ON FUNCTION public.list_properties_open_for_join() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_properties_open_for_join() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Core functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.user_property_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_property_staff_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active'
    AND pm.role IN ('property_admin', 'admin', 'council', 'manager');
$$;

REVOKE ALL ON FUNCTION public.user_property_staff_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_staff_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_property_admin_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active'
    AND pm.role IN ('property_admin', 'admin');
$$;

REVOKE ALL ON FUNCTION public.user_property_admin_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_admin_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_profiles_add_default_property_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  pid uuid := '00000000-0000-4000-a000-000000000001'::uuid;
BEGIN
  INSERT INTO public.property_members (property_id, user_id, role, status)
  VALUES (pid, NEW.id, NEW.role, 'active')
  ON CONFLICT (property_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';
  RETURN NEW;
END;
$f$;

-- ---------------------------------------------------------------------------
-- 4) Invites + join_requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.property_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'owner',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_invites_property_id ON public.property_invites(property_id);

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL DEFAULT 'owner',
  full_name text,
  email text,
  phone text,
  unit_number text,
  note text,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_per_user
  ON public.join_requests(property_id, user_id)
  WHERE status = 'pending'::join_request_status;

CREATE INDEX IF NOT EXISTS idx_join_requests_property_id ON public.join_requests(property_id);

ALTER TABLE public.property_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) RPCs (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_property_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.property_invites
  WHERE code = upper(trim(p_code)) AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses');
  END IF;

  INSERT INTO public.property_members (property_id, user_id, role, status, approved_at)
  VALUES (inv.property_id, v_uid, inv.role, 'active', now())
  ON CONFLICT (property_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    approved_at = now();

  UPDATE public.property_invites
  SET used_count = used_count + 1
  WHERE id = inv.id;

  IF inv.max_uses > 0 AND (inv.used_count + 1) >= inv.max_uses THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'property_id', inv.property_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid,
  p_requested_role public.user_role DEFAULT 'owner',
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  vprof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_property');
  END IF;

  SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = p_property_id AND pm.user_id = v_uid AND pm.status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.property_id = p_property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_exists');
  END IF;

  INSERT INTO public.join_requests (
    property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    COALESCE(vprof.full_name_en, vprof.email),
    vprof.email,
    vprof.phone,
    p_unit_number,
    p_note,
    'pending'::join_request_status
  );

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_unit_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  r public.join_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO r FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF r.status <> 'pending'::join_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_processed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = r.property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_approve THEN
    UPDATE public.join_requests
    SET status = 'approved'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_number, approved_by, approved_at
    ) VALUES (
      r.property_id,
      r.user_id,
      r.requested_role,
      'active',
      COALESCE(p_unit_number, r.unit_number),
      v_uid,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      unit_number = COALESCE(EXCLUDED.unit_number, public.property_members.unit_number),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;
  ELSE
    UPDATE public.join_requests
    SET status = 'rejected'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.create_property_invite(
  p_property_id uuid,
  p_role public.user_role DEFAULT 'owner',
  p_max_uses int DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('property_admin', 'admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  INSERT INTO public.property_invites (
    property_id, code, role, status, max_uses, used_count, expires_at, created_by
  ) VALUES (
    p_property_id, v_code, p_role, 'active', GREATEST(p_max_uses, 0), 0, p_expires_at, v_uid
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
END;
$fn$;

REVOKE ALL ON FUNCTION public.redeem_property_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_join_request(uuid, user_role, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.redeem_property_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, user_role, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Meta RLS: property_members, property_invites, join_requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "property_users_select_self" ON public.property_members;
DROP POLICY IF EXISTS "property_members_select_self" ON public.property_members;
DROP POLICY IF EXISTS "property_members_select_scope" ON public.property_members;

CREATE POLICY "property_members_select_scope"
  ON public.property_members FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      user_id = (SELECT auth.uid())
      OR property_id IN (SELECT public.user_property_staff_ids())
    )
  );

DROP POLICY IF EXISTS "pi_select_property" ON public.property_invites;
CREATE POLICY "pi_select_property"
  ON public.property_invites FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "jr_select_scope" ON public.join_requests;
CREATE POLICY "jr_select_scope"
  ON public.join_requests FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      property_id IN (SELECT public.user_property_ids())
      AND EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = join_requests.property_id
          AND pm.status = 'active'
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Recreate tenant policies (property_members + staff roles)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "cn_select_tenant" ON public.community_notifications;
DROP POLICY IF EXISTS "cn_insert_staff" ON public.community_notifications;
DROP POLICY IF EXISTS "cn_update_creator" ON public.community_notifications;
DROP POLICY IF EXISTS "cn_delete_creator" ON public.community_notifications;
DROP POLICY IF EXISTS "inv_select_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_insert_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_update_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_delete_tenant" ON public.invoices;
DROP POLICY IF EXISTS "ial_select_tenant" ON public.invoice_audit_log;
DROP POLICY IF EXISTS "ial_insert_staff" ON public.invoice_audit_log;
DROP POLICY IF EXISTS "fa_all_tenant" ON public.financial_anomalies;
DROP POLICY IF EXISTS "mtg_select_tenant" ON public.meetings;
DROP POLICY IF EXISTS "mtg_insert_staff" ON public.meetings;
DROP POLICY IF EXISTS "mtg_update_staff" ON public.meetings;
DROP POLICY IF EXISTS "mai_select_tenant" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mai_write_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mai_update_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mai_delete_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mat_select_tenant" ON public.meeting_attendees;
DROP POLICY IF EXISTS "mat_write_staff" ON public.meeting_attendees;
DROP POLICY IF EXISTS "mat_update_staff" ON public.meeting_attendees;
DROP POLICY IF EXISTS "mat_delete_staff" ON public.meeting_attendees;
DROP POLICY IF EXISTS "mv_select_tenant" ON public.meeting_votes;
DROP POLICY IF EXISTS "mv_insert_self" ON public.meeting_votes;
DROP POLICY IF EXISTS "mv_update_staff" ON public.meeting_votes;
DROP POLICY IF EXISTS "mv_delete_staff" ON public.meeting_votes;
DROP POLICY IF EXISTS "mdoc_select_tenant" ON public.meeting_documents;
DROP POLICY IF EXISTS "mdoc_insert_staff" ON public.meeting_documents;
DROP POLICY IF EXISTS "mdoc_mod_tenant" ON public.meeting_documents;
DROP POLICY IF EXISTS "mdoc_del_tenant" ON public.meeting_documents;
DROP POLICY IF EXISTS "mqt_all_tenant" ON public.meeting_quota_tracker;
DO $d$
BEGIN
  IF to_regclass('public.meeting_records') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "mrec_all_tenant" ON public.meeting_records';
  END IF;
END $d$;
DROP POLICY IF EXISTS "pj_select_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_insert_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_update_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_delete_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pq_all_tenant" ON public.procurement_quotes;
DROP POLICY IF EXISTS "pph_all_tenant" ON public.procurement_photos;
DROP POLICY IF EXISTS "pinv_all_tenant" ON public.procurement_invoices;
DROP POLICY IF EXISTS "pal_all_tenant" ON public.procurement_audit_log;
DROP POLICY IF EXISTS "pqn_all_tenant" ON public.procurement_quote_notifications;
DROP POLICY IF EXISTS "hj_all_tenant" ON public.hiring_jobs;
DROP POLICY IF EXISTS "hc_all_tenant" ON public.hiring_candidates;
DROP POLICY IF EXISTS "pmgr_all_tenant" ON public.property_managers;
DROP POLICY IF EXISTS "res_select_tenant" ON public.residents;
DROP POLICY IF EXISTS "res_insert_tenant" ON public.residents;
DROP POLICY IF EXISTS "res_update_tenant" ON public.residents;
DROP POLICY IF EXISTS "res_delete_tenant" ON public.residents;
DROP POLICY IF EXISTS "oi_all_tenant" ON public.owner_info;
DROP POLICY IF EXISTS "dr_all_tenant" ON public.deregistration_requests;
DROP POLICY IF EXISTS "dsp_select_tenant" ON public.disputes;
DROP POLICY IF EXISTS "dsp_mod_tenant" ON public.disputes;
DROP POLICY IF EXISTS "dsp_update_tenant" ON public.disputes;
DROP POLICY IF EXISTS "dsm_all_tenant" ON public.dispute_messages;
DROP POLICY IF EXISTS "dse_all_tenant" ON public.dispute_evidence;
DROP POLICY IF EXISTS "dst_all_tenant" ON public.dispute_timeline;
DROP POLICY IF EXISTS "ledger_all_tenant" ON public.ledger_transactions;
DROP POLICY IF EXISTS "ms_select_tenant" ON public.monthly_summaries;
DROP POLICY IF EXISTS "ms_write_staff" ON public.monthly_summaries;
DROP POLICY IF EXISTS "ms_update_staff" ON public.monthly_summaries;
DROP POLICY IF EXISTS "sl_all_tenant" ON public.special_levies;
DROP POLICY IF EXISTS "od_all_tenant" ON public.owner_documents;
DROP POLICY IF EXISTS "cd_all_tenant" ON public.compliance_docs;
DROP POLICY IF EXISTS "vsr_all_tenant" ON public.vendor_search_results;
DROP POLICY IF EXISTS "vr_all_tenant" ON public.vendor_ratings;
DROP POLICY IF EXISTS "ph_all_tenant" ON public.price_history;
DROP POLICY IF EXISTS "vreg_all_tenant" ON public.vendor_registry;

CREATE POLICY "cn_select_tenant"
  ON public.community_notifications FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "cn_insert_staff"
  ON public.community_notifications FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = community_notifications.property_id
                AND pm.status = 'active'
        AND pm.role IN ('admin', 'manager', 'council', 'property_admin')
    )
  );

CREATE POLICY "cn_update_creator"
  ON public.community_notifications FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "cn_delete_creator"
  ON public.community_notifications FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------------------
-- invoices + invoice_audit_log + financial_anomalies
-- ---------------------------------------------------------------------------

CREATE POLICY "inv_select_tenant"
  ON public.invoices FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "inv_insert_tenant"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "inv_update_tenant"
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      uploaded_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = invoices.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND (
      uploaded_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = invoices.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

CREATE POLICY "inv_delete_tenant"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      uploaded_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = invoices.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

CREATE POLICY "ial_select_tenant"
  ON public.invoice_audit_log FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ial_insert_staff"
  ON public.invoice_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND actor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = invoice_audit_log.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "fa_all_tenant"
  ON public.financial_anomalies FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

-- ---------------------------------------------------------------------------
-- meetings subtree
-- ---------------------------------------------------------------------------

CREATE POLICY "mtg_select_tenant"
  ON public.meetings FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mtg_insert_staff"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meetings.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mtg_update_staff"
  ON public.meetings FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meetings.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meetings.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mai_select_tenant"
  ON public.meeting_agenda_items FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mai_write_staff"
  ON public.meeting_agenda_items FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_agenda_items.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mai_update_staff"
  ON public.meeting_agenda_items FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_agenda_items.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mai_delete_staff"
  ON public.meeting_agenda_items FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_agenda_items.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mat_select_tenant"
  ON public.meeting_attendees FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mat_write_staff"
  ON public.meeting_attendees FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_attendees.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mat_update_staff"
  ON public.meeting_attendees FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_attendees.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mat_delete_staff"
  ON public.meeting_attendees FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_attendees.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mv_select_tenant"
  ON public.meeting_votes FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mv_insert_self"
  ON public.meeting_votes FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND voter_id = (SELECT auth.uid())
  );

CREATE POLICY "mv_update_staff"
  ON public.meeting_votes FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_votes.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mv_delete_staff"
  ON public.meeting_votes FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_votes.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mdoc_select_tenant"
  ON public.meeting_documents FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mdoc_insert_staff"
  ON public.meeting_documents FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_documents.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "mdoc_mod_tenant"
  ON public.meeting_documents FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mdoc_del_tenant"
  ON public.meeting_documents FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mqt_all_tenant"
  ON public.meeting_quota_tracker FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

DO $mr$
BEGIN
  IF to_regclass('public.meeting_records') IS NOT NULL THEN
    EXECUTE $p$
      CREATE POLICY "mrec_all_tenant"
        ON public.meeting_records FOR ALL TO authenticated
        USING (property_id IN (SELECT public.user_property_ids()))
        WITH CHECK (property_id IN (SELECT public.user_property_ids()));
    $p$;
  END IF;
END $mr$;

-- ---------------------------------------------------------------------------
-- procurement
-- ---------------------------------------------------------------------------

CREATE POLICY "pj_select_tenant"
  ON public.procurement_jobs FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pj_insert_tenant"
  ON public.procurement_jobs FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pj_update_tenant"
  ON public.procurement_jobs FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pj_delete_tenant"
  ON public.procurement_jobs FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pq_all_tenant"
  ON public.procurement_quotes FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pph_all_tenant"
  ON public.procurement_photos FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pinv_all_tenant"
  ON public.procurement_invoices FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pal_all_tenant"
  ON public.procurement_audit_log FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pqn_all_tenant"
  ON public.procurement_quote_notifications FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

-- ---------------------------------------------------------------------------
-- hiring + property_managers
-- ---------------------------------------------------------------------------

CREATE POLICY "hj_all_tenant"
  ON public.hiring_jobs FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "hc_all_tenant"
  ON public.hiring_candidates FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "pmgr_all_tenant"
  ON public.property_managers FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

-- ---------------------------------------------------------------------------
-- residents + owner_info + deregistration
-- ---------------------------------------------------------------------------

CREATE POLICY "res_select_tenant"
  ON public.residents FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = residents.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

CREATE POLICY "res_insert_tenant"
  ON public.residents FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = residents.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

CREATE POLICY "res_update_tenant"
  ON public.residents FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = residents.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "res_delete_tenant"
  ON public.residents FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = residents.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "oi_all_tenant"
  ON public.owner_info FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "dr_all_tenant"
  ON public.deregistration_requests FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

-- ---------------------------------------------------------------------------
-- disputes subtree
-- ---------------------------------------------------------------------------

CREATE POLICY "dsp_select_tenant"
  ON public.disputes FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "dsp_mod_tenant"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND reporter_id = (SELECT auth.uid())
  );

CREATE POLICY "dsp_update_tenant"
  ON public.disputes FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "dsm_all_tenant"
  ON public.dispute_messages FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "dse_all_tenant"
  ON public.dispute_evidence FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "dst_all_tenant"
  ON public.dispute_timeline FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

-- ---------------------------------------------------------------------------
-- finance rest
-- ---------------------------------------------------------------------------

CREATE POLICY "ledger_all_tenant"
  ON public.ledger_transactions FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ms_select_tenant"
  ON public.monthly_summaries FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      published = true
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = monthly_summaries.property_id
                  AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

CREATE POLICY "ms_write_staff"
  ON public.monthly_summaries FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = monthly_summaries.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

CREATE POLICY "ms_update_staff"
  ON public.monthly_summaries FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = monthly_summaries.property_id
                AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "sl_all_tenant"
  ON public.special_levies FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "od_all_tenant"
  ON public.owner_documents FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "cd_all_tenant"
  ON public.compliance_docs FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "vsr_all_tenant"
  ON public.vendor_search_results FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "vr_all_tenant"
  ON public.vendor_ratings FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ph_all_tenant"
  ON public.price_history FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "vreg_all_tenant"
  ON public.vendor_registry FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT ON public.property_members TO authenticated;
GRANT SELECT ON public.property_invites TO authenticated;
GRANT SELECT ON public.join_requests TO authenticated;
GRANT ALL ON public.property_members TO service_role;
GRANT ALL ON public.property_invites TO service_role;
GRANT ALL ON public.join_requests TO service_role;

DROP POLICY IF EXISTS "properties_update_staff" ON public.properties;
CREATE POLICY "properties_update_staff"
  ON public.properties FOR UPDATE TO authenticated
  USING (
    id IN (SELECT public.user_property_ids())
    AND id IN (SELECT public.user_property_admin_ids())
  )
  WITH CHECK (id IN (SELECT public.user_property_ids()));




