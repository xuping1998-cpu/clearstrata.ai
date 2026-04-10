-- join_requests: invite_code (denormalized), updated_at, cancelled status; RPC INSERT updates

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'join_request_status'
      AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.join_request_status ADD VALUE 'cancelled';
  END IF;
END $$;

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_join_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $tr$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$tr$;

DROP TRIGGER IF EXISTS tr_join_requests_updated_at ON public.join_requests;
CREATE TRIGGER tr_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_join_requests_updated_at();

-- ---------------------------------------------------------------------------
-- submit_join_request_from_invite store invite_code on row
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
    WHERE pm.property_id = inv.property_id AND pm.user_id = v_uid AND pm.status = 'active'
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
-- submit_join_request (public property) explicit NULL invite fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid,
  p_requested_role public.user_role DEFAULT 'owner',
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

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

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text) TO authenticated;




