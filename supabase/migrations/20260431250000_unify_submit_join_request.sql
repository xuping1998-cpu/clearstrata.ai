-- Single RPC: submit_join_request(..., p_invite_code optional). Drops submit_join_request_from_invite.

DROP FUNCTION IF EXISTS public.submit_join_request_from_invite(text);
DROP FUNCTION IF EXISTS public.submit_join_request(uuid, public.user_role, text, text, text, text, text);

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
  inv public.property_invites%ROWTYPE;
  c text := NULLIF(trim(p_invite_code), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'NOT_AUTHENTICATED'
    );
  END IF;

  -- Invite path: p_invite_code set
  IF c IS NOT NULL THEN
    c := upper(c);

    SELECT * INTO inv FROM public.property_invites WHERE code = c FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_NOT_FOUND');
    END IF;

    IF inv.status = 'disabled' THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_NOT_ACTIVE');
    END IF;

    IF inv.status = 'expired' THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_EXPIRED');
    END IF;

    IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
      UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_EXPIRED');
    END IF;

    IF inv.status <> 'active' THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_NOT_ACTIVE');
    END IF;

    IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'INVITE_LIMIT_REACHED');
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = inv.property_id AND pm.user_id = v_uid AND pm.status = 'active'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'ALREADY_MEMBER');
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.property_id = inv.property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
    ) THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'message', 'PENDING_EXISTS');
    END IF;

    SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

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

    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'property_id', inv.property_id,
      'role', inv.role::text,
      'message', 'PENDING_APPROVAL'
    );
  END IF;

  -- Public path: property + form fields
  IF p_property_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_property');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id AND p.allow_public_join_requests = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'property_closed');
  END IF;

  SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

  v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
  v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
  v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = p_property_id AND pm.user_id = v_uid AND pm.status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.property_id = p_property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_exists');
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

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text) TO authenticated;

-- accept_property_invite ?unified RPC (backward compatible for any old clients)
CREATE OR REPLACE FUNCTION public.accept_property_invite(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN public.submit_join_request(
    NULL,
    'owner'::public.user_role,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    invite_code
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.accept_property_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_property_invite(text) TO authenticated;




