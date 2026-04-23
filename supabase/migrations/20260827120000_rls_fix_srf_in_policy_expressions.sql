/*
  # RLS: fix “set-returning functions are not allowed in policy expressions”

  Do **not** use:
  - property_id = ANY(user_property_ids())  -- SRF in scalar context
  - is_public_demo_property(property_id)     -- if ever defined as SRF or mis-resolved; RLS below inlines demo check

  Use:
  - property_id IN (SELECT public.user_property_ids())
  - property_id IN (SELECT public.user_property_staff_ids())  -- if needed
  - EXISTS (SELECT 1 FROM public.resolve_public_demo_property('BCS3736') d WHERE d.id = <table>.property_id)

  Rebuilds policies for: join_requests, invoices, procurement_jobs (idempotent: DROP IF EXISTS + CREATE).
*/

-- ---------------------------------------------------------------------------
-- 1) join_requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "join_requests_select_public_demo_read" ON public.join_requests;
DROP POLICY IF EXISTS "jr_select_scope" ON public.join_requests;
DROP POLICY IF EXISTS "jr_insert_own" ON public.join_requests;

CREATE POLICY "jr_select_scope"
  ON public.join_requests FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      property_id IN (SELECT public.user_property_ids())
      AND EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = join_requests.property_id
          AND pm.status = 'active'
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.resolve_public_demo_property('BCS3736') AS d
      WHERE d.id = join_requests.property_id
    )
  );

GRANT INSERT ON public.join_requests TO authenticated;

CREATE POLICY "jr_insert_own"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.resolve_public_demo_property('BCS3736') AS d
        WHERE d.id = join_requests.property_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = join_requests.property_id
          AND pm.status = 'active'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2) invoices
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "inv_select_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_insert_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_update_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_delete_tenant" ON public.invoices;

CREATE POLICY "inv_select_tenant"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    OR EXISTS (
      SELECT 1
      FROM public.resolve_public_demo_property('BCS3736') AS d
      WHERE d.id = invoices.property_id
    )
  );

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
        SELECT 1
        FROM public.property_members pm
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
        SELECT 1
        FROM public.property_members pm
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
        SELECT 1
        FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = invoices.property_id
          AND pm.status = 'active'
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) procurement_jobs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pj_select_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_insert_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_update_tenant" ON public.procurement_jobs;
DROP POLICY IF EXISTS "pj_delete_tenant" ON public.procurement_jobs;

CREATE POLICY "pj_select_tenant"
  ON public.procurement_jobs FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    OR EXISTS (
      SELECT 1
      FROM public.resolve_public_demo_property('BCS3736') AS d
      WHERE d.id = procurement_jobs.property_id
    )
  );

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

NOTIFY pgrst, 'reload schema';
