/*
  # approve_join_request_final — single RPC for staff “通过审核”

  Consolidates: resolve applicant from join_requests + profiles (by email),
  residents upsert (update if row exists for user+property, else insert),
  property_members upsert to active, join_requests → approved.

  Parameters:
  - p_request_id: join_requests.id
  - p_property_id: must match join_requests.property_id (caller passes current property context)
  - p_default_unit_no: optional override when join_requests.unit_number is empty
*/

CREATE OR REPLACE FUNCTION public.approve_join_request_final(
  p_request_id uuid,
  p_property_id uuid,
  p_default_unit_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  jr public.join_requests%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_target_uid uuid;
  v_unit text;
  v_role public.user_role;
  v_property_name text;
  v_had_active_pm_before boolean := false;
  v_had_active_pm_after boolean := false;
  v_membership_created boolean := false;
  v_residents_outcome text;
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'not_authenticated',
      'message', 'Not authenticated',
      'message_zh', '未登录'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_actor
      AND pm.property_id = p_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'forbidden',
      'message', 'You do not have permission to approve for this property.',
      'message_zh', '您没有权限审核该物业的加入申请。'
    );
  END IF;

  SELECT * INTO jr FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'not_found',
      'message', 'Join request not found.',
      'message_zh', '未找到该加入申请。'
    );
  END IF;

  IF jr.property_id IS DISTINCT FROM p_property_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'property_mismatch',
      'message', 'Request does not belong to the selected property.',
      'message_zh', '该申请不属于当前选择的物业。'
    );
  END IF;

  IF jr.status IS DISTINCT FROM 'pending'::public.join_request_status THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'already_processed',
      'message', 'This request was already processed.',
      'message_zh', '该申请已处理过。'
    );
  END IF;

  IF jr.email IS NULL OR length(trim(jr.email)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'missing_email',
      'message', 'Join request has no email.',
      'message_zh', '申请缺少邮箱，无法匹配用户。'
    );
  END IF;

  v_target_uid := NULL;
  SELECT p.id
  INTO v_target_uid
  FROM public.profiles p
  WHERE lower(trim(coalesce(p.email, ''))) = lower(trim(jr.email))
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    SELECT u.id
    INTO v_target_uid
    FROM auth.users u
    WHERE lower(trim(u.email::text)) = lower(trim(jr.email))
    LIMIT 1;
  END IF;

  IF v_target_uid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'applicant_not_found',
      'message', 'No profile matches this email.',
      'message_zh', '未找到与该邮箱对应的用户资料。'
    );
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_target_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'profile_missing',
      'message', 'User exists in auth but has no profile row.',
      'message_zh', '账号存在但缺少 profiles 记录。'
    );
  END IF;

  IF jr.user_id IS NOT NULL AND jr.user_id IS DISTINCT FROM v_target_uid THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'user_mismatch',
      'message', 'Join request user_id does not match the profile for this email.',
      'message_zh', '申请中的用户与邮箱对应账号不一致。'
    );
  END IF;

  v_unit := COALESCE(
    NULLIF(trim(p_default_unit_no), ''),
    NULLIF(trim(jr.unit_number), ''),
    ''
  );
  IF v_unit = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'ok', false,
      'error', 'missing_unit_number',
      'message', 'Unit number is required (provide default or on the request).',
      'message_zh', '需要房号：请在申请中填写或通过参数传入默认房号。'
    );
  END IF;

  v_role := COALESCE(jr.requested_role, 'owner'::public.user_role);

  SELECT p.name INTO v_property_name FROM public.properties p WHERE p.id = p_property_id;
  v_property_name := COALESCE(NULLIF(trim(v_property_name), ''), 'Property');

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_target_uid
      AND pm.property_id = p_property_id
      AND pm.status = 'active'::public.member_status
  )
  INTO v_had_active_pm_before;

  IF EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_target_uid
  ) THEN
    UPDATE public.residents r
    SET
      status = 'active',
      unit_no = trim(v_unit),
      updated_at = now()
    WHERE r.property_id = p_property_id
      AND r.user_id = v_target_uid;

    v_residents_outcome := 'updated';
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.property_id = p_property_id
        AND lower(trim(r.unit_no)) = lower(trim(v_unit))
        AND r.user_id IS NOT NULL
        AND r.user_id IS DISTINCT FROM v_target_uid
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'ok', false,
        'error', 'unit_already_bound',
        'message', 'This unit is already linked to another account.',
        'message_zh', '该房号已绑定其他用户。'
      );
    END IF;

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
      p_property_id,
      v_target_uid,
      trim(v_unit),
      COALESCE(
        NULLIF(trim(jr.full_name), ''),
        NULLIF(trim(v_prof.full_name_en), ''),
        split_part(trim(jr.email), '@', 1),
        'Owner'
      ),
      NULLIF(trim(v_prof.full_name_zh), ''),
      COALESCE(NULLIF(trim(jr.email), ''), NULLIF(trim(v_prof.email), '')),
      COALESCE(NULLIF(trim(jr.phone), ''), NULLIF(trim(v_prof.phone), ''), ''),
      NULL,
      CASE
        WHEN lower(trim(coalesce(v_prof.preferred_language, ''))) = 'zh' THEN 'zh'
        ELSE 'en'
      END,
      'owner',
      'active',
      'current'
    );

    v_residents_outcome := 'inserted';
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
    p_property_id,
    v_target_uid,
    v_role,
    'active'::public.member_status,
    trim(v_unit),
    v_actor,
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
      AND pm.property_id = p_property_id
      AND pm.status = 'active'::public.member_status
  )
  INTO v_had_active_pm_after;

  v_membership_created := v_had_active_pm_after AND NOT v_had_active_pm_before;

  UPDATE public.join_requests
  SET
    status = 'approved'::public.join_request_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    rejection_reason = NULL,
    user_id = v_target_uid,
    updated_at = now()
  WHERE id = p_request_id;

  IF jr.invite_id IS NOT NULL THEN
    SELECT * INTO inv FROM public.property_invites WHERE id = jr.invite_id FOR UPDATE;
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
      p_property_id,
      p_request_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'user_notifications insert failed: %', SQLERRM;
  END;

  IF v_had_active_pm_before THEN
    RETURN jsonb_build_object(
      'success', true,
      'ok', true,
      'message', 'already_member',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'target_user_id', v_target_uid,
      'target_email', lower(trim(jr.email)),
      'unit_no', trim(v_unit),
      'residents_outcome', v_residents_outcome,
      'property_members_upserted', true,
      'property_members_inserted', false,
      'join_request_status_updated', true,
      'membership_created', false,
      'user_linked', true
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ok', true,
    'property_id', p_property_id,
    'property_name', v_property_name,
    'target_user_id', v_target_uid,
    'target_email', lower(trim(jr.email)),
    'unit_no', trim(v_unit),
    'residents_outcome', v_residents_outcome,
    'property_members_upserted', true,
    'property_members_inserted', v_membership_created,
    'join_request_status_updated', true,
    'membership_created', v_membership_created,
    'user_linked', true
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request_final(uuid, uuid, text) IS
  'Final join approval: profiles by email, residents update/insert, property_members upsert, join_requests approved.';

REVOKE ALL ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) TO authenticated;
