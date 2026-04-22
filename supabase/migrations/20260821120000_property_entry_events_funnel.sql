-- Funnel analytics: property_entry_events + get_invite_funnel_analytics + submit_join_request logging.

-- ---------------------------------------------------------------------------
-- 1) Event store
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.property_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code text,
  source text,
  event_type text NOT NULL,
  result_kind text,
  unit_no text,
  role text,
  request_id uuid,
  membership_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_property_id
  ON public.property_entry_events(property_id);
CREATE INDEX IF NOT EXISTS idx_property_entry_events_invite_code
  ON public.property_entry_events(invite_code);
CREATE INDEX IF NOT EXISTS idx_property_entry_events_created_at
  ON public.property_entry_events(created_at);
CREATE INDEX IF NOT EXISTS idx_property_entry_events_event_type
  ON public.property_entry_events(event_type);

COMMENT ON TABLE public.property_entry_events IS 'Invite / QR funnel: entry_opened, auth_*, submit_*, submit_finished.';

ALTER TABLE public.property_entry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_entry_events_staff_select
  ON public.property_entry_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.property_id = property_entry_events.property_id
        AND pm.status = 'active'
        AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Client / anon tracking (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.track_property_entry_event(
  p_property_id uuid,
  p_invite_code text,
  p_source text,
  p_event_type text,
  p_result_kind text DEFAULT NULL,
  p_unit_no text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_membership_status text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tr$
BEGIN
  INSERT INTO public.property_entry_events (
    property_id, user_id, invite_code, source, event_type, result_kind,
    unit_no, role, request_id, membership_status, meta
  ) VALUES (
    p_property_id,
    auth.uid(),
    NULLIF(trim(p_invite_code), ''),
    NULLIF(trim(p_source), ''),
    p_event_type,
    p_result_kind,
    NULLIF(trim(p_unit_no), ''),
    p_role,
    p_request_id,
    p_membership_status,
    COALESCE(p_meta, '{}'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'track_property_entry_event: %', SQLERRM;
END;
$tr$;

REVOKE ALL ON FUNCTION public.track_property_entry_event(
  uuid, text, text, text, text, text, text, uuid, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_property_entry_event(
  uuid, text, text, text, text, text, text, uuid, text, jsonb
) TO anon;
GRANT EXECUTE ON FUNCTION public.track_property_entry_event(
  uuid, text, text, text, text, text, text, uuid, text, jsonb
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) submit_join_request return helper: JSON + submit_finished row (never raises)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._submit_join_unified_response_and_log(
  p_actor uuid,
  p_note text,
  p_ok boolean,
  p_kind text,
  p_message text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_unit_no text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_membership_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wl$
DECLARE
  v_src text;
BEGIN
  BEGIN
    v_src := NULLIF(
      trim(
        substring(coalesce(p_note, '') from 'source=([^|]+)')
      ),
      ''
    );
    INSERT INTO public.property_entry_events (
      property_id, user_id, invite_code, source, event_type, result_kind,
      unit_no, role, request_id, membership_status, meta
    ) VALUES (
      p_property_id,
      p_actor,
      NULLIF(trim(p_invite_code), ''),
      v_src,
      'submit_finished',
      p_kind,
      NULLIF(trim(p_unit_no), ''),
      p_role,
      p_request_id,
      p_membership_status,
      jsonb_build_object(
        'ok', p_ok,
        'message', p_message,
        'note_excerpt', left(coalesce(p_note, ''), 400)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'property_entry_events submit_finished: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'ok', p_ok,
    'kind', p_kind,
    'message', p_message,
    'property_id', p_property_id,
    'request_id', p_request_id,
    'invite_code', p_invite_code,
    'unit_no', p_unit_no,
    'role', p_role,
    'membership_status', p_membership_status
  );
END;
$wl$;

REVOKE ALL ON FUNCTION public._submit_join_unified_response_and_log(
  uuid, text, boolean, text, text, uuid, uuid, text, text, text, text
) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4) Funnel analytics RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_invite_funnel_analytics(
  p_property_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fan$
DECLARE
  v_uid uuid := auth.uid();
  v_invite_count int;
  v_summary jsonb;
  v_top jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT
    (
      (SELECT COUNT(*)::int FROM public.property_invite_codes WHERE property_id = p_property_id)
      + (SELECT COUNT(*)::int FROM public.property_direct_invites WHERE property_id = p_property_id)
      + (SELECT COUNT(*)::int FROM public.property_invites WHERE property_id = p_property_id)
    )
  INTO v_invite_count;

  WITH ev AS (
    SELECT *
    FROM public.property_entry_events
    WHERE property_id = p_property_id
      AND (p_since IS NULL OR created_at >= p_since)
  ),
  agg AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'entry_opened')::bigint AS entry_opened,
      COUNT(*) FILTER (WHERE event_type = 'auth_started')::bigint AS auth_started,
      COUNT(*) FILTER (WHERE event_type = 'auth_succeeded')::bigint AS auth_succeeded,
      COUNT(*) FILTER (WHERE event_type = 'submit_started')::bigint AS submit_started,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'pending_submitted'
      )::bigint AS pending_submitted,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'auto_approved'
      )::bigint AS auto_approved,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'already_member'
      )::bigint AS already_member,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished'
          AND result_kind = ANY (
            ARRAY[
              'invalid_invite'::text,
              'invite_expired'::text,
              'invite_disabled'::text,
              'invite_usage_exceeded'::text
            ]
          )
      )::bigint AS invalid_invite,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'rejected'
      )::bigint AS rejected,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'duplicate_pending'
      )::bigint AS duplicate_pending
    FROM ev
  )
  SELECT jsonb_build_object(
    'invite_count', COALESCE(v_invite_count, 0),
    'entry_opened', COALESCE(a.entry_opened, 0),
    'auth_started', COALESCE(a.auth_started, 0),
    'auth_succeeded', COALESCE(a.auth_succeeded, 0),
    'submit_started', COALESCE(a.submit_started, 0),
    'pending_submitted', COALESCE(a.pending_submitted, 0),
    'auto_approved', COALESCE(a.auto_approved, 0),
    'already_member', COALESCE(a.already_member, 0),
    'invalid_invite', COALESCE(a.invalid_invite, 0),
    'rejected', COALESCE(a.rejected, 0),
    'duplicate_pending', COALESCE(a.duplicate_pending, 0)
  )
  INTO v_summary
  FROM agg a;

  WITH ev AS (
    SELECT *
    FROM public.property_entry_events
    WHERE property_id = p_property_id
      AND (p_since IS NULL OR created_at >= p_since)
      AND invite_code IS NOT NULL
      AND length(trim(invite_code)) > 0
  ),
  by_code AS (
    SELECT
      trim(invite_code) AS code,
      COUNT(*) FILTER (WHERE event_type = 'entry_opened')::bigint AS entry_opened,
      COUNT(*) FILTER (WHERE event_type = 'auth_started')::bigint AS auth_started,
      COUNT(*) FILTER (WHERE event_type = 'auth_succeeded')::bigint AS auth_succeeded,
      COUNT(*) FILTER (WHERE event_type = 'submit_started')::bigint AS submit_started,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'pending_submitted'
      )::bigint AS pending_submitted,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'auto_approved'
      )::bigint AS auto_approved,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'already_member'
      )::bigint AS already_member,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished'
          AND result_kind = ANY (
            ARRAY[
              'invalid_invite'::text,
              'invite_expired'::text,
              'invite_disabled'::text,
              'invite_usage_exceeded'::text
            ]
          )
      )::bigint AS invalid_invite,
      COUNT(*) FILTER (
        WHERE event_type = 'submit_finished' AND result_kind = 'rejected'
      )::bigint AS rejected
    FROM ev
    GROUP BY trim(invite_code)
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'code', b.code,
        'entry_opened', b.entry_opened,
        'auth_started', b.auth_started,
        'auth_succeeded', b.auth_succeeded,
        'submit_started', b.submit_started,
        'pending_submitted', b.pending_submitted,
        'auto_approved', b.auto_approved,
        'already_member', b.already_member,
        'invalid_invite', b.invalid_invite,
        'rejected', b.rejected
      )
      ORDER BY b.entry_opened DESC, b.code ASC
    ),
    '[]'::jsonb
  )
  INTO v_top
  FROM by_code b;

  RETURN jsonb_build_object(
    'ok', true,
    'summary', COALESCE(v_summary, '{}'::jsonb),
    'top_codes', COALESCE(v_top, '[]'::jsonb)
  );
END;
$fan$;

REVOKE ALL ON FUNCTION public.get_invite_funnel_analytics(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_funnel_analytics(uuid, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_invite_funnel_analytics(uuid, timestamptz) IS
  'Funnel counts from property_entry_events for staff.';

-- ---------------------------------------------------------------------------
-- 5) submit_join_request (body continues in same migration file)
-- ---------------------------------------------------------------------------

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
  v_pic_effective_unit text;
  v_pic_effective_role public.user_role;
  v_whitelist_allows_auto boolean;
  v_member_role text;
  v_member_unit text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'auth_required',
      '请先登录后再提交',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  -- ========= A) Directed invite (property_direct_invites) =========
  IF p_direct_invite_id IS NOT NULL THEN
    SELECT * INTO dir
    FROM public.property_direct_invites
    WHERE id = p_direct_invite_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'invalid_invite',
        '邀请无效',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.property_id IS DISTINCT FROM p_property_id THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'invalid_invite',
        '物业与邀请不匹配',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF NOT dir.is_active THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'invite_disabled',
        '邀请无效',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.expires_at IS NOT NULL AND dir.expires_at < now() THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'invite_expired',
        '邀请码已过期',
        NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF dir.max_uses > 0 AND dir.used_count >= dir.max_uses THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'invite_usage_exceeded',
        '该邀请码已达到使用上限',
        NULL, NULL, NULL, NULL, NULL, NULL
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
      SELECT pm.role::text INTO v_member_role
      FROM public.property_members pm
      WHERE pm.property_id = dir.property_id
        AND pm.user_id = v_uid
        AND pm.status = 'active'
      LIMIT 1;
      SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
      FROM public.residents r
      WHERE r.property_id = dir.property_id
        AND r.user_id = v_uid
        AND r.status = 'active'
      LIMIT 1;
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        true,
        'already_member',
        'Already a member',
        dir.property_id,
        NULL,
        NULL,
        v_member_unit,
        v_member_role,
        'active'
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
        AND jr.status = 'pending'::join_request_status
        AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
    ) THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'duplicate_pending',
        'You already have a pending request for this property.',
        dir.property_id,
        NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.user_id = v_uid
        AND jr.status = 'pending'::join_request_status
    ) THEN
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        false,
        'duplicate_pending',
        'You already have a pending request for this property.',
        dir.property_id,
        NULL, NULL, NULL, NULL, NULL
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

        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          true,
          'auto_approved',
          'Joined successfully',
          dir.property_id,
          NULL,
          NULL,
          NULLIF(trim(v_unit), ''),
          v_role::text,
          'active'
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

    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      true,
      'pending_submitted',
      'Request submitted',
      dir.property_id,
      v_join_id,
      NULL,
      NULLIF(trim(v_unit), ''),
      v_role::text,
      NULL
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

        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_expired',
          '邀请码已过期',
          NULL, NULL, NULL, NULL, NULL, NULL
        );
      END IF;

      IF inv.status <> 'active' THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_disabled',
          '邀请无效',
          NULL, NULL, NULL, NULL, NULL, NULL
        );
      END IF;

      IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_usage_exceeded',
          '该邀请码已达到使用上限',
          NULL, NULL, NULL, NULL, NULL, NULL
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
        SELECT pm.role::text INTO v_member_role
        FROM public.property_members pm
        WHERE pm.property_id = inv.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
        LIMIT 1;
        SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
        FROM public.residents r
        WHERE r.property_id = inv.property_id
          AND r.user_id = v_uid
          AND r.status = 'active'
        LIMIT 1;
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          true,
          'already_member',
          'Already a member',
          inv.property_id,
          NULL,
          c,
          v_member_unit,
          v_member_role,
          'active'
        );
      END IF;

      v_email_norm := lower(trim(coalesce(vprof.email, '')));

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          inv.property_id,
          NULL, c, NULL, NULL, NULL
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          inv.property_id,
          NULL, c, NULL, NULL, NULL
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
      )
      RETURNING id INTO v_join_id;

      UPDATE public.property_invites
      SET used_count = used_count + 1
      WHERE id = inv.id;

      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        true,
        'pending_submitted',
        'Request submitted',
        inv.property_id,
        v_join_id,
        c,
        NULL,
        inv.role::text,
        NULL
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
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_disabled',
          '邀请无效',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_expired',
          '邀请码已过期',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invite_usage_exceeded',
          '该邀请码已达到使用上限',
          NULL, NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF pic.property_id IS DISTINCT FROM p_property_id THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'invalid_invite',
          '物业与邀请码不匹配',
          NULL, NULL, pic.code, NULL, NULL, NULL
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
        SELECT pm.role::text INTO v_member_role
        FROM public.property_members pm
        WHERE pm.property_id = pic.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
        LIMIT 1;
        SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
        FROM public.residents r
        WHERE r.property_id = pic.property_id
          AND r.user_id = v_uid
          AND r.status = 'active'
        LIMIT 1;
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          true,
          'already_member',
          'Already a member',
          pic.property_id,
          NULL,
          pic.code,
          v_member_unit,
          v_member_role,
          'active'
        );
      END IF;

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          pic.property_id,
          NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
          false,
          'duplicate_pending',
          'You already have a pending request for this property.',
          pic.property_id,
          NULL, pic.code, NULL, NULL, NULL
        );
      END IF;

      v_pic_effective_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(pic.unit_no), ''));

      v_pic_effective_role := p_requested_role;
      IF pic.role IS NOT NULL AND length(trim(pic.role)) > 0 THEN
        BEGIN
          v_pic_effective_role := trim(pic.role)::public.user_role;
        EXCEPTION
          WHEN invalid_text_representation THEN
            v_pic_effective_role := p_requested_role;
        END;
      END IF;

      v_inf_role := NULLIF(trim(p_inferred_role), '');
      v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

      IF v_pic_effective_role = 'owner'::public.user_role
        AND NULLIF(trim(v_pic_effective_unit), '') IS NOT NULL
        AND length(trim(coalesce(v_name, ''))) > 0
        AND length(v_email_norm) > 0
      THEN
        v_whitelist_allows_auto := public._unit_whitelist_allows_auto(pic.property_id, trim(v_pic_effective_unit));
        IF v_whitelist_allows_auto THEN
          v_auto := public._try_owner_whitelist_auto_join(
            v_uid,
            pic.property_id,
            trim(v_pic_effective_unit),
            p_move_in_date,
            p_language_pref,
            v_name,
            v_email,
            v_phone
          );
        ELSE
          v_auto := NULL;
        END IF;
        IF (v_auto ->> 'auto_ok') = 'true' THEN
          UPDATE public.property_members pm
          SET
            join_invite_code = pic.code,
            join_entry_source = COALESCE(NULLIF(trim(p_note), ''), 'invite_auto')
          WHERE pm.property_id = pic.property_id
            AND pm.user_id = v_uid;
          UPDATE public.property_invite_codes
          SET used_count = used_count + 1
          WHERE id = pic.id;

          IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
            UPDATE public.property_invite_codes
            SET is_active = false
            WHERE id = pic.id;
          END IF;

          RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
            true,
            'auto_approved',
            'Joined successfully',
            pic.property_id,
            NULL,
            pic.code,
            NULLIF(trim(v_pic_effective_unit), ''),
            v_pic_effective_role::text,
            'active'
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
        v_pic_effective_role,
        v_name,
        v_email,
        v_phone,
        NULLIF(trim(v_pic_effective_unit), ''),
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

      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        true,
        'pending_submitted',
        'Request submitted',
        pic.property_id,
        v_join_id,
        pic.code,
        NULLIF(trim(v_pic_effective_unit), ''),
        v_pic_effective_role::text,
        NULL
      );
    END IF;

    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'invalid_invite',
      '邀请无效',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  -- ========= D) Public open join by property =========
  IF p_property_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
  ) THEN
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'property_not_found',
      '物业不存在或无效',
      NULL, NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.allow_public_join_requests = true
  ) THEN
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'rejected',
      '该物业当前不接受公开申请',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
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
    SELECT pm.role::text INTO v_member_role
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'
    LIMIT 1;
    SELECT NULLIF(trim(r.unit_no), '') INTO v_member_unit
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_uid
      AND r.status = 'active'
    LIMIT 1;
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      true,
      'already_member',
      'Already a member',
      p_property_id,
      NULL,
      NULL,
      v_member_unit,
      v_member_role,
      'active'
    );
  END IF;

  IF v_email_norm <> '' AND EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.status = 'pending'::join_request_status
      AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
  ) THEN
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'duplicate_pending',
      'You already have a pending request for this property.',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.user_id = v_uid
      AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
      false,
      'duplicate_pending',
      'You already have a pending request for this property.',
      p_property_id,
      NULL, NULL, NULL, NULL, NULL
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
    v_whitelist_allows_auto := public._unit_whitelist_allows_auto(p_property_id, trim(p_unit_number));
    IF v_whitelist_allows_auto THEN
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
    ELSE
      v_auto := NULL;
    END IF;
    IF (v_auto ->> 'auto_ok') = 'true' THEN
      UPDATE public.property_members pm
      SET
        join_invite_code = NULL,
        join_entry_source = COALESCE(NULLIF(trim(p_note), ''), 'public_join')
      WHERE pm.property_id = p_property_id
        AND pm.user_id = v_uid;
      RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
        true,
        'auto_approved',
        'Joined successfully',
        p_property_id,
        NULL,
        NULL,
        NULLIF(trim(p_unit_number), ''),
        p_requested_role::text,
        'active'
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

  RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
    true,
    'pending_submitted',
    'Request submitted',
    p_property_id,
    v_join_id,
    NULL,
    NULLIF(trim(p_unit_number), ''),
    p_requested_role::text,
    NULL
  );
EXCEPTION WHEN OTHERS THEN
  RETURN public._submit_join_unified_response_and_log(v_uid, p_note, 
    false,
    'rpc_error',
    SQLERRM,
    NULL, NULL, NULL, NULL, NULL, NULL
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
  'Unified join + funnel submit_finished events.';

NOTIFY pgrst, 'reload schema';
