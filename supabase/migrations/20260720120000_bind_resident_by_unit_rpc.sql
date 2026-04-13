/*
  # Self-service: bind auth user to a pre-seeded `residents` row by (property_id, unit_no)

  - `residents.user_id` may be NULL for roster rows awaiting first login.
  - Drops legacy `UNIQUE(user_id)` so one user can have residents in multiple properties.
  - Adds partial unique index: one non-null user per (property_id, user_id).
  - RPC `bind_resident_by_unit` updates resident + activates profile; `property_members` is filled
    by existing trigger `residents_ensure_property_member` on UPDATE OF user_id.
*/

-- ---------------------------------------------------------------------------
-- 1) Schema: allow NULL user_id; drop global unique on user_id only
-- ---------------------------------------------------------------------------

ALTER TABLE public.residents
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.residents DROP CONSTRAINT IF EXISTS residents_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_property_user_not_null
  ON public.residents (property_id, user_id)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) RPC
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

COMMENT ON FUNCTION public.bind_resident_by_unit(uuid, text, date, text) IS
  'Authenticated user binds to a roster resident row (user_id NULL) by property + unit; activates profile; trigger adds property_members.';

REVOKE ALL ON FUNCTION public.bind_resident_by_unit(uuid, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bind_resident_by_unit(uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bind_resident_by_unit(uuid, text, date, text) TO service_role;
