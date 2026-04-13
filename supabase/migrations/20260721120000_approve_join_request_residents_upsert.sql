/*
  # approve_join_request: upsert `residents` by unit, then `property_members`

  - Resolves applicant `user_id` (join row or auth.users by email).
  - Requires non-empty unit (override or join_requests.unit_number).
  - **Match** existing `residents` row for (property_id, unit_no): bind `user_id` if slot empty/same user.
  - **Else** **INSERT** a new `residents` row for that unit + user.
  - If unit row has another `user_id` → `unit_already_bound`.
  - Then upserts `property_members` (existing logic); `residents` trigger may also insert PM.
  - Activates applicant `profiles.status` when linked.
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
  v_membership_exists boolean := false;
  v_membership_created boolean := false;
  v_user_linked boolean := false;
  v_role public.user_role;
  v_property_name text;
  v_target_email text;
  v_res public.residents%ROWTYPE;
  v_res_row_exists boolean := false;
  v_residents_outcome text;
  v_prof public.profiles%ROWTYPE;
  v_name_en text;
  v_name_zh text;
  v_phone text;
  v_email_row text;
  v_pm_before_residents boolean := false;
  v_pm_after_residents boolean := false;
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
  IF v_target_uid IS NULL AND r.email IS NOT NULL AND length(trim(r.email)) > 0 THEN
    SELECT u.id
    INTO v_target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(r.email))
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
  )
  INTO v_pm_before_residents;

  SELECT *
  INTO v_res
  FROM public.residents res
  WHERE res.property_id = r.property_id
    AND lower(trim(res.unit_no)) = lower(trim(v_unit))
  LIMIT 1
  FOR UPDATE;

  v_res_row_exists := FOUND;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_target_uid;

  v_name_en := COALESCE(
    NULLIF(trim(r.full_name), ''),
    NULLIF(trim(v_prof.full_name_en), ''),
    split_part(COALESCE(v_target_email, 'owner'), '@', 1),
    'Owner'
  );
  v_name_zh := NULLIF(trim(v_prof.full_name_zh), '');
  v_phone := COALESCE(NULLIF(trim(r.phone), ''), NULLIF(trim(v_prof.phone), ''), '');
  v_email_row := COALESCE(NULLIF(trim(r.email), ''), NULLIF(trim(v_prof.email), ''), v_target_email, '');

  IF v_res_row_exists THEN
    IF v_res.user_id IS NOT NULL AND v_res.user_id IS DISTINCT FROM v_target_uid THEN
      RETURN jsonb_build_object('success', false, 'error', 'unit_already_bound');
    END IF;

    UPDATE public.residents res
    SET
      user_id = v_target_uid,
      status = 'active',
      unit_no = trim(v_unit),
      name_en = COALESCE(NULLIF(trim(res.name_en), ''), v_name_en),
      name_zh = COALESCE(res.name_zh, v_name_zh),
      email = COALESCE(NULLIF(trim(res.email), ''), v_email_row),
      phone = CASE WHEN length(trim(COALESCE(v_phone, ''))) > 0 THEN v_phone ELSE res.phone END,
      updated_at = now()
    WHERE res.id = v_res.id;

    v_residents_outcome := CASE
      WHEN v_res.user_id IS NOT DISTINCT FROM v_target_uid THEN 'matched_already_bound'
      ELSE 'matched_bound'
    END;
  ELSE
    INSERT INTO public.residents (
      property_id,
      user_id,
      unit_no,
      name_en,
      name_zh,
      email,
      phone,
      move_in_date,
      language_pref,
      role,
      status,
      strata_fee_status
    )
    VALUES (
      r.property_id,
      v_target_uid,
      trim(v_unit),
      v_name_en,
      v_name_zh,
      v_email_row,
      v_phone,
      NULL,
      COALESCE(v_prof.preferred_language, 'en'),
      'owner',
      'active',
      'current'
    );

    v_residents_outcome := 'created';
  END IF;

  UPDATE public.profiles prof
  SET
    status = 'active',
    updated_at = now()
  WHERE prof.id = v_target_uid;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_target_uid
      AND pm.property_id = r.property_id
  )
  INTO v_pm_after_residents;

  v_membership_exists := v_pm_after_residents;

  IF NOT v_membership_exists THEN
    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_number, approved_by, approved_at
    )
    VALUES (
      r.property_id,
      v_target_uid,
      v_role,
      'active',
      trim(v_unit),
      p_reviewer_id,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      status = 'active',
      unit_number = COALESCE(EXCLUDED.unit_number, public.property_members.unit_number),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

    v_membership_created := true;
  END IF;

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

  -- `already_member` only when they already had property_members before this RPC (not when a trigger inserted PM after residents).
  IF v_pm_before_residents THEN
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
      'property_members_inserted',
      (v_pm_after_residents AND NOT v_pm_before_residents)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'membership_created', (v_pm_after_residents AND NOT v_pm_before_residents),
    'user_linked', true,
    'property_id', r.property_id,
    'property_name', v_property_name,
    'target_user_id', v_target_uid,
    'target_email', v_target_email,
    'unit_no', trim(v_unit),
    'residents_outcome', v_residents_outcome,
    'property_members_inserted',
    (v_membership_created OR (v_pm_after_residents AND NOT v_pm_before_residents))
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request(uuid, uuid, text) IS
  'Approves join request: upsert residents by property+unit, then property_members; errors if unit bound to another user.';

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) TO authenticated;
