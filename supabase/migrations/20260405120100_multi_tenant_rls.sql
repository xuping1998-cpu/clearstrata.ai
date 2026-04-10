/*
  # Multi-tenant RLS: drop legacy policies on business tables, add property isolation

  Assumes 20260405120000_multi_tenant_properties.sql applied (property_id NOT NULL).
*/

-- ---------------------------------------------------------------------------
-- Drop all existing policies on tenant-scoped tables
-- ---------------------------------------------------------------------------

DO $drop$
DECLARE
  t text;
  r record;
  tables text[] := ARRAY[
    'community_notifications','invoices','invoice_audit_log','financial_anomalies',
    'meetings','meeting_agenda_items','meeting_attendees','meeting_votes',
    'meeting_documents','meeting_quota_tracker','meeting_records',
    'procurement_jobs','procurement_quotes','procurement_photos','procurement_invoices',
    'procurement_audit_log','procurement_quote_notifications',
    'hiring_jobs','hiring_candidates','property_managers',
    'residents','owner_info','deregistration_requests',
    'disputes','dispute_messages','dispute_evidence','dispute_timeline',
    'ledger_transactions','monthly_summaries','special_levies','owner_documents','compliance_docs',
    'vendor_search_results','vendor_ratings','price_history','vendor_registry'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      FOR r IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $drop$;

-- ---------------------------------------------------------------------------
-- Helpers (inline subqueries use user_property_ids() from prior migration)
-- ---------------------------------------------------------------------------
-- staff_in_property(tbl.property_id): user has council|admin|manager on that property

-- ---------------------------------------------------------------------------
-- community_notifications
-- ---------------------------------------------------------------------------

CREATE POLICY "cn_select_tenant"
  ON public.community_notifications FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "cn_insert_staff"
  ON public.community_notifications FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = community_notifications.property_id
        AND pu.role IN ('admin', 'manager', 'council')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = invoices.property_id
          AND pu.role IN ('council', 'admin', 'manager')
      )
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND (
      uploaded_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = invoices.property_id
          AND pu.role IN ('council', 'admin', 'manager')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = invoices.property_id
          AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = invoice_audit_log.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meetings.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  );

CREATE POLICY "mtg_update_staff"
  ON public.meetings FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meetings.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meetings.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_agenda_items.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  );

CREATE POLICY "mai_update_staff"
  ON public.meeting_agenda_items FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_agenda_items.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mai_delete_staff"
  ON public.meeting_agenda_items FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_agenda_items.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_attendees.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  );

CREATE POLICY "mat_update_staff"
  ON public.meeting_attendees FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_attendees.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mat_delete_staff"
  ON public.meeting_attendees FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_attendees.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_votes.property_id
        AND pu.role IN ('council', 'admin', 'manager')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mv_delete_staff"
  ON public.meeting_votes FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_votes.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = meeting_documents.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = residents.property_id
          AND pu.role IN ('council', 'admin', 'manager')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = residents.property_id
          AND pu.role IN ('council', 'admin', 'manager')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = residents.property_id
          AND pu.role IN ('council', 'admin', 'manager')
      )
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "res_delete_tenant"
  ON public.residents FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = residents.property_id
        AND pu.role IN ('council', 'admin', 'manager')
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
        SELECT 1 FROM public.property_users pu
        WHERE pu.user_id = (SELECT auth.uid())
          AND pu.property_id = monthly_summaries.property_id
          AND pu.role IN ('council', 'admin')
      )
    )
  );

CREATE POLICY "ms_write_staff"
  ON public.monthly_summaries FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = monthly_summaries.property_id
        AND pu.role IN ('council', 'admin')
    )
  );

CREATE POLICY "ms_update_staff"
  ON public.monthly_summaries FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_users pu
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.property_id = monthly_summaries.property_id
        AND pu.role IN ('council', 'admin')
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




