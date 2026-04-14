/*
  # approve_join_request_final — void, idempotent, staff-only

  Replaces prior `RETURNS jsonb` overload (same arg types: uuid, uuid, text).
  PostgREST: success ⇒ `error` is null; `data` is null/empty.

  - Staff on `p_property_id`: `council` / `admin` / `manager` / `property_admin`, **active** `property_members`.
  - Already **approved** for this `join_requests.id` + matching property ⇒ **no-op** (safe to call again).
  - Otherwise **pending** only; resolves applicant by **profiles** email, then **auth.users** email, then requires **profiles** row.
  - **Residents**: update existing `(property_id, user_id)`; else bind roster row `(property_id, unit, user_id IS NULL)`;
    else **unit_already_bound** if another user holds that unit; else **INSERT**.
  - **property_members**: upsert to **active** with `unit_number` / `approved_by` / `approved_at`.
  - **join_requests** → **approved**; optional **property_invites** consumption; **user_notifications** best-effort.

  Parameter `p_unit_no`: optional override when non-empty (wins over `join_requests.unit_number`).
*/

DROP FUNCTION IF EXISTS public.approve_join_request_final(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.approve_join_request_final(
  p_request_id uuid,
  p_property_id uuid,
  p_unit_no text DEFAULT NULL
)
RETURNS void
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
  v_role public.user_role;
  v_property_name text;
  v_res_row_id uuid;
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_actor
      AND pm.property_id = p_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO jr FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF jr.property_id IS DISTINCT FROM p_property_id THEN
    RAISE EXCEPTION 'property_mismatch';
  END IF;

  IF jr.status = 'approved'::public.join_request_status THEN
    RETURN;
  END IF;

  IF jr.status IS DISTINCT FROM 'pending'::public.join_request_status THEN
    RAISE EXCEPTION 'already_processed';
  END IF;

  IF jr.email IS NULL OR length(trim(jr.email)) = 0 THEN
    RAISE EXCEPTION 'missing_email';
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
    RAISE EXCEPTION 'applicant_not_found';
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_missing';
  END IF;

  IF jr.user_id IS NOT NULL AND jr.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'user_mismatch';
  END IF;

  v_unit := COALESCE(
    NULLIF(trim(p_unit_no), ''),
    NULLIF(trim(jr.unit_number), ''),
    ''
  );
  IF v_unit = '' THEN
    RAISE EXCEPTION 'missing_unit_number';
  END IF;

  v_role := COALESCE(jr.requested_role, 'owner'::public.user_role);

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

  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.property_id = p_property_id
        AND lower(trim(r.unit_no)) = lower(trim(v_unit))
        AND r.user_id IS NOT NULL
        AND r.user_id IS DISTINCT FROM v_user_id
    ) THEN
      RAISE EXCEPTION 'unit_already_bound';
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
    unit_number,
    approved_by,
    approved_at
  )
  VALUES (
    p_property_id,
    v_user_id,
    v_role,
    'active'::public.member_status,
    trim(v_unit),
    v_actor,
    now()
  )
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'active'::public.member_status,
    unit_number = COALESCE(
      NULLIF(trim(EXCLUDED.unit_number::text), ''),
      NULLIF(trim(public.property_members.unit_number::text), '')
    ),
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

  RETURN;
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request_final(uuid, uuid, text) IS
  'Idempotent join approval: staff-only; void; residents + property_members; join_requests approved; invite + notification side effects.';

REVOKE ALL ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) TO authenticated;
