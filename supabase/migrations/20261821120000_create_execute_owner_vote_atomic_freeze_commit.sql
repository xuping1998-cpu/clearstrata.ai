-- E-02 / RU-1.2 — Atomic Commit Envelope, Ownership & Reconciliation (Artifact A–G RPC)
-- Authority: E-02-RU-1.2-Implementation-Authorization.md · E-02-RU-1.2-Implementation-Review.md
-- Scope: public.execute_owner_vote_atomic_freeze_commit only. No ownership table. No legacy RPC.
-- Prior migration head: 20261729120000_create_owner_vote_primary_freeze_audits.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Internal durable-state evaluator (not granted to authenticated)
-- Returns IDEMPOTENT_RETURN payload when full durable A–G exists.
-- Returns NULL when no durable footprint.
-- Raises on partial / inconsistent durable state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ru12_evaluate_durable_state(p_owner_vote_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_marker timestamptz;
  v_primary_event_id uuid;
  v_primary_count int;
  v_audit_id uuid;
  v_audit_attempt uuid;
  v_voter_count int;
  v_resolution_count int;
  v_motion_count int;
  v_footprint boolean;
BEGIN
  SELECT m.property_id, m.snapshot_frozen_at
  INTO v_property_id, v_marker
  FROM public.owner_vote_meetings m
  WHERE m.id = p_owner_vote_meeting_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  SELECT count(*)::int, max(fe.id)
  INTO v_primary_count, v_primary_event_id
  FROM public.owner_vote_freeze_events fe
  WHERE fe.owner_vote_meeting_id = p_owner_vote_meeting_id
    AND fe.is_primary IS TRUE;

  v_footprint := (
    coalesce(v_primary_count, 0) > 0
    OR EXISTS (
      SELECT 1
      FROM public.owner_vote_primary_freeze_audits a
      WHERE a.owner_vote_meeting_id = p_owner_vote_meeting_id
    )
    OR v_marker IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.owner_vote_voter_snapshot vs
      INNER JOIN public.owner_vote_freeze_events fe
        ON fe.id = vs.freeze_event_id
      WHERE fe.owner_vote_meeting_id = p_owner_vote_meeting_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.owner_vote_resolution_snapshot rs
      WHERE rs.owner_vote_meeting_id = p_owner_vote_meeting_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.owner_vote_frozen_motions fm
      WHERE fm.owner_vote_meeting_id = p_owner_vote_meeting_id
    )
  );

  IF NOT v_footprint THEN
    RETURN NULL;
  END IF;

  IF coalesce(v_primary_count, 0) <> 1 OR v_primary_event_id IS NULL THEN
    RAISE EXCEPTION 'partial_durable_state:primary_event';
  END IF;

  IF v_marker IS NULL THEN
    RAISE EXCEPTION 'partial_durable_state:incomplete_envelope';
  END IF;

  IF (
    SELECT count(*)::int
    FROM public.owner_vote_primary_freeze_audits a
    WHERE a.freeze_event_id = v_primary_event_id
  ) <> 1 THEN
    RAISE EXCEPTION 'partial_durable_state:audit_cardinality';
  END IF;

  SELECT a.id, a.attempt_id
  INTO v_audit_id, v_audit_attempt
  FROM public.owner_vote_primary_freeze_audits a
  WHERE a.freeze_event_id = v_primary_event_id;

  IF v_audit_id IS NULL THEN
    RAISE EXCEPTION 'partial_durable_state:incomplete_envelope';
  END IF;

  SELECT count(*)::int
  INTO v_voter_count
  FROM public.owner_vote_voter_snapshot vs
  WHERE vs.freeze_event_id = v_primary_event_id;

  SELECT count(*)::int
  INTO v_resolution_count
  FROM public.owner_vote_resolution_snapshot rs
  WHERE rs.freeze_event_id = v_primary_event_id;

  SELECT count(*)::int
  INTO v_motion_count
  FROM public.owner_vote_frozen_motions fm
  WHERE fm.freeze_event_id = v_primary_event_id;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_primary_freeze_audits a
    WHERE a.freeze_event_id = v_primary_event_id
      AND (
        a.owner_vote_meeting_id IS DISTINCT FROM p_owner_vote_meeting_id
        OR a.property_id IS DISTINCT FROM v_property_id
        OR a.primary_event_is_primary IS NOT TRUE
        OR a.voter_snapshot_count IS DISTINCT FROM v_voter_count
        OR a.resolution_snapshot_count IS DISTINCT FROM v_resolution_count
        OR a.frozen_motion_count IS DISTINCT FROM v_motion_count
      )
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:audit_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_freeze_events fe
    WHERE fe.id = v_primary_event_id
      AND (
        fe.owner_vote_meeting_id IS DISTINCT FROM p_owner_vote_meeting_id
        OR fe.property_id IS DISTINCT FROM v_property_id
        OR fe.is_primary IS NOT TRUE
      )
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:event_correlation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_voter_snapshot vs
    WHERE vs.freeze_event_id = v_primary_event_id
      AND vs.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:voter_property';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_resolution_snapshot rs
    WHERE rs.freeze_event_id = v_primary_event_id
      AND rs.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:resolution_property';
  END IF;

  IF v_resolution_count NOT IN (0, 1) THEN
    RAISE EXCEPTION 'partial_durable_state:resolution_cardinality';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_frozen_motions fm
    WHERE fm.freeze_event_id = v_primary_event_id
      AND fm.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:motion_property';
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'IDEMPOTENT_RETURN',
    'owner_vote_meeting_id', p_owner_vote_meeting_id,
    'freeze_event_id', v_primary_event_id,
    'primary_audit_id', v_audit_id,
    'property_id', v_property_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public._ru12_evaluate_durable_state(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public._ru12_evaluate_durable_state(uuid) IS
  'E-02 RU-1.2 internal — durable A–G reconciliation. Not a public API.';

-- ---------------------------------------------------------------------------
-- public.execute_owner_vote_atomic_freeze_commit
-- One SECURITY DEFINER invocation = one implicit PostgreSQL transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_owner_vote_atomic_freeze_commit(
  p_owner_vote_meeting_id uuid,
  p_attempt_id uuid,
  p_freeze_event_id uuid,
  p_primary_audit_id uuid,
  p_freeze_boundary_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_marker timestamptz;
  v_status text;
  v_reconcile jsonb;
  v_lock_key bigint;
  v_lock_ok boolean;
  v_resolution_snapshot_id uuid;
  v_voter_count int;
  v_resolution_count int;
  v_motion_count int;
  v_qualifying_resolutions int;
  v_server_correlation uuid;
  v_materialization_summary jsonb;
  v_marker_evidence jsonb;
  v_lifecycle_evidence jsonb;
  v_commit_evidence jsonb;
  v_f_verify jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_owner_vote_meeting_id IS NULL THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  IF p_attempt_id IS NULL OR p_freeze_event_id IS NULL OR p_primary_audit_id IS NULL THEN
    RAISE EXCEPTION 'identity_required';
  END IF;

  IF p_freeze_boundary_at IS NULL THEN
    RAISE EXCEPTION 'freeze_boundary_at_required';
  END IF;

  SELECT m.property_id, m.snapshot_frozen_at, lower(trim(both FROM coalesce(m.status::text, '')))
  INTO v_property_id, v_marker, v_status
  FROM public.owner_vote_meetings m
  WHERE m.id = p_owner_vote_meeting_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.property_id = v_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role IN (
        'council'::public.user_role,
        'admin'::public.user_role,
        'property_admin'::public.user_role
      )
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- STEP 2: initial durable reconciliation
  v_reconcile := public._ru12_evaluate_durable_state(p_owner_vote_meeting_id);
  IF v_reconcile IS NOT NULL THEN
    RETURN v_reconcile;
  END IF;

  -- STEP 3: meeting-scoped advisory xact lock (non-blocking)
  v_lock_key := hashtextextended(
    'e02_owner_vote_freeze:' || p_owner_vote_meeting_id::text,
    0
  );
  v_lock_ok := pg_try_advisory_xact_lock(v_lock_key);

  IF NOT v_lock_ok THEN
    RETURN jsonb_build_object(
      'outcome', 'RETRYABLE',
      'owner_vote_meeting_id', p_owner_vote_meeting_id,
      'retry_classification', 'active_in_flight_owner'
    );
  END IF;

  -- STEP 4: post-lock durable double-check
  v_reconcile := public._ru12_evaluate_durable_state(p_owner_vote_meeting_id);
  IF v_reconcile IS NOT NULL THEN
    RETURN v_reconcile;
  END IF;

  -- STEP 5: fresh identity validation (consume Phase 1/3 IDs — no allocation)
  IF EXISTS (SELECT 1 FROM public.owner_vote_freeze_events fe WHERE fe.id = p_freeze_event_id) THEN
    RETURN jsonb_build_object(
      'outcome', 'NEW_ATTEMPT_REQUIRED',
      'owner_vote_meeting_id', p_owner_vote_meeting_id,
      'retry_classification', 'freeze_event_id_reused'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM public.owner_vote_primary_freeze_audits a WHERE a.id = p_primary_audit_id) THEN
    RETURN jsonb_build_object(
      'outcome', 'NEW_ATTEMPT_REQUIRED',
      'owner_vote_meeting_id', p_owner_vote_meeting_id,
      'retry_classification', 'primary_audit_id_reused'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.owner_vote_primary_freeze_audits a WHERE a.attempt_id = p_attempt_id
  ) THEN
    RETURN jsonb_build_object(
      'outcome', 'NEW_ATTEMPT_REQUIRED',
      'owner_vote_meeting_id', p_owner_vote_meeting_id,
      'retry_classification', 'attempt_id_reused'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_freeze_events fe
    WHERE fe.owner_vote_meeting_id = p_owner_vote_meeting_id
      AND fe.is_primary IS TRUE
  ) THEN
    RAISE EXCEPTION 'partial_durable_state:unexpected_primary';
  END IF;

  -- Artifact F: verify-only — marker must not already exist for new envelope
  IF v_marker IS NOT NULL THEN
    RAISE EXCEPTION 'snapshot_already_frozen';
  END IF;

  SELECT count(*)::int
  INTO v_qualifying_resolutions
  FROM public.owner_vote_resolutions r
  WHERE r.meeting_id = p_owner_vote_meeting_id
    AND trim(both FROM coalesce(r.title, '')) <> ''
    AND trim(both FROM coalesce(r.threshold, '')) <> '';

  IF coalesce(v_qualifying_resolutions, 0) < 1 THEN
    RAISE EXCEPTION 'no_qualifying_resolutions';
  END IF;

  v_server_correlation := gen_random_uuid();

  -- A: Freeze Event
  INSERT INTO public.owner_vote_freeze_events (
    id,
    owner_vote_meeting_id,
    property_id,
    frozen_at,
    is_primary
  ) VALUES (
    p_freeze_event_id,
    p_owner_vote_meeting_id,
    v_property_id,
    p_freeze_boundary_at,
    TRUE
  );

  -- B: Voter Snapshot (IU-2.1 PEC rank-1 per unit from property_members)
  INSERT INTO public.owner_vote_voter_snapshot (
    meeting_id,
    property_id,
    unit_no,
    user_id,
    role,
    is_eligible,
    frozen_at,
    freeze_event_id
  )
  SELECT
    p_owner_vote_meeting_id,
    v_property_id,
    trim(both FROM ranked.unit_no),
    ranked.user_id,
    ranked.role::text,
    TRUE,
    p_freeze_boundary_at,
    p_freeze_event_id
  FROM (
    SELECT
      pm.user_id,
      coalesce(nullif(trim(both FROM pm.unit_no), ''), nullif(trim(both FROM pm.unit_number), '')) AS unit_no,
      pm.role,
      row_number() OVER (
        PARTITION BY lower(trim(both FROM coalesce(nullif(trim(both FROM pm.unit_no), ''), nullif(trim(both FROM pm.unit_number), ''))))
        ORDER BY
          CASE WHEN lower(trim(both FROM pm.role::text)) = 'council' THEN 1 ELSE 2 END,
          pm.user_id
      ) AS rn
    FROM public.property_members pm
    WHERE pm.property_id = v_property_id
      AND pm.status = 'active'::public.member_status
      AND lower(trim(both FROM pm.role::text)) IN ('owner', 'council')
      AND coalesce(nullif(trim(both FROM pm.unit_no), ''), nullif(trim(both FROM pm.unit_number), '')) IS NOT NULL
  ) ranked
  WHERE ranked.rn = 1;

  GET DIAGNOSTICS v_voter_count = ROW_COUNT;
  IF coalesce(v_voter_count, 0) < 1 THEN
    RAISE EXCEPTION 'no_eligible_voters';
  END IF;

  -- C: Resolution Snapshot header (IU-2.2)
  v_resolution_snapshot_id := gen_random_uuid();

  INSERT INTO public.owner_vote_resolution_snapshot (
    id,
    freeze_event_id,
    owner_vote_meeting_id,
    property_id,
    frozen_at
  ) VALUES (
    v_resolution_snapshot_id,
    p_freeze_event_id,
    p_owner_vote_meeting_id,
    v_property_id,
    p_freeze_boundary_at
  );

  v_resolution_count := 1;

  -- D: Frozen Motions (IU-2.3)
  INSERT INTO public.owner_vote_frozen_motions (
    resolution_snapshot_id,
    freeze_event_id,
    owner_vote_meeting_id,
    property_id,
    display_order,
    title,
    description,
    threshold,
    vote_method,
    source_agenda_item_id,
    source_resolution_id,
    source_formal_resolution_version,
    frozen_at
  )
  SELECT
    v_resolution_snapshot_id,
    p_freeze_event_id,
    p_owner_vote_meeting_id,
    v_property_id,
    coalesce(r.display_order, 0),
    trim(both FROM r.title),
    r.description,
    trim(both FROM r.threshold),
    NULL,
    NULL,
    r.id,
    NULL,
    p_freeze_boundary_at
  FROM public.owner_vote_resolutions r
  WHERE r.meeting_id = p_owner_vote_meeting_id
    AND trim(both FROM coalesce(r.title, '')) <> ''
    AND trim(both FROM coalesce(r.threshold, '')) <> ''
  ORDER BY coalesce(r.display_order, 0), r.id;

  GET DIAGNOSTICS v_motion_count = ROW_COUNT;

  IF v_motion_count IS DISTINCT FROM v_qualifying_resolutions THEN
    RAISE EXCEPTION 'motion_set_incomplete';
  END IF;

  -- F: Artifact F verify-only (no owner_vote_meetings.status UPDATE)
  v_f_verify := jsonb_build_object(
    'checks_performed', jsonb_build_array(
      'meeting_exists',
      'marker_absent_before_freeze',
      'qualifying_resolutions_present',
      'eligible_voters_present'
    ),
    'lifecycle_observations', jsonb_build_object(
      'meeting_status', v_status,
      'snapshot_frozen_at_before', NULL
    ),
    'compatible', TRUE,
    'status_mutated', FALSE
  );

  -- E: Marker
  UPDATE public.owner_vote_meetings
  SET snapshot_frozen_at = p_freeze_boundary_at
  WHERE id = p_owner_vote_meeting_id
    AND snapshot_frozen_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marker_write_failed';
  END IF;

  -- GATE-PROP-001..005 before G
  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_freeze_events fe
    WHERE fe.id = p_freeze_event_id
      AND fe.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'property_correlation_failure:event';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_voter_snapshot vs
    WHERE vs.freeze_event_id = p_freeze_event_id
      AND vs.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'property_correlation_failure:voter';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_resolution_snapshot rs
    WHERE rs.freeze_event_id = p_freeze_event_id
      AND rs.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'property_correlation_failure:resolution';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owner_vote_frozen_motions fm
    WHERE fm.freeze_event_id = p_freeze_event_id
      AND fm.property_id IS DISTINCT FROM v_property_id
  ) THEN
    RAISE EXCEPTION 'property_correlation_failure:motion';
  END IF;

  -- W: primary event validation immediately before G
  IF NOT EXISTS (
    SELECT 1
    FROM public.owner_vote_freeze_events fe
    WHERE fe.id = p_freeze_event_id
      AND fe.owner_vote_meeting_id = p_owner_vote_meeting_id
      AND fe.property_id = v_property_id
      AND fe.is_primary IS TRUE
  ) THEN
    RAISE EXCEPTION 'primary_event_invalid';
  END IF;

  v_materialization_summary := jsonb_build_object(
    'envelope_version', 1,
    'artifacts_present', jsonb_build_object(
      'A', TRUE, 'B', TRUE, 'C', TRUE, 'D', TRUE, 'E', TRUE, 'F', TRUE, 'G', TRUE
    ),
    'freeze_event_id', p_freeze_event_id,
    'attempt_id', p_attempt_id,
    'voter_snapshot_count', v_voter_count,
    'resolution_snapshot_count', v_resolution_count,
    'frozen_motion_count', v_motion_count
  );

  v_marker_evidence := jsonb_build_object(
    'snapshot_frozen_at', p_freeze_boundary_at,
    'freeze_boundary_at', p_freeze_boundary_at,
    'meeting_id', p_owner_vote_meeting_id,
    'boundary_aligned', TRUE
  );

  v_lifecycle_evidence := v_f_verify;

  v_commit_evidence := jsonb_build_object(
    'envelope_version', 1,
    'server_correlation_id', v_server_correlation,
    'validated_component_flags', jsonb_build_object(
      'A', TRUE, 'B', TRUE, 'C', TRUE, 'D', TRUE, 'E', TRUE, 'F', TRUE
    ),
    'expected_identities', jsonb_build_object(
      'attempt_id', p_attempt_id,
      'freeze_event_id', p_freeze_event_id,
      'primary_audit_id', p_primary_audit_id
    ),
    'envelope_prepared', TRUE
  );

  -- G: Primary Audit INSERT (20-column RU-1.1 contract)
  INSERT INTO public.owner_vote_primary_freeze_audits (
    id,
    freeze_event_id,
    owner_vote_meeting_id,
    property_id,
    attempt_id,
    freeze_boundary_at,
    audit_kind,
    schema_version,
    primary_event_is_primary,
    voter_snapshot_count,
    resolution_snapshot_count,
    frozen_motion_count,
    materialization_summary,
    commit_set_result,
    marker_evidence,
    meeting_lifecycle_compatibility,
    transaction_outcome,
    commit_evidence,
    transaction_reference_at
  ) VALUES (
    p_primary_audit_id,
    p_freeze_event_id,
    p_owner_vote_meeting_id,
    v_property_id,
    p_attempt_id,
    p_freeze_boundary_at,
    'PRIMARY_FREEZE_AUDIT',
    1,
    TRUE,
    v_voter_count,
    v_resolution_count,
    v_motion_count,
    v_materialization_summary,
    'ATOMIC_SET_COMPLETE',
    v_marker_evidence,
    v_lifecycle_evidence,
    'ATOMIC_ENVELOPE_MEMBER',
    v_commit_evidence,
    transaction_timestamp()
  );

  -- AA: final verification
  IF NOT EXISTS (
    SELECT 1
    FROM public.owner_vote_primary_freeze_audits a
    WHERE a.id = p_primary_audit_id
      AND a.freeze_event_id = p_freeze_event_id
      AND a.owner_vote_meeting_id = p_owner_vote_meeting_id
      AND a.property_id = v_property_id
      AND a.primary_event_is_primary IS TRUE
      AND a.voter_snapshot_count = v_voter_count
      AND a.resolution_snapshot_count = v_resolution_count
      AND a.frozen_motion_count = v_motion_count
  ) THEN
    RAISE EXCEPTION 'final_verification_failed:audit';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.owner_vote_meetings m
    WHERE m.id = p_owner_vote_meeting_id
      AND m.snapshot_frozen_at = p_freeze_boundary_at
  ) THEN
    RAISE EXCEPTION 'final_verification_failed:marker';
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'ATOMIC_ENVELOPE_COMPLETE',
    'owner_vote_meeting_id', p_owner_vote_meeting_id,
    'freeze_event_id', p_freeze_event_id,
    'primary_audit_id', p_primary_audit_id,
    'property_id', v_property_id
  );
END;
$$;

COMMENT ON FUNCTION public.execute_owner_vote_atomic_freeze_commit(
  uuid, uuid, uuid, uuid, timestamptz
) IS
  'E-02 RU-1.2 — atomic A–G commit envelope. One invocation = one DB transaction. '
  'Outcomes: IDEMPOTENT_RETURN, RETRYABLE, NEW_ATTEMPT_REQUIRED, ATOMIC_ENVELOPE_COMPLETE. '
  'Not Runtime COMMITTED authority.';

REVOKE ALL ON FUNCTION public.execute_owner_vote_atomic_freeze_commit(
  uuid, uuid, uuid, uuid, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.execute_owner_vote_atomic_freeze_commit(
  uuid, uuid, uuid, uuid, timestamptz
) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
