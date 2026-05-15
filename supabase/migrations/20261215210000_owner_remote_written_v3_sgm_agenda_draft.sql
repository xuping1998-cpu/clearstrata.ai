-- Owner-created remote-written v3 owner-requisitioned SGM draft: agenda save bypasses staff-only meeting_agenda_items RLS.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_owner_remote_written_v3_sgm_agenda_drafts(
  p_meeting_id uuid,
  p_agendas jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m record;
  v_payload_ids uuid[] := ARRAY[]::uuid[];
  v_prot_ids uuid[] := ARRAY[]::uuid[];
  elem jsonb;
  v_ord int := 0;
  v_sid uuid;
  v_title_zh text;
  v_title_en text;
  v_desc_zh text;
  v_desc_en text;
  v_req boolean;
  v_rule text;
  v_len int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF p_agendas IS NULL OR jsonb_typeof(p_agendas) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_payload');
  END IF;

  SELECT id, property_id, created_by, status, scheduled_at, description_zh
  INTO m
  FROM public.meetings
  WHERE id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF m.created_by IS DISTINCT FROM uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_creator');
  END IF;

  IF NOT public.is_remote_written_v3_meeting(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_v3');
  END IF;

  IF lower(trim(both FROM coalesce(m.status, ''))) IS DISTINCT FROM 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_draft');
  END IF;

  IF m.scheduled_at IS NULL OR now() >= m.scheduled_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'schedule_locked');
  END IF;

  IF coalesce(m.description_zh, '') NOT LIKE '%owner_requisitioned%' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_requisitioned');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = uid
      AND pm.property_id = m.property_id
      AND pm.status = 'active'
      AND lower(trim(both FROM coalesce(pm.role::text, ''))) = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_property_owner');
  END IF;

  SELECT coalesce(array_agg(DISTINCT sub.id), ARRAY[]::uuid[])
  INTO v_payload_ids
  FROM (
    SELECT (elem_inner->>'id')::uuid AS id
    FROM jsonb_array_elements(p_agendas) AS elem_inner
    WHERE nullif(trim(both FROM coalesce(elem_inner->>'id', '')), '') IS NOT NULL
      AND (elem_inner->>'id')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) sub
  JOIN public.meeting_agenda_items mai ON mai.id = sub.id AND mai.meeting_id = p_meeting_id;

  SELECT coalesce(array_agg(DISTINCT x.id), ARRAY[]::uuid[])
  INTO v_prot_ids
  FROM (
    SELECT v.agenda_item_id AS id
    FROM public.meeting_votes v
    WHERE v.meeting_id = p_meeting_id
      AND v.agenda_item_id IS NOT NULL
    UNION
    SELECT mai.id
    FROM public.meeting_agenda_items mai
    WHERE mai.meeting_id = p_meeting_id
      AND coalesce(mai.description_zh, '') LIKE '%<!--clearstrata-election-agenda%'
  ) x;

  DELETE FROM public.meeting_agenda_items mai
  WHERE mai.meeting_id = p_meeting_id
    AND mai.property_id = m.property_id
    AND mai.id <> ALL (v_prot_ids)
    AND mai.id <> ALL (v_payload_ids);

  v_len := coalesce(jsonb_array_length(p_agendas), 0);

  FOR elem IN SELECT value FROM jsonb_array_elements(p_agendas)
  LOOP
    v_ord := v_ord + 1;

    v_title_zh := nullif(trim(both FROM coalesce(elem->>'title_zh', '')), '');
    v_title_en := nullif(trim(both FROM coalesce(elem->>'title_en', '')), '');
    v_desc_zh := nullif(trim(both FROM coalesce(elem->>'description_zh', '')), '');
    v_desc_en := nullif(trim(both FROM coalesce(elem->>'description_en', '')), '');

    v_req := coalesce((elem->>'requires_vote')::boolean, false);
    v_rule := nullif(trim(both FROM coalesce(elem->>'vote_rule', '')), '');

    IF v_req THEN
      IF v_rule IS NULL OR v_rule NOT IN ('simple_majority', 'three_quarter', 'unanimous') THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_vote_rule');
      END IF;
    ELSE
      v_rule := NULL;
    END IF;

    v_sid := NULL;
    IF nullif(trim(both FROM coalesce(elem->>'id', '')), '') IS NOT NULL
       AND (elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      v_sid := (elem->>'id')::uuid;
    END IF;

    IF v_sid IS NOT NULL THEN
      IF EXISTS (
        SELECT 1
        FROM public.meeting_agenda_items mai
        WHERE mai.id = v_sid
          AND mai.meeting_id = p_meeting_id
          AND mai.property_id = m.property_id
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM public.meeting_agenda_items mai
          WHERE mai.id = v_sid
            AND coalesce(mai.description_zh, '') LIKE '%<!--clearstrata-election-agenda%'
        ) THEN
          CONTINUE;
        END IF;
        IF EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.agenda_item_id = v_sid) THEN
          CONTINUE;
        END IF;

        UPDATE public.meeting_agenda_items mai
        SET
          item_number = v_ord,
          sort_order = v_ord,
          title_zh = v_title_zh,
          title_en = v_title_en,
          description_zh = v_desc_zh,
          description_en = v_desc_en,
          requires_vote = v_req,
          vote_rule = v_rule,
          updated_at = now()
        WHERE mai.id = v_sid
          AND mai.meeting_id = p_meeting_id
          AND mai.property_id = m.property_id;

        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.meeting_agenda_items (
      meeting_id,
      property_id,
      item_number,
      sort_order,
      title_en,
      title_zh,
      description_en,
      description_zh,
      requires_vote,
      vote_rule
    )
    VALUES (
      p_meeting_id,
      m.property_id,
      v_ord,
      v_ord,
      v_title_en,
      v_title_zh,
      v_desc_en,
      v_desc_zh,
      v_req,
      v_rule
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', v_len);
END;
$$;

COMMENT ON FUNCTION public.save_owner_remote_written_v3_sgm_agenda_drafts(uuid, jsonb) IS
  'Meeting creator (active owner): replace non-protected agenda drafts for draft owner-requisitioned remote-written v3 SGM before scheduled_at.';

REVOKE ALL ON FUNCTION public.save_owner_remote_written_v3_sgm_agenda_drafts(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_owner_remote_written_v3_sgm_agenda_drafts(uuid, jsonb) TO authenticated;

COMMIT;
