/*
  # approve_join_request: residents UPDATE only (no INSERT)

  - Removes all `INSERT INTO public.residents` paths to avoid duplicates / unique violations.
  - Activates existing roster row: `UPDATE residents SET status = 'active'`
    where `user_id = applicant` **and** `property_id = join_requests.property_id` (required for multi-property).
  - Keeps `property_members` upsert (`ON CONFLICT DO UPDATE`) and `join_requests` → approved.
*/

CREATE OR REPLACE FUNCTION public.approve_join_request(
  p_join_request_id uuid,
  p_reviewer_id uuid,
  p_unit_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  r public.join_requests%ROWTYPE;
  inv public.property_invites%ROWTYPE;
  v_unit text;
  v_target_uid uuid;
  v_membership_created boolean := false;
  v_user_linked boolean := false;
  v_role public.user_role;
  v_property_name text;
  v_target_email text;
  v_residents_outcome text;
  v_had_active_pm_before boolean := false;
  v_had_active_pm_after boolean := false;
  v_res_updated int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_reviewer_id IS NULL OR p_reviewer_id <> v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reviewer');
  END IF;

  SELECT * INTO r FROM public.join_requests WHERE id = p_join_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF r.status <> 'pending'::join_request_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_processed');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_actor
      AND pm.property_id = r.property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT p.name INTO v_property_name FROM public.properties p WHERE p.id = r.property_id;
  v_property_name := COALESCE(NULLIF(trim(v_property_name), ''), 'Property');

  v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(r.unit_number), ''), '');
  IF v_unit = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_unit_number');
  END IF;

  v_role := COALESCE(r.requested_role, 'owner'::public.user_role);
  v_target_email := NULLIF(trim(COALESCE(r.email, '')), '');

  v_target_uid := r.user_id;

  IF v_target_uid IS NULL AND v_target_email IS NOT NULL AND length(v_target_email) > 0 THEN
    SELECT u.id
    INTO v_target_uid
    FROM auth.users u
    WHERE lower(u.email::text) = lower(v_target_email)
    LIMIT 1;
  END IF;

  IF v_target_uid IS NULL AND v_target_email IS NOT NULL AND length(v_target_email) > 0 THEN
    SELECT p.id
    INTO v_target_uid
    FROM public.profiles p
    WHERE lower(trim(coalesce(p.email, ''))) = lower(v_target_email)
    ORDER BY p.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_target_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'applicant_not_found');
  END IF;

  v_user_linked := true;
  IF v_target_email IS NULL OR v_target_email = '' THEN
    SELECT NULLIF(trim(u.email::text), '')
    INTO v_target_email
    FROM auth.users u
    WHERE u.id = v_target_uid
    LIMIT 1;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_target_uid
      AND pm.property_id = r.property_id
      AND pm.status = 'active'::public.member_status
  )
  INTO v_had_active_pm_before;

  UPDATE public.residents
  SET
    status = 'active',
    updated_at = now()
  WHERE user_id = v_target_uid
    AND property_id = r.property_id;

  GET DIAGNOSTICS v_res_updated = ROW_COUNT;

  v_residents_outcome := CASE
    WHEN v_res_updated > 0 THEN 'activated'
    ELSE 'no_matching_resident_row'
  END;

  UPDATE public.profiles prof
  SET
    status = 'active',
    updated_at = now()
  WHERE prof.id = v_target_uid;

  INSERT INTO public.property_members (
    property_id, user_id, role, status, unit_number, approved_by, approved_at
  )
  VALUES (
    r.property_id,
    v_target_uid,
    v_role,
    'active'::public.member_status,
    trim(v_unit),
    p_reviewer_id,
    now()
  )
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'active'::public.member_status,
    unit_number = COALESCE(
      NULLIF(trim(EXCLUDED.unit_number::text), ''),
      NULLIF(trim(public.property_members.unit_number::text), '')
    ),
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_target_uid
      AND pm.property_id = r.property_id
      AND pm.status = 'active'::public.member_status
  )
  INTO v_had_active_pm_after;

  v_membership_created := v_had_active_pm_after AND NOT v_had_active_pm_before;

  UPDATE public.join_requests
  SET
    status = 'approved'::join_request_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    rejection_reason = NULL,
    user_id = v_target_uid,
    updated_at = now()
  WHERE id = p_join_request_id;

  IF r.invite_id IS NOT NULL THEN
    SELECT * INTO inv FROM public.property_invites WHERE id = r.invite_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.property_invites
      SET used_count = used_count + 1
      WHERE id = inv.id;

      IF inv.max_uses > 0 AND (inv.used_count + 1) >= inv.max_uses THEN
        UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
      END IF;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.user_notifications (
      user_id, type, title, message, related_property_id, related_join_request_id
    )
    VALUES (
      v_target_uid,
      'join_request_approved',
      '加入申请已通过',
      format('您已获准加入 %s', v_property_name),
      r.property_id,
      p_join_request_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'user_notifications insert failed: %', SQLERRM;
  END;

  IF v_had_active_pm_before THEN
    RETURN jsonb_build_object(
      'success', true,
      'membership_created', false,
      'user_linked', true,
      'message', 'already_member',
      'property_id', r.property_id,
      'property_name', v_property_name,
      'target_user_id', v_target_uid,
      'target_email', v_target_email,
      'unit_no', trim(v_unit),
      'residents_outcome', v_residents_outcome,
      'residents_rows_updated', v_res_updated,
      'property_members_upserted', true,
      'join_request_status_updated', true
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'membership_created', v_membership_created,
    'user_linked', true,
    'property_id', r.property_id,
    'property_name', v_property_name,
    'target_user_id', v_target_uid,
    'target_email', v_target_email,
    'unit_no', trim(v_unit),
    'residents_outcome', v_residents_outcome,
    'residents_rows_updated', v_res_updated,
    'property_members_upserted', true,
    'property_members_inserted', v_membership_created,
    'join_request_status_updated', true
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request(uuid, uuid, text) IS
  'Approves join request: UPDATE residents to active for (property_id, user_id) only — no residents INSERT; upsert property_members; mark join_requests approved.';

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) TO authenticated;
