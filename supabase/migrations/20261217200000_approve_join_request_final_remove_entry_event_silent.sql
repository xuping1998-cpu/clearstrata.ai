-- Remove _property_entry_event_silent calls from approve_join_request_final (42883: helper signature mismatch).

CREATE OR REPLACE FUNCTION public.approve_join_request_final(
  p_request_id uuid,
  p_property_id uuid,
  p_unit_no text DEFAULT NULL
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
  v_user_id uuid;
  v_unit text;
  v_property_name text;
  v_res_row_id uuid;
  v_res_out text;
  v_pm_id uuid;
  inv public.property_invites%ROWTYPE;
  v_auth_email text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated',
      'email', null,
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_actor
      AND pm.property_id = p_property_id
      AND pm.status::text = 'active'
      AND pm.role::text IN ('council', 'admin', 'property_admin', 'manager')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'forbidden',
      'email', null,
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  SELECT * INTO jr FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'email', null,
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF jr.property_id IS DISTINCT FROM p_property_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'property_mismatch',
      'email', lower(trim(coalesce(jr.email, ''))),
      'user_id', jr.user_id,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF jr.status = 'approved'::public.join_request_status THEN
    v_unit := COALESCE(
      NULLIF(trim(p_unit_no), ''),
      NULLIF(trim(jr.unit_no), ''),
      ''
    );
    v_pm_id := NULL;
    IF jr.user_id IS NOT NULL THEN
      SELECT pm.id
        INTO v_pm_id
        FROM public.property_members pm
        WHERE pm.property_id = p_property_id
          AND pm.user_id = jr.user_id
          AND pm.status::text = 'active'
        LIMIT 1;
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'error', null,
      'email', lower(trim(coalesce(jr.email, ''))),
      'user_id', jr.user_id,
      'property_id', p_property_id,
      'unit_no', CASE WHEN length(v_unit) > 0 THEN trim(v_unit) ELSE null END,
      'residents_outcome', 'noop_already_approved',
      'property_members_upserted', true,
      'join_request_status_updated', true
    );
  END IF;

  IF jr.status IS DISTINCT FROM 'pending'::public.join_request_status THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_processed',
      'email', lower(trim(coalesce(jr.email, ''))),
      'user_id', jr.user_id,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF jr.email IS NULL OR length(trim(jr.email)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'missing_email',
      'email', null,
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  v_user_id := NULL;
  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE lower(trim(coalesce(p.email, ''))) = lower(trim(jr.email))
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT u.id
    INTO v_user_id
    FROM auth.users u
    WHERE lower(trim(u.email::text)) = lower(trim(jr.email))
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'applicant_not_found',
      'email', lower(trim(jr.email)),
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    SELECT NULLIF(trim(u.email::text), '')
      INTO v_auth_email
      FROM auth.users u
      WHERE u.id = v_user_id
      LIMIT 1;

    INSERT INTO public.profiles (
      id,
      email,
      full_name_en
    )
    VALUES (
      v_user_id,
      COALESCE(NULLIF(lower(trim(jr.email)), ''), v_auth_email, ''),
      COALESCE(
        NULLIF(trim(jr.full_name), ''),
        split_part(lower(trim(jr.email)), '@', 1),
        'Owner'
      )
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'profile_missing',
        'email', lower(trim(jr.email)),
        'user_id', v_user_id,
        'property_id', p_property_id,
        'unit_no', null,
        'residents_outcome', null,
        'property_members_upserted', false,
        'join_request_status_updated', false
      );
    END IF;
  END IF;

  IF jr.user_id IS NOT NULL AND jr.user_id IS DISTINCT FROM v_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'user_mismatch',
      'email', lower(trim(jr.email)),
      'user_id', v_user_id,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  v_unit := COALESCE(
    NULLIF(trim(p_unit_no), ''),
    NULLIF(trim(jr.unit_no), ''),
    ''
  );
  IF v_unit = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'missing_unit_number',
      'email', lower(trim(jr.email)),
      'user_id', v_user_id,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  SELECT p.name INTO v_property_name FROM public.properties p WHERE p.id = p_property_id;
  v_property_name := COALESCE(NULLIF(trim(v_property_name), ''), 'Property');

  IF EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_user_id
  ) THEN
    UPDATE public.residents r
    SET
      unit_no = trim(v_unit),
      name_en = COALESCE(
        NULLIF(trim(jr.full_name), ''),
        NULLIF(trim(v_prof.full_name_en), ''),
        split_part(trim(jr.email), '@', 1),
        'Owner'
      ),
      name_zh = NULLIF(trim(v_prof.full_name_zh), ''),
      email = COALESCE(NULLIF(trim(jr.email), ''), NULLIF(trim(v_prof.email), '')),
      phone = COALESCE(NULLIF(trim(jr.phone), ''), NULLIF(trim(v_prof.phone), ''), ''),
      language_pref = CASE
        WHEN lower(trim(coalesce(v_prof.preferred_language, ''))) = 'zh' THEN 'zh'::text
        ELSE 'en'::text
      END,
      role = 'owner',
      status = 'active',
      strata_fee_status = COALESCE(r.strata_fee_status, 'current'::text),
      updated_at = now()
    WHERE r.property_id = p_property_id
      AND r.user_id = v_user_id;

    v_res_out := 'updated';
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.property_id = p_property_id
        AND lower(trim(r.unit_no)) = lower(trim(v_unit))
        AND r.user_id IS NOT NULL
        AND r.user_id IS DISTINCT FROM v_user_id
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'unit_already_bound',
        'email', lower(trim(jr.email)),
        'user_id', v_user_id,
        'property_id', p_property_id,
        'unit_no', trim(v_unit),
        'residents_outcome', null,
        'property_members_upserted', false,
        'join_request_status_updated', false
      );
    END IF;

    SELECT r.id
    INTO v_res_row_id
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(trim(v_unit))
      AND r.user_id IS NULL
    ORDER BY r.created_at ASC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_res_row_id IS NOT NULL THEN
      UPDATE public.residents r
      SET
        user_id = v_user_id,
        name_en = COALESCE(
          NULLIF(trim(jr.full_name), ''),
          NULLIF(trim(v_prof.full_name_en), ''),
          split_part(trim(jr.email), '@', 1),
          'Owner'
        ),
        name_zh = NULLIF(trim(v_prof.full_name_zh), ''),
        email = COALESCE(NULLIF(trim(jr.email), ''), NULLIF(trim(v_prof.email), '')),
        phone = COALESCE(NULLIF(trim(jr.phone), ''), NULLIF(trim(v_prof.phone), ''), ''),
        language_pref = CASE
          WHEN lower(trim(coalesce(v_prof.preferred_language, ''))) = 'zh' THEN 'zh'::text
          ELSE 'en'::text
        END,
        role = 'owner',
        status = 'active',
        strata_fee_status = COALESCE(r.strata_fee_status, 'current'::text),
        updated_at = now()
      WHERE r.id = v_res_row_id;

      v_res_out := 'bound_roster';
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
        p_property_id,
        v_user_id,
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
          WHEN lower(trim(coalesce(v_prof.preferred_language, ''))) = 'zh' THEN 'zh'::text
          ELSE 'en'::text
        END,
        'owner',
        'active',
        'current'
      );

      v_res_out := 'inserted';
    END IF;
  END IF;

  UPDATE public.profiles prof
  SET
    status = 'active',
    updated_at = now()
  WHERE prof.id = v_user_id;

  INSERT INTO public.property_members (
    property_id,
    user_id,
    role,
    status,
    approved_by,
    approved_at
  )
  VALUES (
    p_property_id,
    v_user_id,
    'owner'::public.user_role,
    'active',
    v_actor,
    now()
  )
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = 'owner'::public.user_role,
    status = 'active',
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at;

  UPDATE public.join_requests
  SET
    status = 'approved'::public.join_request_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    rejection_reason = NULL,
    user_id = v_user_id,
    updated_at = now()
  WHERE id = p_request_id
    AND property_id = p_property_id;

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
      user_id,
      type,
      title,
      message,
      related_property_id,
      related_join_request_id
    )
    VALUES (
      v_user_id,
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

  SELECT id
    INTO v_pm_id
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_user_id
    LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'email', lower(trim(jr.email)),
    'user_id', v_user_id,
    'property_id', p_property_id,
    'unit_no', trim(v_unit),
    'residents_outcome', v_res_out,
    'property_members_upserted', true,
    'join_request_status_updated', true
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request_final(uuid, uuid, text) IS
  'Final join approval: jsonb result; property_members.status as text; join_requests.status as join_request_status enum.';

REVOKE ALL ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
