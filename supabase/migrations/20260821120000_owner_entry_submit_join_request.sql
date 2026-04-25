-- Owner /entry QR flow: single RPC with two-step confirmation.

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS unit_no text,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS review_flag text,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS source text;

-- Product requirement: council may review competing pending applications.
DROP INDEX IF EXISTS public.join_requests_one_pending_per_user;
DROP INDEX IF EXISTS public.uniq_pending_request;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid,
  p_invite_code text,
  p_unit_no text,
  p_confirm boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_unit_no text := NULLIF(trim(both from coalesce(p_unit_no, '')), '');
  v_invite_code text := NULLIF(trim(both from coalesce(p_invite_code, '')), '');
  v_email text := coalesce(NULLIF(trim(auth.email()), ''), 'unknown@example.com');
  v_property_name text;
  v_pic_id uuid;
  v_pic_is_active boolean;
  v_pic_max_uses int;
  v_pic_used_count int;
  v_pic_expires_at timestamptz;
  v_already_member boolean := false;
  v_unit_occupied boolean := false;
  v_pending_conflict boolean := false;
  v_in_whitelist boolean := false;
  v_reason text;
  v_message text;
  v_pm_unit_column text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'kind', 'error',
      'reason', 'auth_required',
      'message', 'Please sign in before submitting.',
      'property_id', p_property_id,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  IF p_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'kind', 'error',
      'reason', 'invalid_property',
      'message', 'Invalid property.',
      'property_id', p_property_id,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  IF v_unit_no IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'kind', 'error',
      'reason', 'invalid_unit',
      'message', 'Please enter a unit number.',
      'property_id', p_property_id,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  SELECT p.name
  INTO v_property_name
  FROM public.properties p
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'kind', 'error',
      'reason', 'invalid_property',
      'message', 'Property not found.',
      'property_id', p_property_id,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  SELECT c.id, c.is_active, c.max_uses, c.used_count, c.expires_at
  INTO v_pic_id, v_pic_is_active, v_pic_max_uses, v_pic_used_count, v_pic_expires_at
  FROM public.property_invite_codes c
  WHERE c.property_id = p_property_id
    AND upper(trim(c.code)) = upper(v_invite_code)
  FOR UPDATE;

  IF NOT FOUND OR NOT coalesce(v_pic_is_active, false)
    OR (v_pic_expires_at IS NOT NULL AND v_pic_expires_at < now())
    OR (coalesce(v_pic_max_uses, 0) > 0 AND coalesce(v_pic_used_count, 0) >= coalesce(v_pic_max_uses, 0))
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'kind', 'error',
      'reason', 'invalid_invite',
      'message', 'Invite code is invalid, expired, disabled, or exhausted.',
      'property_id', p_property_id,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status::text = 'active'
  )
  INTO v_already_member;

  IF v_already_member THEN
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'already_member',
      'reason', null,
      'message', 'You are already a member of this property.',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(v_unit_no)
      AND r.user_id IS NOT NULL
      AND r.user_id IS DISTINCT FROM v_uid
      AND r.status::text = 'active'
  )
  INTO v_unit_occupied;

  IF NOT v_unit_occupied THEN
    SELECT c.column_name
    INTO v_pm_unit_column
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'property_members'
      AND c.column_name IN ('unit_no', 'unit_number')
    ORDER BY CASE c.column_name WHEN 'unit_no' THEN 1 ELSE 2 END
    LIMIT 1;

    IF v_pm_unit_column IS NOT NULL THEN
      EXECUTE format(
        'SELECT EXISTS (
           SELECT 1
           FROM public.property_members pm
           WHERE pm.property_id = $1
             AND lower(trim(pm.%I)) = lower($2)
             AND pm.user_id IS DISTINCT FROM $3
             AND pm.status::text = ''active''
         )',
        v_pm_unit_column
      )
      INTO v_unit_occupied
      USING p_property_id, v_unit_no, v_uid;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND lower(trim(coalesce(jr.unit_no, jr.unit_number, ''))) = lower(v_unit_no)
      AND jr.status::text IN ('pending', 'reviewing', 'submitted')
  )
  INTO v_pending_conflict;

  SELECT EXISTS (
    SELECT 1
    FROM public.unit_whitelist uw
    WHERE uw.property_id = p_property_id
      AND lower(trim(uw.unit_no)) = lower(v_unit_no)
      AND uw.is_active = true
  )
  INTO v_in_whitelist;

  IF v_unit_occupied AND NOT p_confirm THEN
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'need_confirm',
      'reason', 'occupied',
      'message', 'This unit is already registered. You can still submit for council review if it is yours.',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'unit_no', v_unit_no,
      'require_confirm', true
    );
  END IF;

  IF v_pending_conflict AND NOT p_confirm THEN
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'need_confirm',
      'reason', 'duplicate_unit_pending',
      'message', 'This unit already has an application under review. You can still submit for council review.',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'unit_no', v_unit_no,
      'require_confirm', true
    );
  END IF;

  IF NOT v_in_whitelist AND NOT p_confirm THEN
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'need_confirm',
      'reason', 'non_whitelist',
      'message', 'This unit is not on the whitelist. You can still submit for admin review.',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'unit_no', v_unit_no,
      'require_confirm', true
    );
  END IF;

  IF v_in_whitelist AND NOT v_unit_occupied AND NOT v_pending_conflict THEN
    INSERT INTO public.property_members (
      property_id,
      user_id,
      role,
      status,
      approved_at
    )
    VALUES (
      p_property_id,
      v_uid,
      'owner'::public.user_role,
      'active'::public.member_status,
      now()
    )
    ON CONFLICT (property_id, user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active'::public.member_status,
      approved_at = coalesce(public.property_members.approved_at, now());

    UPDATE public.property_invite_codes c
    SET
      used_count = c.used_count + 1,
      is_active = CASE
        WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
        ELSE c.is_active
      END
    WHERE c.id = v_pic_id;

    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'auto_approved',
      'reason', null,
      'message', 'Approved automatically.',
      'property_id', p_property_id,
      'property_name', v_property_name,
      'unit_no', v_unit_no,
      'require_confirm', false
    );
  END IF;

  v_reason := CASE
    WHEN v_unit_occupied THEN 'occupied'
    WHEN v_pending_conflict THEN 'duplicate_unit_pending'
    ELSE 'non_whitelist'
  END;

  v_message := CASE v_reason
    WHEN 'occupied' THEN 'This unit is already registered; your application was submitted for review.'
    WHEN 'duplicate_unit_pending' THEN 'This unit already has an application under review; your application was also submitted.'
    ELSE 'This unit is not on the whitelist; your application was submitted for review.'
  END;

  INSERT INTO public.join_requests (
    property_id,
    user_id,
    email,
    unit_no,
    unit_number,
    invite_code,
    status,
    review_flag,
    review_reason,
    source,
    note
  )
  VALUES (
    p_property_id,
    v_uid,
    v_email,
    v_unit_no,
    v_unit_no,
    v_invite_code,
    'pending',
    v_reason,
    v_message,
    'entry_public_invite',
    'entry_public_invite|' || v_reason
  );

  RETURN jsonb_build_object(
    'ok', true,
    'kind', 'pending',
    'reason', v_reason,
    'message', v_message,
    'property_id', p_property_id,
    'property_name', v_property_name,
    'unit_no', v_unit_no,
    'require_confirm', false
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, text, text, boolean) TO service_role;
