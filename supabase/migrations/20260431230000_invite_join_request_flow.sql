-- Invite flow: submit pending join_requests instead of immediate property_members.
-- invite_id links a request to an invite; on approve, consume one invite use.

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES public.property_invites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_join_requests_invite_id ON public.join_requests(invite_id);

-- ---------------------------------------------------------------------------
-- submit_join_request_from_invite — validate invite, insert pending request
-- (does not consume invite use until review_join_request approves)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_join_request_from_invite(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  c text := upper(trim(invite_code));
  inv public.property_invites%ROWTYPE;
  vprof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO inv FROM public.property_invites WHERE code = c FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  IF inv.status = 'disabled' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_ACTIVE');
  END IF;

  IF inv.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_EXPIRED');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_EXPIRED');
  END IF;

  IF inv.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_ACTIVE');
  END IF;

  IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_LIMIT_REACHED');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = inv.property_id AND pm.user_id = v_uid AND pm.status = 'active'::member_status
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'ALREADY_MEMBER');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.property_id = inv.property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'PENDING_EXISTS');
  END IF;

  SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.join_requests (
    property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status, invite_id
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
    inv.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'property_id', inv.property_id,
    'role', inv.role::text,
    'message', 'PENDING_APPROVAL'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request_from_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request_from_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- accept_property_invite — same as submit_join_request_from_invite (no direct join)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_property_invite(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN public.submit_join_request_from_invite(invite_code);
END;
$fn$;

REVOKE ALL ON FUNCTION public.accept_property_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_property_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- review_join_request — on approve, consume invite use when invite_id set
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_unit_number text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  r public.join_requests%ROWTYPE;
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO r FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF r.status <> 'pending'::join_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_processed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = r.property_id
      AND pm.status = 'active'::member_status
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_approve THEN
    UPDATE public.join_requests
    SET status = 'approved'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now(),
        rejection_reason = NULL
    WHERE id = p_request_id;

    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_number, approved_by, approved_at
    ) VALUES (
      r.property_id,
      r.user_id,
      r.requested_role,
      'active'::member_status,
      COALESCE(p_unit_number, r.unit_number),
      v_uid,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active'::member_status,
      unit_number = COALESCE(EXCLUDED.unit_number, public.property_members.unit_number),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

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
  ELSE
    UPDATE public.join_requests
    SET status = 'rejected'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now(),
        rejection_reason = NULLIF(trim(p_rejection_reason), '')
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_invite_preview — include property_id for client join / join_requests checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_preview(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c text := upper(trim(invite_code));
  inv public.property_invites%ROWTYPE;
  pname text;
BEGIN
  IF c = '' THEN
    RETURN jsonb_build_object('found', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  SELECT * INTO inv FROM public.property_invites WHERE code = c;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  SELECT name INTO pname FROM public.properties WHERE id = inv.property_id;

  RETURN jsonb_build_object(
    'found', true,
    'property_id', inv.property_id,
    'property_name', COALESCE(pname, ''),
    'role', inv.role::text,
    'code', inv.code,
    'expires_at', inv.expires_at,
    'is_expired', CASE
      WHEN inv.expires_at IS NULL THEN false
      ELSE inv.expires_at < now()
    END,
    'status', inv.status,
    'max_uses', inv.max_uses,
    'used_count', inv.used_count
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO authenticated;
