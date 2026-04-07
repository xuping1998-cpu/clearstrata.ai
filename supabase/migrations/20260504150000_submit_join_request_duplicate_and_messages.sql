-- submit_join_request: dedupe by property + normalized email (pending); user-facing message_zh; success flag on OK path.

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid DEFAULT NULL,
  p_requested_role public.user_role DEFAULT 'owner',
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_invite_code text DEFAULT NULL
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'NOT_AUTHENTICATED',
      'message_zh', '请先登录后再提交。'
    );
  END IF;

  IF c IS NOT NULL THEN
    c := upper(c);

    SELECT * INTO inv FROM public.property_invites WHERE code = c FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVALID_INVITE');
    END IF;

    IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
      UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVALID_INVITE');
    END IF;

    IF inv.status <> 'active' THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVALID_INVITE');
    END IF;

    IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVALID_INVITE');
    END IF;

    SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

    IF EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = inv.property_id AND pm.user_id = v_uid AND pm.status = 'active'::member_status
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_member',
        'message', 'ALREADY_MEMBER',
        'message_zh', '你已经是该物业成员，无需重复申请。'
      );
    END IF;

    v_email_norm := lower(trim(coalesce(vprof.email, '')));

    IF v_email_norm <> '' AND EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.property_id = inv.property_id
        AND jr.status = 'pending'::join_request_status
        AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '你已提交过该物业的申请，请等待审核。'
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.property_id = inv.property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '你已提交过该物业的申请，请等待审核。'
      );
    END IF;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status, invite_id, invite_code
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
      c
    );

    UPDATE public.property_invites
    SET used_count = used_count + 1
    WHERE id = inv.id;

    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'property_id', inv.property_id,
      'role', inv.role::text,
      'message', 'PENDING_APPROVAL'
    );
  END IF;

  IF p_property_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'bad_property',
      'message', 'Invalid or missing property.',
      'message_zh', '物业不存在或无效。'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id AND p.allow_public_join_requests = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'property_closed',
      'message', 'This property is not accepting public applications.',
      'message_zh', '该物业当前不接受公开申请。'
    );
  END IF;

  SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

  v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
  v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
  v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
  v_email_norm := lower(trim(coalesce(v_email, '')));

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = p_property_id AND pm.user_id = v_uid AND pm.status = 'active'::member_status
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_member',
      'message', 'You are already a member of this property.',
      'message_zh', '你已经是该物业成员，无需重复申请。'
    );
  END IF;

  IF v_email_norm <> '' AND EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.status = 'pending'::join_request_status
      AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_pending',
      'message', 'You already have a pending request for this property.',
      'message_zh', '你已提交过该物业的申请，请等待审核。'
    );
  END IF;

  INSERT INTO public.join_requests (
    property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status, invite_id, invite_code
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    v_name,
    v_email,
    v_phone,
    p_unit_number,
    p_note,
    'pending'::join_request_status,
    NULL,
    NULL
  );

  RETURN jsonb_build_object('ok', true, 'success', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
