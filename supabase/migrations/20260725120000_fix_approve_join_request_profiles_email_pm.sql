/*
  # Fix `approve_join_request` for pending join approvals

  - Resolve applicant `user_id` from `join_requests.user_id`, then `auth.users` email,
    then **`public.profiles` email** (covers join_request email matching profile while
    auth.users email differs or lookup edge cases).
  - Match `residents` by **(property_id, unit)** first; if none, match by **(property_id, email)** and UPDATE
    (including `unit_no`) instead of inserting a duplicate.
  - Always **upsert `property_members`** with `ON CONFLICT (property_id, user_id) DO UPDATE` so pending
    or stale rows become `active` (previously skipped INSERT when any row existed).
  - `already_member` short-circuit only when the user **already had an active** membership before this RPC.

  Note: `residents.status` is constrained to active|pending|deregistered; fee state uses `strata_fee_status` (`current`).
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
  v_res public.residents%ROWTYPE;
  v_res_row_exists boolean := false;
  v_residents_outcome text;
  v_prof public.profiles%ROWTYPE;
  v_name_en text;
  v_name_zh text;
  v_phone text;
  v_email_row text;
  v_lang text;
  v_had_active_pm_before boolean := false;
  v_had_active_pm_after boolean := false;
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
  v_lang := CASE
    WHEN lower(trim(coalesce(v_prof.preferred_language, ''))) = 'zh' THEN 'zh'
    ELSE 'en'
  END;

  SELECT *
  INTO v_res
  FROM public.residents res
  WHERE res.property_id = r.property_id
    AND lower(trim(res.unit_no)) = lower(trim(v_unit))
  LIMIT 1
  FOR UPDATE;

  v_res_row_exists := FOUND;

  IF NOT v_res_row_exists AND length(trim(coalesce(r.email, ''))) > 0 THEN
    SELECT *
    INTO v_res
    FROM public.residents res
    WHERE res.property_id = r.property_id
      AND lower(trim(coalesce(res.email, ''))) = lower(trim(coalesce(r.email, '')))
    LIMIT 1
    FOR UPDATE;

    v_res_row_exists := FOUND;
  END IF;

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
      language_pref = CASE
        WHEN lower(trim(coalesce(res.language_pref, ''))) IN ('en', 'zh') THEN res.language_pref
        ELSE v_lang
      END,
      role = 'owner',
      strata_fee_status = COALESCE(res.strata_fee_status, 'current'::text),
      updated_at = now()
    WHERE res.id = v_res.id;

    v_residents_outcome := CASE
      WHEN lower(trim(coalesce(v_res.unit_no, ''))) IS DISTINCT FROM lower(trim(v_unit))
        AND lower(trim(coalesce(v_res.email, ''))) = lower(trim(coalesce(r.email, '')))
      THEN 'updated_by_email_unit_changed'
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
      v_lang,
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
    'property_members_upserted', true,
    'property_members_inserted', v_membership_created,
    'join_request_status_updated', true
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request(uuid, uuid, text) IS
  'Approves join request: resolve user via auth.users then profiles email; upsert residents (unit then email match); always upsert property_members to active.';

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) TO authenticated;
