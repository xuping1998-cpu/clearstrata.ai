-- 扫码入楼审计：property_entry_events + enter_property_by_public_invite_v2 内写日志

-- ---------------------------------------------------------------------------
-- 1) 表
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.property_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  display_name text,
  unit_no text,
  invite_code text,
  event_type text NOT NULL,
  result_status text,
  review_flag text,
  whitelist_matched boolean,
  unit_occupied boolean,
  join_request_id uuid,
  member_id uuid,
  actor_user_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_created
  ON public.property_entry_events (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_unit
  ON public.property_entry_events (property_id, unit_no);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_email
  ON public.property_entry_events (property_id, email);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_type
  ON public.property_entry_events (property_id, event_type);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_result
  ON public.property_entry_events (property_id, result_status);

CREATE INDEX IF NOT EXISTS idx_property_entry_events_prop_flag
  ON public.property_entry_events (property_id, review_flag);

ALTER TABLE public.property_entry_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.property_entry_events IS
  'Immutable audit for public /entry; inserts via SECURITY DEFINER only.';

-- 物业职员可读；普通 owner 不可
DROP POLICY IF EXISTS "property_entry_events_staff_read" ON public.property_entry_events;
CREATE POLICY "property_entry_events_staff_read"
  ON public.property_entry_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = property_entry_events.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role = ANY (ARRAY['council'::public.user_role, 'admin'::public.user_role, 'manager'::public.user_role, 'property_admin'::public.user_role])
    )
  );

-- 不授予 authenticated 对表本身的 INSERT/UPDATE/DELETE
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.property_entry_events
  FROM public;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.property_entry_events
  FROM authenticated;

GRANT SELECT ON public.property_entry_events TO authenticated;
GRANT ALL ON public.property_entry_events TO service_role;

-- ---------------------------------------------------------------------------
-- 2) 内部写入（失败不阻断主流程）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._property_entry_event_silent(
  p_property_id uuid,
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_unit_no text,
  p_invite_code text,
  p_event_type text,
  p_result_status text,
  p_review_flag text,
  p_whitelist_matched boolean,
  p_unit_occupied boolean,
  p_join_request_id uuid,
  p_member_id uuid,
  p_actor_user_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_metadata jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $lg$
BEGIN
  INSERT INTO public.property_entry_events (
    property_id, user_id, email, display_name, unit_no, invite_code,
    event_type, result_status, review_flag, whitelist_matched, unit_occupied,
    join_request_id, member_id, actor_user_id, ip_address, user_agent, metadata
  ) VALUES (
    p_property_id, p_user_id, p_email, p_display_name, p_unit_no, p_invite_code,
    p_event_type, p_result_status, p_review_flag, p_whitelist_matched, p_unit_occupied,
    p_join_request_id, p_member_id, p_actor_user_id, p_ip_address, p_user_agent, coalesce(p_metadata, '{}'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'property_entry_events insert failed: %', SQLERRM;
END;
$lg$;

REVOKE ALL ON FUNCTION public._property_entry_event_silent(
  uuid, uuid, text, text, text, text, text, text, text, boolean, boolean, uuid, uuid, uuid, text, text, jsonb
) FROM PUBLIC;

-- 客户端只记打开链接 / 可选补充（不含准入判断）
CREATE OR REPLACE FUNCTION public.log_property_entry_client_event(
  p_property_id uuid,
  p_event_type text,
  p_invite_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cl$
DECLARE
  v_type text := lower(trim(coalesce(p_event_type, '')));
BEGIN
  IF p_property_id IS NULL THEN
    RAISE EXCEPTION 'log_property_entry_client_event: missing property_id' USING ERRCODE = '22000';
  END IF;
  IF v_type IS NULL OR v_type = '' OR v_type NOT IN ('entry_opened', 'entry_form_submitted') THEN
    RAISE EXCEPTION 'log_property_entry_client_event: invalid event_type' USING ERRCODE = '22000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id) THEN
    RAISE EXCEPTION 'log_property_entry_client_event: property not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public._property_entry_event_silent(
    p_property_id, auth.uid(), null, null, null, nullif(trim(coalesce(p_invite_code, '')), ''), v_type,
    CASE WHEN v_type = 'entry_opened' THEN 'success' ELSE 'pending' END, null, null, null, null, null, null, null, null, null, null,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('client', true)
  );
END;
$cl$;

REVOKE ALL ON FUNCTION public.log_property_entry_client_event(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_property_entry_client_event(uuid, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.log_property_entry_client_event(uuid, text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) enter_property_by_public_invite_v2（原逻辑 + 每分支审计）
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.enter_property_by_public_invite_v2(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.enter_property_by_public_invite_v2(
  p_property_id uuid,
  p_invite_code text,
  p_full_name text,
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
  v_pic_id uuid;
  v_pic_is_active boolean;
  v_pic_max_uses int;
  v_pic_used_count int;
  v_pic_expires_at timestamptz;
  v_unit_no text := NULLIF(trim(both from coalesce(p_unit_no, '')), '');
  v_name text := NULLIF(trim(both from coalesce(p_full_name, '')), '');
  v_email_in text := NULLIF(trim(both from coalesce(p_email, '')), '');
  v_lang text;
  v_code text := NULLIF(trim(both from coalesce(p_invite_code, '')), '');
  v_in_wl boolean := false;
  v_occupied boolean := false;
  v_bind jsonb;
  v_pending_id uuid;
  v_prof public.profiles%ROWTYPE;
  v_prop text;
  v_jr_id uuid;
  v_mem_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'auth_required');
  END IF;

  IF p_property_id IS NULL OR v_code = '' OR v_unit_no = '' OR v_name = '' OR v_email_in = '' THEN
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code,
      'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'invalid_arguments', 'raw_unit', coalesce(p_unit_no, ''), 'source', 'enter_v2')
    );
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_arguments', 'message', 'Missing name, email, unit, or invite code.');
  END IF;

  v_lang := CASE
    WHEN lower(trim(coalesce(p_language_pref, ''))) = 'zh' THEN 'zh'
    ELSE 'en'
  END;

  /* 房号归属以 residents 为准；property_members 仅作成员/角色（见 v_mem_id 查询） */
  IF EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(v_unit_no)
      AND r.user_id = v_uid
      AND r.status = 'active'
  ) THEN
    SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
    v_prop := coalesce(v_prop, '');
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'already_member', 'success', 'already_member',
      null, null, null, null, null, null, null, null,
      jsonb_build_object('source', 'enter_v2', 'property_name', v_prop, 'unit_no', v_unit_no)
    );
    RETURN jsonb_build_object('ok', true, 'status', 'already_member', 'property_id', p_property_id);
  END IF;

  SELECT
    c.id, c.is_active, c.max_uses, c.used_count, c.expires_at
  INTO
    v_pic_id, v_pic_is_active, v_pic_max_uses, v_pic_used_count, v_pic_expires_at
  FROM public.property_invite_codes c
  WHERE c.property_id = p_property_id
    AND upper(trim(c.code)) = upper(v_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'code_not_found', 'property_name', v_prop, 'source', 'enter_v2')
    );
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite');
  END IF;

  IF NOT v_pic_is_active THEN
    SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'invite_inactive', 'property_name', v_prop, 'source', 'enter_v2')
    );
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_inactive');
  END IF;

  IF v_pic_max_uses > 0 AND v_pic_used_count >= v_pic_max_uses THEN
    SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'invite_exhausted', 'used_count', v_pic_used_count, 'max_uses', v_pic_max_uses, 'source', 'enter_v2')
    );
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_exhausted');
  END IF;

  IF v_pic_expires_at IS NOT NULL AND v_pic_expires_at < now() THEN
    SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'invite_expired', 'expires_at', v_pic_expires_at, 'source', 'enter_v2')
    );
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'invite_expired');
  END IF;

  SELECT name INTO v_prop FROM public.properties p WHERE p.id = p_property_id;
  v_prop := coalesce(v_prop, '');

  v_in_wl := EXISTS (
    SELECT 1
    FROM public.unit_whitelist uw
    WHERE uw.property_id = p_property_id
      AND lower(trim(uw.unit_no)) = lower(v_unit_no)
      AND uw.is_active = true
  );

  v_occupied := EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.property_id = p_property_id
      AND lower(trim(r.unit_no)) = lower(v_unit_no)
      AND r.user_id IS NOT NULL
      AND r.user_id IS DISTINCT FROM v_uid
  );

  PERFORM public._property_entry_event_silent(
    p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'entry_form_submitted', 'pending', null,
    v_in_wl, v_occupied, null, null, null, null, null,
    jsonb_build_object(
      'source', 'enter_v2',
      'property_name', v_prop,
      'normalized_unit_no', v_unit_no,
      'raw_unit_no', coalesce(p_unit_no, ''),
      'in_whitelist', v_in_wl,
      'unit_occupied_check', v_occupied
    )
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
        unit_no = v_unit_no,
        invite_code = v_code,
        source = 'public_invite_v2',
        review_flag = 'not_in_whitelist',
        review_reason = 'Unit is not in whitelist',
        whitelist_matched = false,
        unit_occupied = v_occupied,
        note = 'public_invite_v2|resubmit',
        updated_at = now()
      WHERE id = v_pending_id;
      PERFORM public._property_entry_event_silent(
        p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'duplicate_pending', 'pending', 'duplicate_pending',
        false, v_occupied, v_pending_id, null, null, null, null, null,
        jsonb_build_object('source', 'enter_v2', 'resubmit', 'not_in_whitelist', 'property_name', v_prop, 'not_in_wl', true, 'sub_review_flag', 'not_in_whitelist')
      );
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
        unit_no = v_unit_no,
        invite_code = v_code,
        source = 'public_invite_v2',
        review_flag = 'unit_occupied',
        review_reason = 'Unit is already occupied',
        whitelist_matched = true,
        unit_occupied = true,
        updated_at = now()
      WHERE id = v_pending_id;
      PERFORM public._property_entry_event_silent(
        p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'duplicate_pending', 'pending', 'duplicate_pending',
        true, true, v_pending_id, null, null, null, null, null,
        jsonb_build_object('source', 'enter_v2', 'resubmit', 'unit_occupied', 'property_name', v_prop, 'sub_review_flag', 'unit_occupied')
      );
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
    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'invalid', 'invalid_invite', null, null, null, null, null, null, null, null,
      jsonb_build_object('reason', 'profile_missing', 'source', 'enter_v2')
    );
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
    v_bind := public.bind_resident_by_unit(p_property_id, v_unit_no, NULL::date, v_lang);

    IF (coalesce(v_bind ->> 'ok', '') = 'true' OR coalesce((v_bind ->> 'idempotent')::boolean, false) = true) THEN
      UPDATE public.property_invite_codes c
      SET
        used_count = c.used_count + 1,
        is_active = CASE
          WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
          ELSE c.is_active
        END
      WHERE c.id = v_pic_id;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
        invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
      ) VALUES (
        p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit_no,
        'public_invite_v2|auto_approved',
        'approved'::public.join_request_status, v_code, 'auto_approved', NULL, true, false, 'entry'
      )
      RETURNING id INTO v_jr_id;

      SELECT id INTO v_mem_id
      FROM public.property_members
      WHERE property_id = p_property_id AND user_id = v_uid
      LIMIT 1;

      PERFORM public._property_entry_event_silent(
        p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'auto_approved', 'success', 'auto_approved',
        true, false, v_jr_id, v_mem_id, null, null, null,
        jsonb_build_object('source', 'enter_v2', 'property_name', v_prop, 'bind', v_bind)
      );
      RETURN jsonb_build_object('ok', true, 'status', 'auto_approved', 'property_id', p_property_id, 'unit_no', v_unit_no);
    END IF;

    IF (v_bind ->> 'error') = 'unit_not_found' THEN
      INSERT INTO public.residents (
        property_id, user_id, unit_no, name_en, name_zh, email, phone, move_in_date, language_pref,
        role, status, strata_fee_status
      )
      VALUES (
        p_property_id,
        v_uid,
        v_unit_no,
        coalesce(NULLIF(trim(p_full_name), ''), NULLIF(trim(p_email), ''), 'Resident'),
        coalesce(NULLIF(trim(p_full_name), ''), NULLIF(trim(p_email), ''), '业主'),
        v_email_in,
        coalesce(v_prof.phone, ''),
        NULL,
        v_lang, 'owner', 'active'::member_status, 'current'
      );

      UPDATE public.profiles prof SET status = 'active', updated_at = now() WHERE prof.id = v_uid;

      UPDATE public.property_invite_codes c
      SET
        used_count = c.used_count + 1,
        is_active = CASE
          WHEN c.max_uses > 0 AND (c.used_count + 1) >= c.max_uses THEN false
          ELSE c.is_active
        END
      WHERE c.id = v_pic_id;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
        invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
      ) VALUES (
        p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit_no,
        'public_invite_v2|auto_approved_new_resident',
        'approved'::public.join_request_status, v_code, 'auto_approved', NULL, true, false, 'entry'
      )
      RETURNING id INTO v_jr_id;

      SELECT id INTO v_mem_id
      FROM public.property_members
      WHERE property_id = p_property_id AND user_id = v_uid
      LIMIT 1;

      PERFORM public._property_entry_event_silent(
        p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'auto_approved', 'success', 'auto_approved',
        true, false, v_jr_id, v_mem_id, null, null, null,
        jsonb_build_object('source', 'enter_v2', 'property_name', v_prop, 'new_resident', true)
      );
      RETURN jsonb_build_object('ok', true, 'status', 'auto_approved', 'property_id', p_property_id, 'unit_no', v_unit_no);
    END IF;

    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'error', 'invalid_invite', true, v_occupied, null, v_mem_id, null, null, null, null,
      jsonb_build_object('reason', 'bind_failed', 'source', 'enter_v2', 'property_name', v_prop, 'bind', v_bind)
    );
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
    WHERE c.id = v_pic_id;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
      invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
    ) VALUES (
      p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit_no,
      'public_invite_v2|not_in_whitelist',
      'pending'::public.join_request_status, v_code, 'not_in_whitelist',
      'Unit is not in whitelist', false, false, 'entry'
    )
    RETURNING id INTO v_jr_id;

    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'pending_review', 'pending', 'not_in_whitelist',
      false, false, v_jr_id, null, null, null, null, null,
      jsonb_build_object('source', 'enter_v2', 'property_name', v_prop, 'not_in_wl', true, 'sub_review_flag', 'not_in_whitelist')
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
    WHERE c.id = v_pic_id;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status,
      invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source
    ) VALUES (
      p_property_id, v_uid, 'owner'::public.user_role, v_name, v_email_in, NULL, v_unit_no,
      'public_invite_v2|unit_occupied',
      'pending'::public.join_request_status, v_code, 'unit_occupied',
      'Unit is already occupied', true, true, 'entry'
    )
    RETURNING id INTO v_jr_id;

    PERFORM public._property_entry_event_silent(
      p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'pending_review', 'pending', 'unit_occupied',
      true, true, v_jr_id, null, null, null, null, null,
      jsonb_build_object('source', 'enter_v2', 'property_name', v_prop, 'unit_occupied', true, 'sub_review_flag', 'unit_occupied')
    );
    RETURN jsonb_build_object('ok', true, 'status', 'pending_review', 'review_flag', 'unit_occupied');
  END IF;

  PERFORM public._property_entry_event_silent(
    p_property_id, v_uid, v_email_in, v_name, v_unit_no, v_code, 'invite_invalid', 'error', 'invalid_invite', v_in_wl, v_occupied, null, v_mem_id, null, null, null, null,
    jsonb_build_object('reason', 'unexpected_branch', 'source', 'enter_v2', 'property_name', v_prop, 'v_in_wl', v_in_wl, 'v_occupied', v_occupied)
  );
  RETURN jsonb_build_object('ok', false, 'status', 'invalid_invite', 'message', 'unexpected_branch');
END;
$fn$;

COMMENT ON FUNCTION public.enter_property_by_public_invite_v2 IS
  'Whitelist + occupancy for /entry public code; definer bypasses RLS.';

REVOKE ALL ON FUNCTION public.enter_property_by_public_invite_v2 FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enter_property_by_public_invite_v2 FROM anon;
GRANT EXECUTE ON FUNCTION public.enter_property_by_public_invite_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.enter_property_by_public_invite_v2 TO service_role;
