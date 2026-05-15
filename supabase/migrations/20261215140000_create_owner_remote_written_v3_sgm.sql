-- Owner-initiated remote-written v3 SGM (petition): SECURITY DEFINER insert into meetings.
-- Does not change meetings RLS; staff-only INSERT remains; owners use this RPC only.

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
  v_t0 timestamptz := now();
  v_t14 timestamptz := v_t0 + interval '14 days';
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

  -- Best-effort total voting units: distinct active member unit numbers on this property.
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

  v_t0_iso := trim(both '"' FROM to_json(v_t0)::text);
  v_t14_iso := trim(both '"' FROM to_json(v_t14)::text);

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

  v_fy := EXTRACT(YEAR FROM v_t0)::integer;

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
    v_t0,
    v_t0,
    v_t14,
    uid
  )
  RETURNING id INTO v_meeting_id;

  RETURN jsonb_build_object('ok', true, 'meeting_id', v_meeting_id);
END;
$$;

COMMENT ON FUNCTION public.create_owner_remote_written_v3_sgm(uuid) IS
  'Active owner-only: inserts draft hybrid SGM with remote-written v3 + owner_requisitioned governance meta; 14-day participation window from now().';

REVOKE ALL ON FUNCTION public.create_owner_remote_written_v3_sgm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owner_remote_written_v3_sgm(uuid) TO authenticated;

COMMIT;
