-- ---------------------------------------------------------------------------
-- Unit whitelist: council/admin maintain allowed units per property (no SQL).
-- When a property has ≥1 active row, bind_resident_by_unit + demo_marketing_scan_join
-- require the unit to appear in this list (in addition to existing roster / invite rules).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.unit_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  unit_no text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_whitelist_property_unit_unique UNIQUE (property_id, unit_no)
);

CREATE INDEX IF NOT EXISTS idx_unit_whitelist_property_active_lower
  ON public.unit_whitelist (property_id, lower(trim(unit_no)))
  WHERE is_active;

COMMENT ON TABLE public.unit_whitelist IS
  'Allowed unit numbers for self-service bind / marketing scan when list is non-empty; managed in app.';

CREATE OR REPLACE FUNCTION public.check_unit_whitelist_passes(p_property_id uuid, p_unit text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $w$
  SELECT CASE
    WHEN p_property_id IS NULL THEN true
    WHEN coalesce(trim(p_unit), '') = '' THEN false
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.unit_whitelist uw
      WHERE uw.property_id = p_property_id
        AND uw.is_active
    ) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.unit_whitelist uw
      WHERE uw.property_id = p_property_id
        AND uw.is_active
        AND lower(trim(uw.unit_no)) = lower(trim(p_unit))
    )
  END;
$w$;

REVOKE ALL ON FUNCTION public.check_unit_whitelist_passes(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_unit_whitelist_passes(uuid, text) TO authenticated, anon, service_role;

ALTER TABLE public.unit_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY unit_whitelist_select
  ON public.unit_whitelist FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN ('admin'::public.user_role, 'council'::public.user_role)
    )
  );

CREATE POLICY unit_whitelist_insert
  ON public.unit_whitelist FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN ('admin'::public.user_role, 'council'::public.user_role)
    )
  );

CREATE POLICY unit_whitelist_update
  ON public.unit_whitelist FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN ('admin'::public.user_role, 'council'::public.user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN ('admin'::public.user_role, 'council'::public.user_role)
    )
  );

CREATE POLICY unit_whitelist_delete
  ON public.unit_whitelist FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN ('admin'::public.user_role, 'council'::public.user_role)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_whitelist TO authenticated;

-- ---------------------------------------------------------------------------
-- bind_resident_by_unit: enforce whitelist when property has active rows
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bind_resident_by_unit(
  p_property_id uuid,
  p_unit_no text,
  p_move_in_date date DEFAULT NULL,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_unit text := trim(both from coalesce(p_unit_no, ''));
  v_row public.residents%ROWTYPE;
  v_prof record;
  v_pm_before boolean;
  v_pm_after boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR v_unit = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  IF NOT public.check_unit_whitelist_passes(p_property_id, v_unit) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'unit_not_whitelisted',
      'message_zh', '该房号未列入业委会白名单'
    );
  END IF;

  IF p_language_pref IS NOT NULL AND lower(trim(p_language_pref)) NOT IN ('en', 'zh') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_language_pref');
  END IF;

  SELECT *
  INTO v_row
  FROM public.residents r
  WHERE r.property_id = p_property_id
    AND lower(trim(r.unit_no)) = lower(v_unit)
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unit_not_found');
  END IF;

  IF v_row.user_id IS NOT NULL AND v_row.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unit_already_bound');
  END IF;

  IF v_row.user_id = v_uid THEN
    UPDATE public.profiles prof
    SET
      status = 'active',
      updated_at = now()
    WHERE prof.id = v_uid;

    INSERT INTO public.property_members (property_id, user_id, role, status)
    VALUES (p_property_id, v_uid, 'owner'::public.user_role, 'active'::public.member_status)
    ON CONFLICT (property_id, user_id) DO NOTHING;

    SELECT EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = p_property_id
        AND pm.user_id = v_uid
    )
    INTO v_pm_after;

    RETURN jsonb_build_object(
      'ok', true,
      'property_id', p_property_id,
      'resident_id', v_row.id,
      'idempotent', true,
      'property_members_present', v_pm_after
    );
  END IF;

  SELECT id, email, full_name_en, full_name_zh, phone
  INTO v_prof
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_missing');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
  )
  INTO v_pm_before;

  UPDATE public.residents res
  SET
    user_id = v_uid,
    status = 'active',
    email = coalesce(nullif(trim(v_prof.email), ''), res.email),
    name_en = CASE
      WHEN trim(coalesce(res.name_en, '')) = '' THEN coalesce(nullif(trim(v_prof.full_name_en), ''), res.name_en, 'Owner')
      ELSE res.name_en
    END,
    name_zh = coalesce(nullif(trim(v_prof.full_name_zh), ''), res.name_zh),
    phone = coalesce(nullif(trim(v_prof.phone), ''), res.phone, ''),
    move_in_date = coalesce(p_move_in_date, res.move_in_date),
    language_pref = CASE
      WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh'::text
      ELSE 'en'::text
    END,
    updated_at = now()
  WHERE res.id = v_row.id;

  UPDATE public.profiles prof
  SET
    status = 'active',
    updated_at = now()
  WHERE prof.id = v_uid;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
  )
  INTO v_pm_after;

  RETURN jsonb_build_object(
    'ok', true,
    'property_id', p_property_id,
    'resident_id', v_row.id,
    'unit_no', v_unit,
    'property_members_before', v_pm_before,
    'property_members_after', v_pm_after
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- demo_marketing_scan_join: same gate before mutating data
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.demo_marketing_scan_join(p_invite_code text, p_unit_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := NULLIF(trim(both from coalesce(p_invite_code, '')), '');
  v_unit text := trim(both from coalesce(p_unit_no, ''));
  pic public.property_invite_codes%ROWTYPE;
  v_property_id uuid;
  v_email text;
  v_res_id uuid;
  v_existing_uid uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_code IS NULL OR v_unit = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  SELECT * INTO pic
  FROM public.property_invite_codes
  WHERE code = v_code OR lower(code) = lower(v_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF NOT pic.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive_code');
  END IF;

  IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exhausted');
  END IF;

  v_property_id := pic.property_id;

  IF NOT public.check_unit_whitelist_passes(v_property_id, v_unit) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'unit_not_whitelisted',
      'message_zh', '该房号未列入业委会白名单'
    );
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  v_email := coalesce(nullif(trim(v_email), ''), v_uid::text || '@anonymous.scan');

  INSERT INTO public.profiles (
    id,
    full_name_en,
    email,
    role,
    preferred_language,
    status,
    unit_number
  )
  VALUES (
    v_uid,
    '扫码访客',
    v_email,
    'owner',
    'en',
    'active',
    v_unit
  )
  ON CONFLICT (id) DO UPDATE
  SET
    unit_number = excluded.unit_number,
    updated_at = now(),
    status = CASE
      WHEN public.profiles.status = 'suspended'::text THEN public.profiles.status
      ELSE 'active'
    END;

  SELECT r.id, r.user_id INTO v_res_id, v_existing_uid
  FROM public.residents r
  WHERE r.property_id = v_property_id
    AND lower(trim(r.unit_no)) = lower(v_unit)
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_uid IS NOT NULL AND v_existing_uid IS DISTINCT FROM v_uid THEN
      RETURN jsonb_build_object('ok', false, 'error', 'unit_claimed');
    END IF;

    UPDATE public.residents r
    SET
      user_id = v_uid,
      unit_no = v_unit,
      status = 'active',
      email = coalesce(nullif(trim(r.email), ''), v_email),
      name_en = CASE
        WHEN trim(coalesce(r.name_en, '')) = '' THEN '业主'
        ELSE r.name_en
      END,
      phone = coalesce(r.phone, ''),
      updated_at = now()
    WHERE r.id = v_res_id;
  ELSE
    SELECT r.id INTO v_res_id
    FROM public.residents r
    WHERE r.property_id = v_property_id
      AND r.user_id = v_uid
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.residents r
      SET
        unit_no = v_unit,
        updated_at = now()
      WHERE r.id = v_res_id;
    ELSE
      INSERT INTO public.residents (
        property_id,
        user_id,
        unit_no,
        name_en,
        name_zh,
        email,
        phone,
        language_pref,
        role,
        status,
        strata_fee_status
      )
      VALUES (
        v_property_id,
        v_uid,
        v_unit,
        '业主',
        NULL,
        v_email,
        '',
        'en',
        'owner',
        'active',
        'current'
      );
    END IF;
  END IF;

  INSERT INTO public.property_members (property_id, user_id, role, status)
  VALUES (v_property_id, v_uid, 'owner'::public.user_role, 'active'::public.member_status)
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    status = 'active'::public.member_status,
    role = 'owner'::public.user_role;

  RETURN jsonb_build_object(
    'ok', true,
    'property_id', v_property_id,
    'unit_no', v_unit
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
