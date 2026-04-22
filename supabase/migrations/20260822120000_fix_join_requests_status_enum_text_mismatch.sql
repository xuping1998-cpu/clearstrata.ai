/*
  # Fix 42883 / enum-text mismatch on `public.join_requests.status`

  Root cause (typical):
  - `status` column drifted to **text** while expressions still use **join_request_status**
    literals (partial indexes, triggers), so PostgreSQL rejects `text = join_request_status`
    (catalog may also surface as `join_request_status = text`).

  Dependencies on `join_requests.status` (from repo audit; drop before ALTER, recreate after):

  | Kind   | Object name |
  |--------|-------------|
  | Trigger (non-internal) | `join_requests_bump_public_invite_on_approve` ??? AFTER UPDATE OF status ??? `trg_join_requests_bump_public_invite_on_approve` |
  | Trigger (non-internal) | `tr_join_requests_updated_at` ??? BEFORE UPDATE ??? `touch_join_requests_updated_at` (no status compare; still dropped so ALTER is not blocked) |
  | Policy | `jr_select_scope` on `join_requests` ??? does **not** reference `join_requests.status` |
  | CHECK | none on `join_requests` in migrations |
  | Index (partial, status predicate) | `join_requests_one_pending_per_user` ??? `WHERE status = 'pending'::join_request_status` (**must** drop before text???enum USING) |
  | Index (partial, status predicate) | `uniq_pending_request` ??? `WHERE status::text = 'pending'` (drop for same ALTER pass) |

  Comparisons after rebuild: `status::text = 'pending'` and/or `status = 'literal'::public.join_request_status`.
*/

-- ---------------------------------------------------------------------------
-- 1) Normalize column type: text / varchar -> public.join_request_status
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'join_requests'
      AND a.attname = 'status'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'join_request_status'
  ) THEN
    DROP TRIGGER IF EXISTS join_requests_bump_public_invite_on_approve ON public.join_requests;
    DROP TRIGGER IF EXISTS tr_join_requests_updated_at ON public.join_requests;

    DROP INDEX IF EXISTS public.join_requests_one_pending_per_user;
    DROP INDEX IF EXISTS public.uniq_pending_request;

    ALTER TABLE public.join_requests
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.join_requests
      ALTER COLUMN status TYPE public.join_request_status
      USING (
        CASE lower(trim(status::text))
          WHEN 'pending' THEN 'pending'::public.join_request_status
          WHEN 'approved' THEN 'approved'::public.join_request_status
          WHEN 'rejected' THEN 'rejected'::public.join_request_status
          WHEN 'cancelled' THEN 'cancelled'::public.join_request_status
          ELSE 'pending'::public.join_request_status
        END
      );

    ALTER TABLE public.join_requests
      ALTER COLUMN status SET DEFAULT 'pending'::public.join_request_status;
  END IF;
END;
$$;

-- Partial unique indexes (recreated after type normalize; predicates avoid enum=text during ALTER)
CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_per_user
  ON public.join_requests (property_id, user_id)
  WHERE status = 'pending'::public.join_request_status;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_request
  ON public.join_requests (property_id, (lower(trim(email))))
  WHERE status = 'pending'::public.join_request_status
    AND coalesce(trim(email), '') <> '';

DROP TRIGGER IF EXISTS tr_join_requests_updated_at ON public.join_requests;
CREATE TRIGGER tr_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_join_requests_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Trigger: avoid text = join_request_status inside function body
--    (20260409150000_unit_whitelist_invite_codes.sql)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_join_requests_bump_public_invite_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tr$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status::text = 'approved'
     AND OLD.status::text IS DISTINCT FROM NEW.status::text
     AND NEW.invite_id IS NULL
     AND NEW.invite_code IS NOT NULL
     AND length(trim(NEW.invite_code)) > 0
  THEN
    UPDATE public.property_invite_codes pic
    SET
      used_count = pic.used_count + 1,
      is_active = CASE
        WHEN pic.max_uses > 0 AND (pic.used_count + 1) >= pic.max_uses THEN false
        ELSE pic.is_active
      END
    WHERE pic.property_id = NEW.property_id
      AND (pic.code = trim(NEW.invite_code) OR lower(pic.code) = lower(trim(NEW.invite_code)));
  END IF;
  RETURN NEW;
END;
$tr$;

COMMENT ON FUNCTION public.trg_join_requests_bump_public_invite_on_approve() IS
  'After join_requests.status changes to approved (public invite_code path), bump property_invite_codes.used_count. Comparisons use status::text to avoid text vs enum operator errors.';

DROP TRIGGER IF EXISTS join_requests_bump_public_invite_on_approve ON public.join_requests;
CREATE TRIGGER join_requests_bump_public_invite_on_approve
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_join_requests_bump_public_invite_on_approve();

-- ---------------------------------------------------------------------------
-- 3) submit_join_request + helper (same as 20260722120000; pending checks use text)
-- ---------------------------------------------------------------------------

/*
  Unified property entry via submit_join_request (copied from 20260722120000;
  pending duplicate checks use jr.status::text for type safety).
*/

CREATE OR REPLACE FUNCTION public._try_owner_whitelist_auto_join(
  p_uid uuid,
  p_property_id uuid,
  p_unit_no text,
  p_move_in_date date,
  p_language_pref text,
  p_full_name text,
  p_email text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $try$
DECLARE
  v_unit text := NULLIF(trim(both from coalesce(p_unit_no, '')), '');
  v_lang text;
  v_bind jsonb;
  v_email_norm text;
BEGIN
  IF p_uid IS NULL OR p_property_id IS NULL OR v_unit IS NULL OR length(v_unit) = 0 THEN
    RETURN jsonb_build_object('auto_tried', false, 'reason', 'no_unit');
  END IF;

  v_email_norm := lower(trim(coalesce(p_email, '')));
  IF length(trim(coalesce(p_full_name, ''))) = 0 OR v_email_norm = '' THEN
    RETURN jsonb_build_object('auto_tried', false, 'reason', 'incomplete_profile');
  END IF;

  v_lang := CASE
    WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh'
    ELSE 'en'
  END;

  UPDATE public.profiles prof
  SET
    full_name_en = COALESCE(NULLIF(trim(p_full_name), ''), prof.full_name_en),
    email = COALESCE(NULLIF(trim(p_email), ''), prof.email),
    phone = COALESCE(NULLIF(trim(p_phone), ''), prof.phone),
    updated_at = now()
  WHERE prof.id = p_uid;

  IF EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND r.user_id = p_uid
      AND lower(trim(r.unit_no)) IS DISTINCT FROM lower(trim(v_unit))
  ) THEN
    RETURN jsonb_build_object(
      'auto_tried', true,
      'auto_ok', false,
      'reason', 'user_already_bound_other_unit'
    );
  END IF;

  v_bind := public.bind_resident_by_unit(p_property_id, v_unit, p_move_in_date, v_lang);

  IF coalesce(v_bind ->> 'ok', '') = 'true' THEN
    RETURN jsonb_build_object(
      'auto_tried', true,
      'auto_ok', true,
      'bind', v_bind,
      'unit_no', coalesce(v_bind ->> 'unit_no', v_unit)
    );
  END IF;

  RETURN jsonb_build_object(
    'auto_tried', true,
    'auto_ok', false,
    'bind', v_bind,
    'reason', coalesce(v_bind ->> 'error', 'unknown')
  );
END;
$try$;

REVOKE ALL ON FUNCTION public._try_owner_whitelist_auto_join(
  uuid, uuid, text, date, text, text, text, text
) FROM PUBLIC;

COMMENT ON FUNCTION public._try_owner_whitelist_auto_join(uuid, uuid, text, date, text, text, text, text) IS
  'Internal: owner whitelist auto-bind via bind_resident_by_unit; not exposed to API.';

DROP FUNCTION IF EXISTS public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid DEFAULT NULL,
  p_requested_role public.user_role DEFAULT 'owner'::public.user_role,
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_direct_invite_id uuid DEFAULT NULL,
  p_inferred_role text DEFAULT NULL,
  p_inferred_unit_number text DEFAULT NULL,
  p_move_in_date date DEFAULT NULL,
  p_language_pref text DEFAULT 'en'
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
  v_email_norm text;

  inv public.property_invites%ROWTYPE;
  c text := NULLIF(trim(p_invite_code), '');

  dir public.property_direct_invites%ROWTYPE;
  pic public.property_invite_codes%ROWTYPE;

  v_role public.user_role;
  v_unit text;

  v_inf_role text;
  v_inf_unit text;

  v_auto jsonb;
  v_join_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'NOT_AUTHENTICATED',
      'message_zh', '????????????????'
    );
  END IF;

  -- ========= A) Directed invite (property_direct_invites) =========
  IF p_direct_invite_id IS NOT NULL THEN
    SELECT * INTO dir
    FROM public.property_direct_invites
    WHERE id = p_direct_invite_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '??????????'
      );
    END IF;

    IF dir.property_id IS DISTINCT FROM p_property_id THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '??????????????????'
      );
    END IF;

    IF NOT dir.is_active THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '??????????'
      );
    END IF;

    IF dir.expires_at IS NOT NULL AND dir.expires_at < now() THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVITE_EXPIRED',
        'message_zh', '???????????'
      );
    END IF;

    IF dir.max_uses > 0 AND dir.used_count >= dir.max_uses THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVITE_LIMIT_REACHED',
        'message_zh', '????????????????????'
      );
    END IF;

    SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

    IF EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = dir.property_id
        AND pm.user_id = v_uid
        AND pm.status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_member',
        'message', 'ALREADY_MEMBER',
        'message_zh', '??????????????????????????????????'
      );
    END IF;

    v_role := public.map_intended_role_to_user_role(dir.intended_role);

    v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
    v_name := COALESCE(NULLIF(trim(p_full_name), ''), NULLIF(trim(dir.intended_name), ''), vprof.full_name_en, v_email);
    v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
    v_email_norm := lower(trim(coalesce(v_email, '')));

    IF v_email_norm <> '' AND EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND (jr.status::text = 'pending')
        AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '????????????????????????????'
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.user_id = v_uid
        AND (jr.status::text = 'pending')
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '????????????????????????????'
      );
    END IF;

    v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(dir.unit_number), ''));
    v_inf_role := COALESCE(NULLIF(trim(p_inferred_role), ''), NULLIF(trim(dir.intended_role), ''));
    v_inf_unit := COALESCE(NULLIF(trim(p_inferred_unit_number), ''), NULLIF(trim(dir.unit_number), ''));

    IF v_role = 'owner'::public.user_role
      AND v_unit IS NOT NULL
      AND length(trim(v_unit)) > 0
      AND length(trim(coalesce(v_name, ''))) > 0
      AND length(v_email_norm) > 0
    THEN
      v_auto := public._try_owner_whitelist_auto_join(
        v_uid,
        dir.property_id,
        v_unit,
        p_move_in_date,
        p_language_pref,
        v_name,
        v_email,
        v_phone
      );
      IF (v_auto ->> 'auto_ok') = 'true' THEN
        UPDATE public.property_direct_invites
        SET used_count = used_count + 1
        WHERE id = dir.id;

        IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
          UPDATE public.property_direct_invites
          SET is_active = false
          WHERE id = dir.id;
        END IF;

        RETURN jsonb_build_object(
          'ok', true,
          'success', true,
          'property_id', dir.property_id,
          'role', v_role::text,
          'message', 'AUTO_APPROVED',
          'entry_path', 'auto_approved',
          'pending_created', false,
          'auto_approve', 'passed',
          'residents_bind', v_auto -> 'bind',
          'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
        );
      END IF;
    END IF;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
      invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
    ) VALUES (
      dir.property_id,
      v_uid,
      v_role,
      v_name,
      v_email,
      v_phone,
      v_unit,
      p_note,
      'pending'::join_request_status,
      NULL,
      NULL,
      dir.id,
      v_inf_role,
      v_inf_unit
    )
    RETURNING id INTO v_join_id;

    UPDATE public.property_direct_invites
    SET used_count = used_count + 1
    WHERE id = dir.id;

    IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
      UPDATE public.property_direct_invites
      SET is_active = false
      WHERE id = dir.id;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'property_id', dir.property_id,
      'role', v_role::text,
      'message', 'PENDING_APPROVAL',
      'join_request_id', v_join_id,
      'entry_path', 'pending_submitted',
      'pending_created', true,
      'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
      'auto_fail_reason', v_auto ->> 'reason'
    );
  END IF;

  -- ========= B) Legacy property_invites (upper code) =========
  IF c IS NOT NULL THEN
    c := upper(c);

    SELECT * INTO inv
    FROM public.property_invites
    WHERE code = c
    FOR UPDATE;

    IF FOUND THEN
      IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
        UPDATE public.property_invites
        SET status = 'expired'
        WHERE id = inv.id;

        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF inv.status <> 'active' THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = inv.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_member',
          'message', 'ALREADY_MEMBER',
          'message_zh', '??????????????????????????????????'
        );
      END IF;

      v_email_norm := lower(trim(coalesce(vprof.email, '')));

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND (jr.status::text = 'pending')
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '????????????????????????????'
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.user_id = v_uid
          AND (jr.status::text = 'pending')
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '????????????????????????????'
        );
      END IF;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
        invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
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
        c,
        NULL,
        inv.role::text,
        NULL
      );

      UPDATE public.property_invites
      SET used_count = used_count + 1
      WHERE id = inv.id;

      RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'property_id', inv.property_id,
        'role', inv.role::text,
        'message', 'PENDING_APPROVAL',
        'entry_path', 'pending_submitted',
        'pending_created', true,
        'auto_approve', 'skipped'
      );
    END IF;
  END IF;

  -- ========= C) Public property_invite_codes =========
  c := NULLIF(trim(p_invite_code), '');

  IF c IS NOT NULL THEN
    SELECT * INTO pic
    FROM public.property_invite_codes
    WHERE code = c OR lower(code) = lower(c)
    FOR UPDATE;

    IF FOUND THEN
      IF NOT pic.is_active THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE',
          'message_zh', '???????????'
        );
      END IF;

      IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVITE_LIMIT_REACHED',
          'message_zh', '????????????????????'
        );
      END IF;

      IF pic.property_id IS DISTINCT FROM p_property_id THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE',
          'message_zh', '???????????????????'
        );
      END IF;

      SELECT * INTO vprof
      FROM public.profiles
      WHERE id = v_uid;

      v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
      v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
      v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
      v_email_norm := lower(trim(coalesce(v_email, '')));

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = pic.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_member',
          'message', 'ALREADY_MEMBER',
          'message_zh', '??????????????????????????????????'
        );
      END IF;

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND (jr.status::text = 'pending')
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '????????????????????????????'
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.user_id = v_uid
          AND (jr.status::text = 'pending')
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '????????????????????????????'
        );
      END IF;

      v_inf_role := NULLIF(trim(p_inferred_role), '');
      v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

      IF p_requested_role = 'owner'::public.user_role
        AND NULLIF(trim(p_unit_number), '') IS NOT NULL
        AND length(trim(coalesce(v_name, ''))) > 0
        AND length(v_email_norm) > 0
      THEN
        v_auto := public._try_owner_whitelist_auto_join(
          v_uid,
          pic.property_id,
          trim(p_unit_number),
          p_move_in_date,
          p_language_pref,
          v_name,
          v_email,
          v_phone
        );
        IF (v_auto ->> 'auto_ok') = 'true' THEN
          UPDATE public.property_invite_codes
          SET used_count = used_count + 1
          WHERE id = pic.id;

          IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
            UPDATE public.property_invite_codes
            SET is_active = false
            WHERE id = pic.id;
          END IF;

          RETURN jsonb_build_object(
            'ok', true,
            'success', true,
            'property_id', pic.property_id,
            'entry_path', 'auto_approved',
            'pending_created', false,
            'auto_approve', 'passed',
            'residents_bind', v_auto -> 'bind',
            'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
          );
        END IF;
      END IF;

      INSERT INTO public.join_requests (
        property_id,
        user_id,
        requested_role,
        full_name,
        email,
        phone,
        unit_number,
        note,
        status,
        invite_id,
        invite_code,
        direct_invite_id,
        inferred_role,
        inferred_unit_number
      ) VALUES (
        pic.property_id,
        v_uid,
        p_requested_role,
        v_name,
        v_email,
        v_phone,
        NULLIF(trim(p_unit_number), ''),
        p_note,
        'pending'::join_request_status,
        NULL,
        pic.code,
        NULL,
        v_inf_role,
        v_inf_unit
      )
      RETURNING id INTO v_join_id;

      UPDATE public.property_invite_codes
      SET used_count = used_count + 1
      WHERE id = pic.id;

      IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
        UPDATE public.property_invite_codes
        SET is_active = false
        WHERE id = pic.id;
      END IF;

      RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'join_request_id', v_join_id,
        'entry_path', 'pending_submitted',
        'pending_created', true,
        'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
        'auto_fail_reason', v_auto ->> 'reason'
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'message', 'INVALID_INVITE'
    );
  END IF;

  -- ========= D) Public open join by property =========
  IF p_property_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'bad_property',
      'message', 'Invalid or missing property.',
      'message_zh', '????????????????????'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.allow_public_join_requests = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'property_closed',
      'message', 'This property is not accepting public applications.',
      'message_zh', '??????????????????????????'
    );
  END IF;

  SELECT * INTO vprof
  FROM public.profiles
  WHERE id = v_uid;

  v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
  v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
  v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
  v_email_norm := lower(trim(coalesce(v_email, '')));

  IF EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_member',
      'message', 'You are already a member of this property.',
      'message_zh', '??????????????????????????????????'
    );
  END IF;

  IF v_email_norm <> '' AND EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND (jr.status::text = 'pending')
      AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_pending',
      'message', 'You already have a pending request for this property.',
      'message_zh', '????????????????????????????'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.user_id = v_uid
      AND (jr.status::text = 'pending')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_pending',
      'message', 'You already have a pending request for this property.',
      'message_zh', '????????????????????????????'
    );
  END IF;

  v_inf_role := NULLIF(trim(p_inferred_role), '');
  v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

  v_auto := NULL;
  IF p_requested_role = 'owner'::public.user_role
    AND NULLIF(trim(p_unit_number), '') IS NOT NULL
    AND length(trim(coalesce(v_name, ''))) > 0
    AND length(v_email_norm) > 0
  THEN
    v_auto := public._try_owner_whitelist_auto_join(
      v_uid,
      p_property_id,
      trim(p_unit_number),
      p_move_in_date,
      p_language_pref,
      v_name,
      v_email,
      v_phone
    );
    IF (v_auto ->> 'auto_ok') = 'true' THEN
      RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'property_id', p_property_id,
        'entry_path', 'auto_approved',
        'pending_created', false,
        'auto_approve', 'passed',
        'residents_bind', v_auto -> 'bind',
        'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
      );
    END IF;
  END IF;

  INSERT INTO public.join_requests (
    property_id,
    user_id,
    requested_role,
    full_name,
    email,
    phone,
    unit_number,
    note,
    status,
    invite_id,
    invite_code,
    direct_invite_id,
    inferred_role,
    inferred_unit_number
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    v_name,
    v_email,
    v_phone,
    NULLIF(trim(p_unit_number), ''),
    p_note,
    'pending'::join_request_status,
    NULL,
    NULL,
    NULL,
    v_inf_role,
    v_inf_unit
  )
  RETURNING id INTO v_join_id;

  RETURN jsonb_build_object(
    'ok', true,
    'success', true,
    'property_id', p_property_id,
    'join_request_id', v_join_id,
    'entry_path', 'pending_submitted',
    'pending_created', true,
    'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
    'auto_fail_reason', v_auto ->> 'reason'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) TO authenticated;

COMMENT ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) IS
  'Submit join request or auto-approve owner when roster unit is free (unified property entry).';

NOTIFY pgrst, 'reload schema';
