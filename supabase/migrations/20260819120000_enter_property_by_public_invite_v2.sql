-- Public invite /entry: unit_whitelist + unit occupancy; enter_property_by_public_invite_v2 (SECURITY DEFINER)

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS review_flag text,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS whitelist_matched boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_occupied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_join_requests_property_status
  ON public.join_requests (property_id, status);

CREATE INDEX IF NOT EXISTS idx_join_requests_property_unit
  ON public.join_requests (property_id, lower(trim(unit_no)))
  WHERE unit_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_residents_property_unit_occupied
  ON public.residents (property_id, lower(trim(unit_no)))
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unit_whitelist_property_unit
  ON public.unit_whitelist (property_id, lower(trim(unit_no)))
  WHERE is_active = true;

COMMENT ON COLUMN public.join_requests.review_flag IS
  'auto_approved|not_in_whitelist|unit_occupied|invalid_invite|manual_review (public invite v2)';

CREATE OR REPLACE FUNCTION public.enter_property_by_public_invite_v2(
  p_property_id uuid,
  p_invite_code text,
  p_name text,
  p_unit_no text,
  p_email text,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  pic public.property_invite_codes%ROWTYPE;
  v_unit text := NULLIF(trim(both from coalesce(p_unit_no, '')), '');
  v_name text := NULLIF(trim(both from coalesce(p_name, '')), '');
  v_email_in text := NULLIF(trim(both from coalesce(p_email, '')), '');
  v_lang text;
  v_code text := NULLIF(trim(both from coalesce(p_invite_code, '')), '');
  v_in_wl boolean := false;
  v_occupied boolean := false;
  v_bind jsonb;
  v_pending_id uuid;
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'auth_required');
  END IF;

  IF p_property_id IS NULL OR v_code = '' OR v_unit = '' OR v_name = '' OR v_email_in = '' THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_arguments', 'message', 'Missing name, email, unit, or invite code.');
  END IF;

  v_lang := CASE
    WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh'
    ELSE 'en'
  END;

  IF EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'::public.member_status
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_member',
      'property_id', p_property_id
    );
  END IF;

  SELECT *
  INTO pic
  FROM public.property_invite_codes c
  WHERE c.property_id = p_property_id
    AND upper(trim(c.code)) = upper(v_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite');
  END IF;

  IF NOT pic.is_active THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_inactive');
  END IF;

  IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_exhausted');
  END IF;

  IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_expired');
  END IF;

  v_in_wl := EXISTS (
    SELECT 1
    FROM public.unit_whitelist uw
    WHERE uw.property_id = p_property_id
      AND lower(trim(uw.unit_no)) = lower(v_unit)
      AND uw.is_active = true
  );

  v_occupied := EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(v_unit)
      AND r.user_id IS NOT NULL
      AND r.user_id IS DISTINCT FROM v_uid
  );

  SELECT id
  INTO v_pending_id
  FROM public.join_requests
  WHERE property_id = p_property_id
    AND user_id = v_uid
    AND status = 'pending'::public.join_request_status
  FOR UPDATE;

  /* Pending re-submit: anomaly paths refresh row (no re-bump). Whitelist+free path clears row for auto-join. */
  IF v_pending_id IS NOT NULL THEN
    IF v_in_wl AND NOT v_occupied THEN
      DELETE FROM public.join_requests WHERE id = v_pending_id;
      v_pending_id := NULL;
    ELSIF NOT v_in_wl THEN
      UPDATE public.join_requests
      SET
        full_name = v_name,
        email = v_email_in,
        unit_no = v_unit,
        invite_code = v_code,
        source = 'public_invite_v2',
        review_flag = 'not_in_whitelist',
        review_reason = 'Unit is not in whitelist',
        whitelist_matched = false,
        unit_occupied = v_occupied,
        note = 'public_invite_v2|resubmit',
        updated_at = now()
      WHERE id = v_pending_id;
      RETURN jsonb_build_object(
        'ok', true,
        'status', 'duplicate_pending',
        'review_flag', 'not_in_whitelist',
        'request_id', v_pending_id
      );
    ELSIF v_occupied THEN
      UPDATE public.join_requests
      SET
        full_name = v_name,
        email = v_email_in,
        unit_no = v_unit,
        invite_code = v_code,
        source = 'public_invite_v2',
        review_flag = 'unit_occupied',
        review_reason = 'Unit is already occupied',
        whitelist_matched = true,
        unit_occupied = true,
        updated_at = now()
      WHERE id = v_pending_id;
      RETURN jsonb_build_object(
        'ok', true,
        'status', 'duplicate_pending',
        'review_flag', 'unit_occupied',
        'request_id', v_pending_id
      );
    END IF;
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'profile_missing');
  END IF;

  UPDATE public.profiles
  SET
    full_name_en = coalesce(v_name, full_name_en),
    email = coalesce(v_email_in, email),
    updated_at = now()
  WHERE id = v_uid;

  /* A: auto approve (whitelist + not occupied) */
  IF v_in_wl AND NOT v_occupied THEN
    v_bind := public.bind_resident_by_unit(p_property_id, v_unit, NULL::date, v_lang);

    IF (coalesce(v_bind ->> 'ok', '') = 'true' OR coalesce((v_bind ->> 'idempotent')::boolean, false) = true) THEN
      UPDATE public.property_invite_codes c
      SET
        used_count = c.used_count + 1,
        is_active = CASE
          WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
          ELSE c.is_active
        END
      WHERE c.id = pic.id;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
        invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
      ) VALUES (
        p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit,
        'public_invite_v2|auto_approved',
        'approved'::public.join_request_status, v_code, 'auto_approved', NULL, true, false, 'entry'
      );

      RETURN jsonb_build_object('ok', true, 'status', 'auto_approved', 'property_id', p_property_id, 'unit_no', v_unit);
    END IF;

    IF (v_bind ->> 'error') = 'unit_not_found' THEN
      INSERT INTO public.residents (
        property_id, user_id, unit_no, name_en, name_zh, email, phone, move_in_date, language_pref,
        role, status, strata_fee_status
      )
      VALUES (
        p_property_id, v_uid, v_unit, v_name, NULL, v_email_in, coalesce(v_prof.phone, ''), NULL,
        v_lang, 'owner', 'active', 'current'
      );

      UPDATE public.profiles prof SET status = 'active', updated_at = now() WHERE prof.id = v_uid;

      UPDATE public.property_invite_codes c
      SET
        used_count = c.used_count + 1,
        is_active = CASE
          WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
          ELSE c.is_active
        END
      WHERE c.id = pic.id;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
        invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
      ) VALUES (
        p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit,
        'public_invite_v2|auto_approved_new_resident',
        'approved'::public.join_request_status, v_code, 'auto_approved', NULL, true, false, 'entry'
      );

      RETURN jsonb_build_object('ok', true, 'status', 'auto_approved', 'property_id', p_property_id, 'unit_no', v_unit);
    END IF;

    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'bind', v_bind);
  END IF;

  /* B: not in whitelist */
  IF NOT v_in_wl THEN
    UPDATE public.property_invite_codes c
    SET
      used_count = c.used_count + 1,
      is_active = CASE
        WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
        ELSE c.is_active
      END
    WHERE c.id = pic.id;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
      invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
    ) VALUES (
      p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit,
      'public_invite_v2|not_in_whitelist',
      'pending'::public.join_request_status, v_code, 'not_in_whitelist',
      'Unit is not in whitelist', false, false, 'entry'
    );

    RETURN jsonb_build_object('ok', true, 'status', 'pending_review', 'review_flag', 'not_in_whitelist');
  END IF;

  /* C: unit occupied (whitelist but taken) */
  IF v_occupied THEN
    UPDATE public.property_invite_codes c
    SET
      used_count = c.used_count + 1,
      is_active = CASE
        WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
        ELSE c.is_active
      END
    WHERE c.id = pic.id;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
      invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
    ) VALUES (
      p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit,
      'public_invite_v2|unit_occupied',
      'pending'::public.join_request_status, v_code, 'unit_occupied',
      'Unit is already occupied', true, true, 'entry'
    );

    RETURN jsonb_build_object('ok', true, 'status', 'pending_review', 'review_flag', 'unit_occupied');
  END IF;

  RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'unexpected_branch');
END;
$fn$;

COMMENT ON FUNCTION public.enter_property_by_public_invite_v2 IS
  'Whitelist + occupancy for /entry public code; definer bypasses RLS.';

REVOKE ALL ON FUNCTION public.enter_property_by_public_invite_v2 FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enter_property_by_public_invite_v2 FROM anon;
GRANT EXECUTE ON FUNCTION public.enter_property_by_public_invite_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.enter_property_by_public_invite_v2 TO service_role;
