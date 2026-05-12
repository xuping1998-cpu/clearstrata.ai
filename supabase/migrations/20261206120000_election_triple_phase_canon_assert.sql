-- Overrides assert_council_election_timeline: auto 7+7+7 from meetings.scheduled_at.
-- Applies after 20260907120000_election_agenda_timeline_nomination_gate.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_council_election_timeline(
  p_scheduled_at timestamptz,
  p_meeting_format text,
  p_meeting_description_zh text,
  p_voting_open_row timestamptz,
  p_voting_close_row timestamptz,
  p_nomination_open_text text,
  p_nomination_close_text text
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tol double precision := 120;

  canon_notice_close timestamptz;
  canon_nom_open timestamptz;
  canon_nom_close timestamptz;
  canon_vote_open timestamptz;
  canon_vote_close timestamptz;

  schedule_meta jsonb;
  nom_open timestamptz;
  nom_close timestamptz;
  voting_open timestamptz;
  voting_close timestamptz;

  notice_close_stored timestamptz;
  meta_vo timestamptz;
  meta_vc timestamptz;

  hybrid boolean := lower(trim(both FROM coalesce(p_meeting_format, ''))) = 'hybrid';

BEGIN
  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  canon_notice_close := p_scheduled_at + interval '7 days';
  canon_nom_open := canon_notice_close;
  canon_nom_close := p_scheduled_at + interval '14 days';
  canon_vote_open := canon_nom_close;
  canon_vote_close := p_scheduled_at + interval '21 days';

  nom_open := public.parse_ts_iso_text(p_nomination_open_text);
  nom_close := public.parse_ts_iso_text(p_nomination_close_text);

  IF nom_open IS NULL OR nom_close IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (nom_open - canon_nom_open))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (nom_close - canon_nom_close))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  voting_open := p_voting_open_row;
  voting_close := p_voting_close_row;

  IF voting_open IS NULL OR voting_close IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (voting_open - canon_vote_open))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (voting_close - canon_vote_close))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  schedule_meta := public.try_extract_written_remote_schedule_meta(p_meeting_description_zh);

  IF hybrid
    AND schedule_meta IS NOT NULL
    AND coalesce((schedule_meta ->> 'v')::text, '') = '1' THEN

    notice_close_stored :=
      COALESCE(
        public.parse_ts_iso_text(schedule_meta ->> 'public_notice_close_at'),
        public.parse_ts_iso_text(schedule_meta ->> 'discussion_closes_at')
      );

    IF notice_close_stored IS NULL THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (notice_close_stored - canon_notice_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    meta_vo := public.parse_ts_iso_text(schedule_meta ->> 'voting_open_at');
    meta_vc := public.parse_ts_iso_text(schedule_meta ->> 'voting_close_at');

    IF meta_vo IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vo - canon_vote_open))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF meta_vc IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vc - canon_vote_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_council_election_timeline IS
  'Raises invalid_election_timeline unless nomination + voting rows + optional written-remote meta match auto 7+7+7 from scheduled_at (+/-120s).';

COMMIT;
