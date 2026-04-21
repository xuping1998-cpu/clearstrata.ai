-- Unified JSON shape for submit_join_request (ok, kind, message, property_id, request_id, invite_code, unit_no, role, membership_status).

CREATE OR REPLACE FUNCTION public._submit_join_unified_response(
  p_ok boolean,
  p_kind text,
  p_message text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_unit_no text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_membership_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $sr$
  SELECT jsonb_build_object(
    'ok', p_ok,
    'kind', p_kind,
    'message', p_message,
    'property_id', p_property_id,
    'request_id', p_request_id,
    'invite_code', p_invite_code,
    'unit_no', p_unit_no,
    'role', p_role,
    'membership_status', p_membership_status
  );
$sr$;

REVOKE ALL ON FUNCTION public._submit_join_unified_response(
  boolean, text, text, uuid, uuid, text, text, text, text
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid DEFAULT NULL,
  p_requested_role public.user_role DEFAULT 'owner'::public.user_role,
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_direct_invite_id uuid DEFAULT NULL,
  p_inferred_role text DEFAULT NULL,
  p_inferred_unit_number text DEFAULT NULL,
  p_move_in_date date DEFAULT NULL,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();

  vprof public.profiles%ROWTYPE;

  v_name text;
  v_email text;
  v_phone text;
  v_email_norm text;

  inv public.property_invites%ROWTYPE;
  c text := NULLIF(trim(p_invite_code), '');

  dir public.property_direct_invites%ROWTYPE;
  pic public.property_invite_codes%ROWTYPE;

  v_role public.user_role;
  v_unit text;

  v_inf_role text;
  v_inf_unit text;

  v_auto jsonb;
  v_join_id uuid;
  v_pic_effective_unit text;
  v_pic_effective_role public.user_role;
  v_whitelist_allows_auto boolean;
  v_member_role text;
  v_member_unit text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN public._submit_join_unified_response(
      false,
      'auth_required',
      '请先登录后再提交',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  -- ========= A) Directed invite (property_direct_invites) =========
  IF p_direct_invite_id IS NOT NULL THEN
    SELECT * INTO dir
    FROM public.property_direct_invites
    WHERE id = p_direct_invite_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN public._submit_join_unified_response(
        false,
        'invalid_invite',
        '邀请无效',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.property_id IS DISTINCT FROM p_property_id THEN
      RETURN public._submit_join_unified_response(
        false,
        'invalid_invite',
        '物业与邀请不匹配',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF NOT dir.is_active THEN
      RETURN public._submit_join_unified_response(
        false,
        'invite_disabled',
        '邀请无效',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.expires_at IS NOT NULL AND dir.expires_at < now() THEN
      RETURN public._submit_join_unified_response(
        false,
        'invite_expired',
        '邀请码已过期',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.max_uses > 0 AND dir.used_count >= dir.max_uses THEN
      RETURN public._submit_join_unified_response(
        false,
        'invite_usage_exceeded',
        '该邀请码已达到使用上限',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

    IF EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = dir.property_id
        AND pm.user_id = v_uid
        AND pm.status = 'active'
    ) THEN
      SELECT pm.role::text INTO v_member_role
      FROM public.property_members pm
      WHERE pm.property_id = dir.property_id
        AND pm.user_id = v_uid
        AND pm.status = 'active'
      LIMIT 1;
      SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
      FROM public.residents r
      WHERE r.property_id = dir.property_id
        AND r.user_id = v_uid
        AND r.status = 'active'
      LIMIT 1;
      RETURN public._submit_join_unified_response(
        true,
        'already_member',
        'Already a member',
        dir.property_id,
        NULL,
        NULL,
        v_member_unit,
        v_member_role,
        'active'
      );
    END IF;

    v_role := public.map_intended_role_to_user_role(dir.intended_role);

    v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
    v_name := COALESCE(NULLIF(trim(p_full_name), ''), NULLIF(trim(dir.intended_name), ''), vprof.full_name_en, v_email);
    v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
    v_email_norm := lower(trim(coalesce(v_email, '')));

    IF v_email_norm <> '' AND EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.status = 'pending'::join_request_status
        AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
    ) THEN
      RETURN public._submit_join_unified_response(
        false,
        'duplicate_pending',
        'You already have a pending request for this property.',
        dir.property_id,
        NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.user_id = v_uid
        AND jr.status = 'pending'::join_request_status
    ) THEN
      RETURN public._submit_join_unified_response(
        false,
        'duplicate_pending',
        'You already have a pending request for this property.',
        dir.property_id,
        NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(dir.unit_number), ''));
    v_inf_role := COALESCE(NULLIF(trim(p_inferred_role), ''), NULLIF(trim(dir.intended_role), ''));
    v_inf_unit := COALESCE(NULLIF(trim(p_inferred_unit_number), ''), NULLIF(trim(dir.unit_number), ''));

    IF v_role = 'owner'::public.user_role
      AND v_unit IS NOT NULL
      AND length(trim(v_unit)) > 0
      AND length(trim(coalesce(v_name, ''))) > 0
      AND length(v_email_norm) > 0
    THEN
      v_auto := public._try_owner_whitelist_auto_join(
        v_uid,
        dir.property_id,
        v_unit,
        p_move_in_date,
        p_language_pref,
        v_name,
        v_email,
        v_phone
      );
      IF (v_auto ->> 'auto_ok') = 'true' THEN
        UPDATE public.property_direct_invites
        SET used_count = used_count + 1
        WHERE id = dir.id;

        IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
          UPDATE public.property_direct_invites
          SET is_active = false
          WHERE id = dir.id;
        END IF;

        RETURN public._submit_join_unified_response(
          true,
          'auto_approved',
          'Joined successfully',
          dir.property_id,
          NULL,
          NULL,
          NULLIF(trim(v_unit), ''),
          v_role::text,
          'active'
        );
      END IF;
    END IF;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
      invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
    ) VALUES (
      dir.property_id,
      v_uid,
      v_role,
      v_name,
      v_email,
      v_phone,
      v_unit,
      p_note,
      'pending'::join_request_status,
      NULL,
      NULL,
      dir.id,
      v_inf_role,
      v_inf_unit
    )
    RETURNING id INTO v_join_id;

    UPDATE public.property_direct_invites
    SET used_count = used_count + 1
    WHERE id = dir.id;

    IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
      UPDATE public.property_direct_invites
      SET is_active = false
      WHERE id = dir.id;
    END IF;

    RETURN public._submit_join_unified_response(
      true,
      'pending_submitted',
      'Request submitted',
      dir.property_id,
      v_join_id,
      NULL,
      NULLIF(trim(v_unit), ''),
      v_role::text,
      NULL
    );
  END IF;

  -- ========= B) Legacy property_invites (upper code) =========
  IF c IS NOT NULL THEN
    c := upper(c);

    SELECT * INTO inv
    FROM public.property_invites
    WHERE code = c
    FOR UPDATE;

    IF FOUND THEN
      IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
        UPDATE public.property_invites
        SET status = 'expired'
        WHERE id = inv.id;

        RETURN public._submit_join_unified_response(
          false,
          'invite_expired',
          '邀请码已过期',
          NULL, NULL, NULL, NULL, NULL, NULL
        );
      END IF;

      IF inv.status <> 'active' THEN
        RETURN public._submit_join_unified_response(
          false,
          'invite_disabled',
          '邀请无效',
          NULL, NULL, NULL, NULL, NULL, NULL
        );
      END IF;

      IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
        RETURN public._submit_join_unified_response(
          false,
          'invite_usage_exceeded',
          '该邀请码已达到使用上限',
          NULL, NULL, NULL, NULL, NULL, NULL
        );
      END IF;

      SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = inv.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        SELECT pm.role::text INTO v_member_role
        FROM public.property_members pm
        WHERE pm.property_id = inv.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
        LIMIT 1;
        SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
        FROM public.residents r
        WHERE r.property_id = inv.property_id
          AND r.user_id = v_uid
          AND r.status = 'active'
        LIMIT 1;
        RETURN public._submit_join_unified_response(
          true,
          'already_member',
          'Already a member',
          inv.property_id,
          NULL,
          c,
          v_member_unit,
          v_member_role,
          'active'
        );
      END IF;

      v_email_norm := lower(trim(coalesce(vprof.email, '')));

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN public._submit_join_unified_response(
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          inv.property_id,
          NULL, c, NULL, NULL, NULL
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN public._submit_join_unified_response(
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          inv.property_id,
          NULL, c, NULL, NULL, NULL
        );
      END IF;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
        invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
      ) VALUES (
        inv.property_id,
        v_uid,
        inv.role,
        COALESCE(NULLIF(trim(vprof.full_name_en), ''), vprof.email),
        vprof.email,
        vprof.phone,
        NULL,
        NULL,
        'pending'::join_request_status,
        inv.id,
        c,
        NULL,
        inv.role::text,
        NULL
      )
      RETURNING id INTO v_join_id;

      UPDATE public.property_invites
      SET used_count = used_count + 1
      WHERE id = inv.id;

      RETURN public._submit_join_unified_response(
        true,
        'pending_submitted',
        'Request submitted',
        inv.property_id,
        v_join_id,
        c,
        NULL,
        inv.role::text,
        NULL
      );
    END IF;
  END IF;

  -- ========= C) Public property_invite_codes =========
  c := NULLIF(trim(p_invite_code), '');

  IF c IS NOT NULL THEN
    SELECT * INTO pic
    FROM public.property_invite_codes
    WHERE code = c OR lower(code) = lower(c)
    FOR UPDATE;

    IF FOUND THEN
      IF NOT pic.is_active THEN
        RETURN public._submit_join_unified_response(
          false,
          'invite_disabled',
          '邀请无效',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
        RETURN public._submit_join_unified_response(
          false,
          'invite_expired',
          '邀请码已过期',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
        RETURN public._submit_join_unified_response(
          false,
          'invite_usage_exceeded',
          '该邀请码已达到使用上限',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.property_id IS DISTINCT FROM p_property_id THEN
        RETURN public._submit_join_unified_response(
          false,
          'invalid_invite',
          '物业与邀请码不匹配',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      SELECT * INTO vprof
      FROM public.profiles
      WHERE id = v_uid;

      v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
      v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
      v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
      v_email_norm := lower(trim(coalesce(v_email, '')));

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = pic.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        SELECT pm.role::text INTO v_member_role
        FROM public.property_members pm
        WHERE pm.property_id = pic.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
        LIMIT 1;
        SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
        FROM public.residents r
        WHERE r.property_id = pic.property_id
          AND r.user_id = v_uid
          AND r.status = 'active'
        LIMIT 1;
        RETURN public._submit_join_unified_response(
          true,
          'already_member',
          'Already a member',
          pic.property_id,
          NULL,
          pic.code,
          v_member_unit,
          v_member_role,
          'active'
        );
      END IF;

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN public._submit_join_unified_response(
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          pic.property_id,
          NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN public._submit_join_unified_response(
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          pic.property_id,
          NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      v_pic_effective_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(pic.unit_no), ''));

      v_pic_effective_role := p_requested_role;
      IF pic.role IS NOT NULL AND length(trim(pic.role)) > 0 THEN
        BEGIN
          v_pic_effective_role := trim(pic.role)::public.user_role;
        EXCEPTION
          WHEN invalid_text_representation THEN
            v_pic_effective_role := p_requested_role;
        END;
      END IF;

      v_inf_role := NULLIF(trim(p_inferred_role), '');
      v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

      IF v_pic_effective_role = 'owner'::public.user_role
        AND NULLIF(trim(v_pic_effective_unit), '') IS NOT NULL
        AND length(trim(coalesce(v_name, ''))) > 0
        AND length(v_email_norm) > 0
      THEN
        v_whitelist_allows_auto := public._unit_whitelist_allows_auto(pic.property_id, trim(v_pic_effective_unit));
        IF v_whitelist_allows_auto THEN
          v_auto := public._try_owner_whitelist_auto_join(
            v_uid,
            pic.property_id,
            trim(v_pic_effective_unit),
            p_move_in_date,
            p_language_pref,
            v_name,
            v_email,
            v_phone
          );
        ELSE
          v_auto := NULL;
        END IF;
        IF (v_auto ->> 'auto_ok') = 'true' THEN
          UPDATE public.property_members pm
          SET
            join_invite_code = pic.code,
            join_entry_source = COALESCE(NULLIF(trim(p_note), ''), 'invite_auto')
          WHERE pm.property_id = pic.property_id
            AND pm.user_id = v_uid;
          UPDATE public.property_invite_codes
          SET used_count = used_count + 1
          WHERE id = pic.id;

          IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
            UPDATE public.property_invite_codes
            SET is_active = false
            WHERE id = pic.id;
          END IF;

          RETURN public._submit_join_unified_response(
            true,
            'auto_approved',
            'Joined successfully',
            pic.property_id,
            NULL,
            pic.code,
            NULLIF(trim(v_pic_effective_unit), ''),
            v_pic_effective_role::text,
            'active'
          );
        END IF;
      END IF;

      INSERT INTO public.join_requests (
        property_id,
        user_id,
        requested_role,
        full_name,
        email,
        phone,
        unit_number,
        note,
        status,
        invite_id,
        invite_code,
        direct_invite_id,
        inferred_role,
        inferred_unit_number
      ) VALUES (
        pic.property_id,
        v_uid,
        v_pic_effective_role,
        v_name,
        v_email,
        v_phone,
        NULLIF(trim(v_pic_effective_unit), ''),
        p_note,
        'pending'::join_request_status,
        NULL,
        pic.code,
        NULL,
        v_inf_role,
        v_inf_unit
      )
      RETURNING id INTO v_join_id;

      UPDATE public.property_invite_codes
      SET used_count = used_count + 1
      WHERE id = pic.id;

      IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
        UPDATE public.property_invite_codes
        SET is_active = false
        WHERE id = pic.id;
      END IF;

      RETURN public._submit_join_unified_response(
        true,
        'pending_submitted',
        'Request submitted',
        pic.property_id,
        v_join_id,
        pic.code,
        NULLIF(trim(v_pic_effective_unit), ''),
        v_pic_effective_role::text,
        NULL
      );
    END IF;

    RETURN public._submit_join_unified_response(
      false,
      'invalid_invite',
      '邀请无效',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  -- ========= D) Public open join by property =========
  IF p_property_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
  ) THEN
    RETURN public._submit_join_unified_response(
      false,
      'property_not_found',
      '物业不存在或无效',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.allow_public_join_requests = true
  ) THEN
    RETURN public._submit_join_unified_response(
      false,
      'rejected',
      '该物业当前不接受公开申请',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  SELECT * INTO vprof
  FROM public.profiles
  WHERE id = v_uid;

  v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
  v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
  v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
  v_email_norm := lower(trim(coalesce(v_email, '')));

  IF EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'
  ) THEN
    SELECT pm.role::text INTO v_member_role
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'
    LIMIT 1;
    SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_uid
      AND r.status = 'active'
    LIMIT 1;
    RETURN public._submit_join_unified_response(
      true,
      'already_member',
      'Already a member',
      p_property_id,
      NULL,
      NULL,
      v_member_unit,
      v_member_role,
      'active'
    );
  END IF;

  IF v_email_norm <> '' AND EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.status = 'pending'::join_request_status
      AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
  ) THEN
    RETURN public._submit_join_unified_response(
      false,
      'duplicate_pending',
      'You already have a pending request for this property.',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.user_id = v_uid
      AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN public._submit_join_unified_response(
      false,
      'duplicate_pending',
      'You already have a pending request for this property.',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  v_inf_role := NULLIF(trim(p_inferred_role), '');
  v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

  v_auto := NULL;
  IF p_requested_role = 'owner'::public.user_role
    AND NULLIF(trim(p_unit_number), '') IS NOT NULL
    AND length(trim(coalesce(v_name, ''))) > 0
    AND length(v_email_norm) > 0
  THEN
    v_whitelist_allows_auto := public._unit_whitelist_allows_auto(p_property_id, trim(p_unit_number));
    IF v_whitelist_allows_auto THEN
      v_auto := public._try_owner_whitelist_auto_join(
        v_uid,
        p_property_id,
        trim(p_unit_number),
        p_move_in_date,
        p_language_pref,
        v_name,
        v_email,
        v_phone
      );
    ELSE
      v_auto := NULL;
    END IF;
    IF (v_auto ->> 'auto_ok') = 'true' THEN
      UPDATE public.property_members pm
      SET
        join_invite_code = NULL,
        join_entry_source = COALESCE(NULLIF(trim(p_note), ''), 'public_join')
      WHERE pm.property_id = p_property_id
        AND pm.user_id = v_uid;
      RETURN public._submit_join_unified_response(
        true,
        'auto_approved',
        'Joined successfully',
        p_property_id,
        NULL,
        NULL,
        NULLIF(trim(p_unit_number), ''),
        p_requested_role::text,
        'active'
      );
    END IF;
  END IF;

  INSERT INTO public.join_requests (
    property_id,
    user_id,
    requested_role,
    full_name,
    email,
    phone,
    unit_number,
    note,
    status,
    invite_id,
    invite_code,
    direct_invite_id,
    inferred_role,
    inferred_unit_number
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    v_name,
    v_email,
    v_phone,
    NULLIF(trim(p_unit_number), ''),
    p_note,
    'pending'::join_request_status,
    NULL,
    NULL,
    NULL,
    v_inf_role,
    v_inf_unit
  )
  RETURNING id INTO v_join_id;

  RETURN public._submit_join_unified_response(
    true,
    'pending_submitted',
    'Request submitted',
    p_property_id,
    v_join_id,
    NULL,
    NULLIF(trim(p_unit_number), ''),
    p_requested_role::text,
    NULL
  );
EXCEPTION WHEN OTHERS THEN
  RETURN public._submit_join_unified_response(
    false,
    'rpc_error',
    SQLERRM,
    NULL, NULL, NULL, NULL, NULL, NULL
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) TO authenticated;

COMMENT ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) IS
  'Unified join: invite codes, unit_whitelist gate, roster auto-bind, join_requests pending; returns unified JSON (ok, kind, ...).';

NOTIFY pgrst, 'reload schema';
