/*
  # Unit number only on residents; drop property_members.unit_number; enter_property_by_invite

  - Single source of truth: public.residents.unit_no
  - property_members: no unit column (DROP IF EXISTS unit_number)
  - invitation_codes view already maps property_invite_codes (unit_no, role, used_count, usage_limit)
  - enter_property_by_invite: validate invite, bind roster via bind_resident_by_unit, align role, bump used_count
  - residents_ensure_property_member: map residents.role text to property_members.user_role
  - approve_pending_property_member_with_residents: stop writing pm.unit_number
*/
ALTER TABLE public.property_members DROP COLUMN IF EXISTS unit_number;


-- ---------------------------------------------------------------------------
-- residents_ensure_property_member: role from residents.role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.residents_ensure_property_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tr$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := CASE lower(trim(coalesce(NEW.role::text, 'owner')))
    WHEN 'council' THEN 'council'::public.user_role
    WHEN 'manager' THEN 'manager'::public.user_role
    ELSE 'owner'::public.user_role
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_members (property_id, user_id, role, status)
    SELECT NEW.property_id, NEW.user_id, v_role, 'active'::public.member_status
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = NEW.property_id
        AND pm.user_id = NEW.user_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      INSERT INTO public.property_members (property_id, user_id, role, status)
      SELECT NEW.property_id, NEW.user_id, v_role, 'active'::public.member_status
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = NEW.property_id
          AND pm.user_id = NEW.user_id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$tr$;

-- ---------------------------------------------------------------------------
-- approve_pending_property_member_with_residents (no pm.unit_number)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_pending_property_member_with_residents(
  p_property_id uuid,
  p_user_id uuid,
  p_unit_no text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_name_zh text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_language_pref text DEFAULT 'en',
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_reviewer uuid := auth.uid();
  v_allowed boolean := false;
  v_unit text;
  v_prof public.profiles%ROWTYPE;
  v_res public.residents%ROWTYPE;
  v_row_found boolean := false;
  v_email_merge text;
  v_lang text;
  v_phone_merge text;
  v_name_en_merge text;
  v_name_zh_merge text;
  v_res_outcome text;
  v_pm_n int := 0;
BEGIN
  IF v_reviewer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_reviewer
      AND r.status = 'active'::public.member_status
      AND r.role IN (
        'admin'::public.user_role,
        'council'::public.user_role
      )
  )
  INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members t
    WHERE t.property_id = p_property_id
      AND t.user_id = p_user_id
      AND t.status = 'pending'::public.member_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  v_unit := NULLIF(trim(both from coalesce(p_unit_no, '')), '');
  IF v_unit IS NULL OR v_unit = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_unit');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_email_merge := COALESCE(NULLIF(trim(p_email), ''), NULLIF(trim(v_prof.email), ''));
  IF v_email_merge IS NULL OR v_email_merge = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_email');
  END IF;

  v_name_en_merge := COALESCE(
    NULLIF(trim(p_name_en), ''),
    NULLIF(trim(v_prof.full_name_en), ''),
    split_part(v_email_merge, '@', 1),
    'Owner'
  );
  v_name_zh_merge := COALESCE(NULLIF(trim(p_name_zh), ''), NULLIF(trim(v_prof.full_name_zh), ''), NULL);
  v_phone_merge := COALESCE(NULLIF(trim(p_phone), ''), NULLIF(trim(v_prof.phone), ''), '');
  v_lang := CASE
    WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh'
    ELSE 'en'
  END;

  SELECT *
  INTO v_res
  FROM public.residents r
  WHERE r.property_id = p_property_id
    AND r.user_id = p_user_id
  LIMIT 1
  FOR UPDATE;

  v_row_found := FOUND;

  IF NOT v_row_found THEN
    SELECT *
    INTO v_res
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.email)) = lower(trim(v_email_merge))
    LIMIT 1
    FOR UPDATE;

    v_row_found := FOUND;
  END IF;

  IF NOT v_row_found THEN
    SELECT *
    INTO v_res
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(trim(v_unit))
    LIMIT 1
    FOR UPDATE;

    v_row_found := FOUND;

    IF v_row_found AND v_res.user_id IS NOT NULL AND v_res.user_id IS DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'unit_already_bound');
    END IF;
  END IF;

  IF v_row_found THEN
    IF v_res.user_id IS NOT NULL
      AND v_res.user_id IS DISTINCT FROM p_user_id
      AND lower(trim(coalesce(v_res.email, ''))) IS DISTINCT FROM lower(trim(v_email_merge))
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'resident_row_conflict');
    END IF;

    UPDATE public.residents res
    SET
      user_id = p_user_id,
      unit_no = trim(v_unit),
      name_en = v_name_en_merge,
      name_zh = v_name_zh_merge,
      email = v_email_merge,
      phone = v_phone_merge,
      language_pref = v_lang,
      role = 'owner'::text,
      status = 'active',
      updated_at = now()
    WHERE res.id = v_res.id;

    v_res_outcome := 'updated';
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
      p_user_id,
      trim(v_unit),
      v_name_en_merge,
      v_name_zh_merge,
      v_email_merge,
      v_phone_merge,
      NULL,
      v_lang,
      'owner',
      'active',
      'current'
    );

    v_res_outcome := 'inserted';
  END IF;

  UPDATE public.property_members pm
  SET
    status = 'active'::public.member_status
  WHERE pm.property_id = p_property_id
    AND pm.user_id = p_user_id
    AND pm.status = 'pending'::public.member_status;

  GET DIAGNOSTICS v_pm_n = ROW_COUNT;

  UPDATE public.profiles prof
  SET
    status = 'active',
    updated_at = now()
  WHERE prof.id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'resident_outcome', v_res_outcome,
    'property_members_updated', v_pm_n > 0,
    'property_id', p_property_id,
    'user_id', p_user_id,
    'unit_no', trim(v_unit)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.approve_pending_property_member_with_residents(uuid, uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pending_property_member_with_residents(uuid, uuid, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) IS
  'Admin/council: pending membership → active; residents hold unit_no only (no property_members.unit_number).';

-- ---------------------------------------------------------------------------
-- enter_property_by_invite — QR / public invite code (property_invite_codes / invitation_codes view)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enter_property_by_invite(
  p_property_id uuid,
  p_invite_code text,
  p_unit_no text DEFAULT NULL,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ep$
DECLARE
  v_uid uuid := auth.uid();
  pic public.property_invite_codes%ROWTYPE;
  v_unit text;
  v_bind jsonb;
  v_res_role text;
  v_pm_role public.user_role;
  v_lang text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR p_invite_code IS NULL OR length(trim(p_invite_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  SELECT *
  INTO pic
  FROM public.property_invite_codes c
  WHERE c.property_id = p_property_id
    AND upper(trim(c.code)) = upper(trim(p_invite_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found');
  END IF;

  IF NOT pic.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_inactive');
  END IF;

  IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_exhausted');
  END IF;

  IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_expired');
  END IF;

  v_unit := trim(both from coalesce(nullif(trim(pic.unit_no), ''), nullif(trim(p_unit_no), ''), ''));
  IF v_unit = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_unit');
  END IF;

  IF nullif(trim(pic.unit_no), '') IS NOT NULL
     AND nullif(trim(p_unit_no), '') IS NOT NULL
     AND lower(trim(p_unit_no)) IS DISTINCT FROM lower(trim(pic.unit_no)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unit_mismatch_invite');
  END IF;

  v_res_role := lower(trim(pic.role));
  IF v_res_role NOT IN ('owner', 'council', 'manager') THEN
    v_res_role := 'owner';
  END IF;

  v_pm_role := CASE v_res_role
    WHEN 'council' THEN 'council'::public.user_role
    WHEN 'manager' THEN 'manager'::public.user_role
    ELSE 'owner'::public.user_role
  END;

  v_lang := CASE WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh' ELSE 'en' END;

  v_bind := public.bind_resident_by_unit(p_property_id, v_unit, NULL::date, v_lang);

  IF coalesce((v_bind ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RETURN v_bind;
  END IF;

  IF coalesce((v_bind ->> 'idempotent')::boolean, false) THEN
    RETURN v_bind || jsonb_build_object(
      'invite_incremented', false,
      'note', 'already_bound_same_unit'
    );
  END IF;

  UPDATE public.residents r
  SET
    role = v_res_role,
    updated_at = now()
  WHERE r.property_id = p_property_id
    AND r.user_id = v_uid
    AND lower(trim(r.unit_no)) = lower(trim(v_unit));

  INSERT INTO public.property_members (property_id, user_id, role, status)
  VALUES (p_property_id, v_uid, v_pm_role, 'active'::public.member_status)
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'active'::public.member_status;

  UPDATE public.property_invite_codes c
  SET
    used_count = c.used_count + 1,
    is_active = CASE
      WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
      ELSE c.is_active
    END
  WHERE c.id = pic.id;

  RETURN v_bind || jsonb_build_object(
    'ok', true,
    'invite_incremented', true,
    'membership_role', v_pm_role::text
  );
END;
$ep$;

COMMENT ON FUNCTION public.enter_property_by_invite(uuid, text, text, text) IS
  'Validate property_invite_codes (invitation_codes view), bind roster via bind_resident_by_unit, set residents.role + property_members.role, bump used_count.';

REVOKE ALL ON FUNCTION public.enter_property_by_invite(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enter_property_by_invite(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enter_property_by_invite(uuid, text, text, text) TO service_role;
DROP FUNCTION IF EXISTS public.approve_join_request_final(uuid, uuid, text);

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
  inv public.property_invites%ROWTYPE;
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
      AND pm.status = 'active'::public.member_status
      AND pm.role IN ('council', 'admin')
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
      NULLIF(trim(jr.unit_number), ''),
      ''
    );
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
    NULLIF(trim(jr.unit_number), ''),
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
    'active'::public.member_status,
    v_actor,
    now()
  )
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = 'owner'::public.user_role,
    status = 'active'::public.member_status,
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
  'Final join approval: council/admin only; jsonb result; residents + property_members owner/active; join_requests approved.';

REVOKE ALL ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) TO service_role;

-- Partial unique index `uniq_pending_request` is defined in 20260724130000_join_requests_unique_pending_property_email.sql
-- Staff approval must use approve_join_request (council wrapper), not this function, when 202607291 migration is applied.

NOTIFY pgrst, 'reload schema';
