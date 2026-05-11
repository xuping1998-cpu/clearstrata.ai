-- Server-side voting window enforcement for yes/no/abstain owner resolution ballots.
-- Aligns with UI: only when owner_vote_meetings.status = 'open' and now() in [voting_opens_at, voting_closes_at].

BEGIN;

-- Remove legacy overload submit_owner_vote(uuid, owner_vote_choice); keep (uuid, text).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'owner_vote_choice'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.submit_owner_vote(uuid, public.owner_vote_choice)';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.submit_owner_vote(
  p_resolution_id uuid,
  p_choice text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_choice text := lower(trim(both from coalesce(p_choice, '')));
  v_meeting_id uuid;
  v_property_id uuid;
  ov_status text;
  vo timestamptz;
  vc timestamptz;
  v_unit_raw text;
  v_unit text;
  v_row_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_choice NOT IN ('yes', 'no', 'abstain') THEN
    RAISE EXCEPTION 'invalid_choice';
  END IF;

  SELECT
    r.meeting_id,
    m.property_id,
    lower(trim(both from coalesce(m.status, ''))),
    m.voting_opens_at,
    m.voting_closes_at
  INTO v_meeting_id, v_property_id, ov_status, vo, vc
  FROM public.owner_vote_resolutions r
  INNER JOIN public.owner_vote_meetings m ON m.id = r.meeting_id
  WHERE r.id = p_resolution_id
  LIMIT 1;

  IF NOT FOUND OR v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'resolution_not_found';
  END IF;

  SELECT ovs.unit_no
  INTO v_unit_raw
  FROM public.owner_vote_voter_snapshot ovs
  WHERE ovs.user_id = uid
    AND ovs.meeting_id = v_meeting_id
    AND ovs.property_id = v_property_id
    AND ovs.is_eligible IS TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_eligible_to_vote';
  END IF;

  v_unit := trim(both from coalesce(v_unit_raw::text, ''));

  IF v_unit IS NULL OR v_unit = '' THEN
    RAISE EXCEPTION 'missing_unit_no';
  END IF;
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF vo IS NULL THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF vc IS NULL THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF now() < vo THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF now() > vc THEN
    RAISE EXCEPTION 'voting_closed';
  END IF;

  UPDATE public.owner_vote_ballots b
  SET
    choice = v_choice,
    updated_at = now()
  WHERE b.meeting_id = v_meeting_id
    AND b.resolution_id = p_resolution_id
    AND b.voter_user_id = uid;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.owner_vote_ballots (
    property_id,
    meeting_id,
    resolution_id,
    unit_no,
    voter_user_id,
    choice,
    updated_at
  )
  VALUES (
    v_property_id,
    v_meeting_id,
    p_resolution_id,
    v_unit,
    uid,
    v_choice,
    now()
  );
END;
$$;

COMMENT ON FUNCTION public.submit_owner_vote(uuid, text) IS
  'Upserts one owner resolution ballot per voter; enforces status=open and voting window on server.';

REVOKE ALL ON FUNCTION public.submit_owner_vote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_vote(uuid, text) TO authenticated;

COMMIT;
