/*
  # approve_pending_property_member_with_residents

  Admin/council (active on property): for a **pending** `property_members` row,
  upsert `residents` (match by user_id, then email, then unit with no conflicting user),
  then set `property_members` → `active` and `profiles.status` → `active`.

  Client-side UPDATE on `property_members` is blocked by RLS; this RPC is SECURITY DEFINER.
*/

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
    SELECT NULLIF(trim(both from coalesce(pm.unit_number, '')), '')
    INTO v_unit
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = p_user_id
      AND pm.status = 'pending'::public.member_status
    LIMIT 1;
  END IF;

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
    status = 'active'::public.member_status,
    unit_number = COALESCE(trim(v_unit), pm.unit_number)
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

COMMENT ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) IS
  'Admin/council: pending membership → active; upsert residents for owner.';

REVOKE ALL ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
