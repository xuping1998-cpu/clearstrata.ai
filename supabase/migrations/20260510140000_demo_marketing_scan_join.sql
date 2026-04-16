/*
  # Demo marketing: scan → unit → membership + resident (SECURITY DEFINER)

  - Validates `property_invite_codes` (same rules as resolve_public_invite_code).
  - Ensures `profiles` row for auth.uid() (anonymous or normal).
  - Upserts `residents` for property + unit; upserts `property_members` owner/active.
  - Does not increment `used_count` so codes with `max_uses = 1` remain valid for multiple marketing visitors (adjust codes in admin if you need per-scan quotas).
*/

-- Older linked DBs may never have received 20260404120000_create_leads.sql; ensure base table exists.
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  building text,
  units text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties (id);

COMMENT ON COLUMN public.leads.phone IS 'Optional phone from marketing / contact forms.';
COMMENT ON COLUMN public.leads.property_id IS 'Property context when lead came from scan or property-scoped funnel.';

CREATE OR REPLACE FUNCTION public.demo_marketing_scan_join (p_invite_code text, p_unit_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid ();
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

  SELECT
    * INTO pic
  FROM
    public.property_invite_codes
  WHERE
    code = v_code
    OR lower(code) = lower(v_code)
  LIMIT
    1;

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

  SELECT
    email INTO v_email
  FROM
    auth.users
  WHERE
    id = v_uid;

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

  SELECT
    r.id,
    r.user_id INTO v_res_id,
    v_existing_uid
  FROM
    public.residents r
  WHERE
    r.property_id = v_property_id
    AND lower(trim(r.unit_no)) = lower(v_unit)
  LIMIT
    1;

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
    WHERE
      r.id = v_res_id;
  ELSE
    SELECT
      r.id INTO v_res_id
    FROM
      public.residents r
    WHERE
      r.property_id = v_property_id
      AND r.user_id = v_uid
    LIMIT
      1;

    IF FOUND THEN
      UPDATE public.residents r
      SET
        unit_no = v_unit,
        updated_at = now()
      WHERE
        r.id = v_res_id;
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
    'ok',
    true,
    'property_id',
    v_property_id,
    'unit_no',
    v_unit
  );
END;
$$;

COMMENT ON FUNCTION public.demo_marketing_scan_join (text, text) IS
'Marketing scan funnel: validate public invite code, ensure profile, upsert resident + active owner membership. Requires auth.uid() (e.g. anonymous session).';

REVOKE ALL ON FUNCTION public.demo_marketing_scan_join (text, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.demo_marketing_scan_join (text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.demo_marketing_scan_join (text, text) TO service_role;

NOTIFY pgrst,
'reload schema';
