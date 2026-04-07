-- join_requests.rejection_reason + extended submit_join_request + review_join_request(reason)

ALTER TABLE public.join_requests ADD COLUMN IF NOT EXISTS rejection_reason text;

DROP FUNCTION IF EXISTS public.submit_join_request(uuid, public.user_role, text, text);
DROP FUNCTION IF EXISTS public.review_join_request(uuid, boolean, text);

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
    WHERE pm.property_id = p_property_id AND pm.user_id = v_uid AND pm.status = 'active'::member_status
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
    property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    v_name,
    v_email,
    v_phone,
    p_unit_number,
    p_note,
    'pending'::join_request_status
  );

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

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

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, text, text) TO authenticated;
