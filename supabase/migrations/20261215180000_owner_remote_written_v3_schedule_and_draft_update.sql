-- 1) Owner SGM create: first public notice at scheduled_at = now()+24h (not immediate).
-- 2) Owner draft update RPC for meetings row (bypasses staff-only UPDATE RLS) with strict guards.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_owner_remote_written_v3_sgm(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_total_units integer := 0;
  v_required_units integer := 0;
  v_scheduled timestamptz := now() + interval '24 hours';
  v_end timestamptz := v_scheduled + interval '14 days';
  v_t0_iso text;
  v_t14_iso text;
  v_written text;
  v_gov text;
  v_desc_zh text;
  v_meeting_id uuid;
  v_fy integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = uid
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND lower(trim(both FROM coalesce(pm.role::text, ''))) = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner');
  END IF;

  SELECT COUNT(DISTINCT lower(trim(both FROM coalesce(pm.unit_no::text, ''))))::integer
  INTO v_total_units
  FROM public.property_members pm
  WHERE pm.property_id = p_property_id
    AND pm.status = 'active'
    AND trim(both FROM coalesce(pm.unit_no::text, '')) <> '';

  IF v_total_units IS NULL OR v_total_units < 0 THEN
    v_total_units := 0;
  END IF;

  IF v_total_units <= 0 THEN
    v_required_units := 0;
  ELSE
    v_required_units := CEIL(v_total_units * 20.0 / 100.0)::integer;
  END IF;

  v_t0_iso := trim(both '"' FROM to_json(v_scheduled)::text);
  v_t14_iso := trim(both '"' FROM to_json(v_end)::text);

  v_written :=
    '<!--clearstrata-written-remote' || E'\n' ||
    jsonb_pretty(
      jsonb_build_object(
        'v', 3,
        'mode', 'remote_written',
        'participation_open_at', v_t0_iso,
        'participation_close_at', v_t14_iso,
        'public_notice_open_at', v_t0_iso,
        'public_notice_close_at', v_t14_iso,
        'nomination_open_at', v_t0_iso,
        'nomination_close_at', v_t14_iso,
        'voting_open_at', v_t0_iso,
        'voting_close_at', v_t14_iso
      )
    ) || E'\n-->';

  v_gov :=
    '<!--clearstrata-meeting-governance' || E'\n' ||
    jsonb_pretty(
      jsonb_build_object(
        'v', 1,
        'initiation_type', 'owner_requisitioned',
        'total_voting_units', v_total_units,
        'required_percent', 20,
        'required_units', v_required_units,
        'signed_units', 0
      )
    ) || E'\n-->';

  v_desc_zh := v_written || E'\n\n' || v_gov;

  v_fy := EXTRACT(YEAR FROM v_scheduled)::integer;

  INSERT INTO public.meetings (
    property_id,
    meeting_type,
    meeting_format,
    status,
    fiscal_year,
    title_zh,
    title_en,
    description_zh,
    scheduled_at,
    voting_open_at,
    voting_close_at,
    created_by
  )
  VALUES (
    p_property_id,
    'sgm',
    'hybrid',
    'draft',
    v_fy,
    '远程书面业主联署 SGM',
    'Owner Requisitioned Remote Written SGM',
    v_desc_zh,
    v_scheduled,
    v_scheduled,
    v_end,
    uid
  )
  RETURNING id INTO v_meeting_id;

  RETURN jsonb_build_object('ok', true, 'meeting_id', v_meeting_id);
END;
$$;

COMMENT ON FUNCTION public.create_owner_remote_written_v3_sgm(uuid) IS
  'Active owner-only: draft hybrid SGM; remote-written v3 windows from scheduled_at (default now+24h) through +14d.';

CREATE OR REPLACE FUNCTION public.update_owner_remote_written_v3_sgm_draft(
  p_meeting_id uuid,
  p_title_zh text,
  p_title_en text,
  p_description_zh text,
  p_description_en text,
  p_scheduled_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m record;
  v_end timestamptz;
  v_t0_iso text;
  v_t14_iso text;
  v_written text;
  v_user text;
  v_stripped_wr text;
  v_gov text;
  v_gov_match text[];
  v_desc_final text;
  v_compact text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  SELECT
    id,
    created_by,
    status,
    scheduled_at,
    description_zh
  INTO m
  FROM public.meetings
  WHERE id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF m.created_by IS DISTINCT FROM uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_creator');
  END IF;

  IF NOT public.is_remote_written_v3_meeting(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_v3');
  END IF;

  IF lower(trim(both FROM coalesce(m.status, ''))) IS DISTINCT FROM 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_draft');
  END IF;

  IF m.scheduled_at IS NOT NULL AND now() >= m.scheduled_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'schedule_locked');
  END IF;

  IF p_scheduled_at IS NULL OR p_scheduled_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_scheduled');
  END IF;

  v_compact := regexp_replace(coalesce(m.description_zh, ''), '\s+', '', 'g');
  IF v_compact NOT LIKE '%"initiation_type":"owner_requisitioned"%' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_requisitioned');
  END IF;

  v_stripped_wr := regexp_replace(coalesce(p_description_zh, ''), '<!--clearstrata-written-remote[\s\S]*?-->', '', 'g');
  v_user := trim(both FROM regexp_replace(v_stripped_wr, '<!--clearstrata-meeting-governance[\s\S]*?-->', '', 'g'));

  v_gov_match := regexp_match(coalesce(p_description_zh, ''), '<!--clearstrata-meeting-governance[\s\S]*?-->');
  v_gov := CASE WHEN v_gov_match IS NOT NULL THEN v_gov_match[1] ELSE NULL END;
  IF v_gov IS NULL OR length(trim(both FROM v_gov)) = 0 THEN
    v_gov_match := regexp_match(coalesce(m.description_zh, ''), '<!--clearstrata-meeting-governance[\s\S]*?-->');
    v_gov := CASE WHEN v_gov_match IS NOT NULL THEN v_gov_match[1] ELSE NULL END;
  END IF;
  IF v_gov IS NULL OR length(trim(both FROM v_gov)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'governance_missing');
  END IF;

  v_end := p_scheduled_at + interval '14 days';
  v_t0_iso := trim(both '"' FROM to_json(p_scheduled_at)::text);
  v_t14_iso := trim(both '"' FROM to_json(v_end)::text);

  v_written :=
    '<!--clearstrata-written-remote' || E'\n' ||
    jsonb_pretty(
      jsonb_build_object(
        'v', 3,
        'mode', 'remote_written',
        'participation_open_at', v_t0_iso,
        'participation_close_at', v_t14_iso,
        'public_notice_open_at', v_t0_iso,
        'public_notice_close_at', v_t14_iso,
        'nomination_open_at', v_t0_iso,
        'nomination_close_at', v_t14_iso,
        'voting_open_at', v_t0_iso,
        'voting_close_at', v_t14_iso
      )
    ) || E'\n-->';

  IF v_user IS NULL OR v_user = '' THEN
    v_desc_final := v_written || E'\n\n' || v_gov;
  ELSE
    v_desc_final := v_user || E'\n\n' || v_written || E'\n\n' || v_gov;
  END IF;

  UPDATE public.meetings mt
  SET
    title_zh = nullif(trim(both FROM coalesce(p_title_zh, '')), ''),
    title_en = nullif(trim(both FROM coalesce(p_title_en, '')), ''),
    description_zh = v_desc_final,
    description_en = nullif(trim(both FROM coalesce(p_description_en, '')), ''),
    scheduled_at = p_scheduled_at,
    voting_open_at = p_scheduled_at,
    voting_close_at = v_end
  WHERE mt.id = p_meeting_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.update_owner_remote_written_v3_sgm_draft(uuid, text, text, text, text, timestamptz) IS
  'Meeting creator only: update draft owner-requisitioned remote-written v3 SGM titles/descriptions/schedule; rewrites v3 meta windows from new scheduled_at.';

REVOKE ALL ON FUNCTION public.update_owner_remote_written_v3_sgm_draft(uuid, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_owner_remote_written_v3_sgm_draft(uuid, text, text, text, text, timestamptz) TO authenticated;

COMMIT;
