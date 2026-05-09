-- Council election ballots (multi-select candidates per unit).
-- Links to owner_vote_meetings.id for eligibility via owner_vote_voter_snapshot.

BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_election_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.owner_vote_meetings(id) ON DELETE CASCADE,
  agenda_item_id uuid NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  unit_no text NOT NULL,
  voter_user_id uuid NOT NULL REFERENCES auth.users(id),
  selected_candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_election_ballots IS 'Per-unit selections for council election agendas (distinct from yes/no resolutions).';

CREATE UNIQUE INDEX IF NOT EXISTS owner_election_ballots_meeting_agenda_unit_key
  ON public.owner_election_ballots (
    meeting_id,
    agenda_item_id,
    lower(trim(unit_no))
  );

CREATE INDEX IF NOT EXISTS owner_election_ballots_agenda_meeting_idx
  ON public.owner_election_ballots (meeting_id, agenda_item_id);

CREATE INDEX IF NOT EXISTS owner_election_ballots_property_idx
  ON public.owner_election_ballots (property_id);

ALTER TABLE public.owner_election_ballots ENABLE ROW LEVEL SECURITY;

-- Eligible voters read own rows; staff (council/admin/manager/property_admin) read all for their property.
CREATE POLICY "oeb_select_voter_or_staff"
  ON public.owner_election_ballots FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      voter_user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = owner_election_ballots.property_id
          AND pm.status = 'active'
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

-- Extract JSON blob from meeting_agenda_items.description_zh embedded comment block.
CREATE OR REPLACE FUNCTION public.try_extract_election_agenda_meta(p_desc_zh text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  marker CONSTANT text := '<!--clearstrata-election-agenda';
  i int;
  k int;
  chunk text;
  json_candidate text;
BEGIN
  IF p_desc_zh IS NULL OR length(trim(p_desc_zh)) = 0 THEN
    RETURN NULL;
  END IF;
  i := strpos(p_desc_zh, marker);
  IF i = 0 THEN
    RETURN NULL;
  END IF;
  i := i + char_length(marker);
  WHILE i <= length(p_desc_zh) AND substring(p_desc_zh FROM i FOR 1) IN (E' ', E'\t', E'\r')
  LOOP i := i + 1;
  END LOOP;
  IF substring(p_desc_zh FROM i FOR 1) = E'\n' THEN
    i := i + 1;
  END IF;

  chunk := substring(p_desc_zh FROM i);
  IF chunk IS NULL OR chunk = '' THEN
    RETURN NULL;
  END IF;
  k := strpos(chunk, E'\n-->');
  IF k = 0 THEN
    RETURN NULL;
  END IF;
  json_candidate := trim(both FROM substring(chunk FROM 1 FOR k - 1));
  IF json_candidate IS NULL OR json_candidate = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN json_candidate::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_owner_election_ballot(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_selected_candidate_ids jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_unit_raw text;
  v_unit text;
  v_property uuid;

  ov_status text;
  vo timestamptz;
  vc timestamptz;

  v_ov_title text;
  v_ov_property uuid;
  v_council_id uuid;

  v_desc_zh text;
  meta jsonb;
  v_agenda_meeting uuid;
  v_agenda_property uuid;

  v_seats int;
  v_max_ch int;

  n int := 0;
  i int;

  cid text;
  cid_u uuid;

  accepted_ids uuid[] := ARRAY[]::uuid[];

  cand jsonb;
  sel_txt text;
  cand_u uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF jsonb_typeof(p_selected_candidate_ids) <> 'array' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_selection_shape');
  END IF;

  SELECT ovs.unit_no, ovs.property_id
    INTO v_unit_raw, v_property
  FROM public.owner_vote_voter_snapshot ovs
  WHERE ovs.user_id = uid
    AND ovs.meeting_id = p_meeting_id
    AND ovs.is_eligible IS TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_eligible_to_vote');
  END IF;

  v_unit := trim(both FROM coalesce(v_unit_raw::text, ''));

  SELECT
    trim(both FROM coalesce(title, '')),
    property_id,
    lower(trim(both FROM coalesce(status, ''))),
    voting_opens_at,
    voting_closes_at
  INTO v_ov_title, v_ov_property, ov_status, vo, vc
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF v_unit = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_unit_no');
  END IF;

  IF ov_status IS DISTINCT FROM 'open' THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
  END IF;

  IF vo IS NOT NULL AND now() < vo THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
  END IF;

  IF vc IS NOT NULL AND now() > vc THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
  END IF;

  IF v_ov_property <> v_property THEN
    RETURN json_build_object('ok', false, 'error', 'snapshot_mismatch');
  END IF;

  SELECT m.id
    INTO v_council_id
  FROM public.meetings m
  WHERE m.property_id = v_ov_property
    AND lower(coalesce(m.meeting_type::text, '')) IN ('agm', 'sgm')
    AND (
      trim(both FROM coalesce(m.title_zh::text, '')) = v_ov_title
      OR trim(both FROM coalesce(m.title_en::text, '')) = v_ov_title
    )
  ORDER BY coalesce(m.created_at, timestamp 'epoch') DESC
  LIMIT 1;

  IF v_council_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'council_meeting_not_found');
  END IF;

  SELECT mai.description_zh, mai.meeting_id, mai.property_id
    INTO v_desc_zh, v_agenda_meeting, v_agenda_property
  FROM public.meeting_agenda_items mai
  WHERE mai.id = p_agenda_item_id
    AND mai.property_id = v_property
    AND mai.meeting_id = v_council_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'agenda_not_found');
  END IF;

  meta := public.try_extract_election_agenda_meta(v_desc_zh);
  IF meta IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  IF coalesce(trim(both FROM meta ->> 'agenda_type'), '') <> 'council_election' THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  v_seats := floor(coalesce((meta ->> 'seats')::numeric, '1'::numeric))::int;
  v_max_ch := floor(coalesce((meta ->> 'max_choices_per_unit')::numeric, '1'::numeric))::int;
  IF v_seats < 1 THEN v_seats := 1; END IF;
  IF v_max_ch < 1 THEN v_max_ch := 1; END IF;

  n := jsonb_array_length(coalesce(p_selected_candidate_ids, '[]'::jsonb));
  IF n > LEAST(v_max_ch, v_seats) THEN
    RETURN json_build_object('ok', false, 'error', 'too_many_candidates');
  END IF;

  -- Build acceptable candidate id set from accepted nominees
  FOR i IN 0 .. GREATEST(jsonb_array_length(coalesce(meta -> 'candidates', '[]'::jsonb)) - 1, -1)
  LOOP
    cand := meta -> 'candidates' -> i;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;

    IF lower(coalesce(trim(both FROM cand ->> 'accepted'::text), 'false'::text))
      NOT IN ('true'::text, 't'::text, '1'::text, 'yes'::text)
    THEN
      CONTINUE;
    END IF;

    cid := trim(both FROM cand ->> 'id'::text);
    IF cid IS NULL OR cid = '' THEN CONTINUE; END IF;
    BEGIN
      cid_u := cid::uuid;
      accepted_ids := array_append(accepted_ids, cid_u);
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  FOR i IN 0 .. GREATEST(jsonb_array_length(coalesce(p_selected_candidate_ids, '[]'::jsonb)) - 1, -1)
  LOOP
    sel_txt := trim(both FROM p_selected_candidate_ids ->> i);
    CONTINUE WHEN sel_txt IS NULL OR sel_txt = '';

    cand_u := NULL::uuid;
    BEGIN
      cand_u := sel_txt::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('ok', false, 'error', 'invalid_candidate_id_format');
    END;

    IF NOT cand_u = ANY (accepted_ids) THEN
      RETURN json_build_object('ok', false, 'error', 'invalid_candidate_id');
    END IF;
  END LOOP;

  INSERT INTO public.owner_election_ballots AS oeb (
    property_id,
    meeting_id,
    agenda_item_id,
    unit_no,
    voter_user_id,
    selected_candidate_ids,
    submitted_at,
    updated_at
  )
  VALUES (
    v_property,
    p_meeting_id,
    p_agenda_item_id,
    v_unit,
    uid,
    coalesce(p_selected_candidate_ids, '[]'::jsonb),
    now(),
    now()
  )
  ON CONFLICT (meeting_id, agenda_item_id, lower(trim(unit_no)))
  DO UPDATE SET
    selected_candidate_ids = EXCLUDED.selected_candidate_ids,
    voter_user_id = EXCLUDED.voter_user_id,
    updated_at = now();

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.try_extract_election_agenda_meta(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.submit_owner_election_ballot IS 'Upsert election ballot (one per unit_no per agenda) using owner_vote eligibility.';

COMMIT;
