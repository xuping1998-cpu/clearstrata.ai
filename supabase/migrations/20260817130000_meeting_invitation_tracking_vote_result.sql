-- Meeting invitation tracking: email + vote on invite row, meeting-level vote_result aggregate.
-- Replaces permissive recipient UPDATE policy with RPC (recipient cannot forge voted status).

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS vote_result jsonb;

COMMENT ON COLUMN public.meetings.vote_result IS
  'Aggregated ballot counts for this meeting: approve (for), reject (against), abstain, total.';

ALTER TABLE public.meeting_invitations
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.meeting_invitations
  ADD COLUMN IF NOT EXISTS voted_at timestamptz;

ALTER TABLE public.meeting_invitations
  ADD COLUMN IF NOT EXISTS vote text;

ALTER TABLE public.meeting_invitations
  DROP CONSTRAINT IF EXISTS meeting_invitations_vote_check;

ALTER TABLE public.meeting_invitations
  ADD CONSTRAINT meeting_invitations_vote_check
  CHECK (vote IS NULL OR vote IN ('approve', 'reject', 'abstain'));

ALTER TABLE public.meeting_invitations
  DROP CONSTRAINT IF EXISTS meeting_invitations_delivery_status_check;

ALTER TABLE public.meeting_invitations
  ADD CONSTRAINT meeting_invitations_delivery_status_check
  CHECK (delivery_status IN ('pending', 'sent', 'failed', 'opened', 'voted'));

CREATE OR REPLACE FUNCTION public.refresh_meeting_vote_result(p_meeting_id uuid, p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb;
BEGIN
  SELECT jsonb_build_object(
    'approve', COUNT(*) FILTER (WHERE b.selected_option_key = 'for'),
    'reject', COUNT(*) FILTER (WHERE b.selected_option_key = 'against'),
    'abstain', COUNT(*) FILTER (WHERE b.selected_option_key = 'abstain'),
    'total', COUNT(*)
  )
  INTO j
  FROM public.meeting_ballots b
  JOIN public.meeting_votes v ON v.id = b.vote_id
  WHERE v.meeting_id = p_meeting_id
    AND b.property_id = p_property_id;

  UPDATE public.meetings m
  SET vote_result = COALESCE(j, '{"approve":0,"reject":0,"abstain":0,"total":0}'::jsonb),
      updated_at = now()
  WHERE m.id = p_meeting_id
    AND m.property_id = p_property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.meeting_ballots_after_write_invite_and_vote_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vid uuid;
  mid uuid;
  pid uuid;
  voter uuid;
  opt text;
  mapped text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    vid := OLD.vote_id;
  ELSE
    vid := NEW.vote_id;
    voter := NEW.voter_user_id;
    opt := NEW.selected_option_key;
  END IF;

  SELECT v.meeting_id, v.property_id INTO mid, pid
  FROM public.meeting_votes v
  WHERE v.id = vid;

  IF mid IS NULL OR pid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    mapped := CASE opt
      WHEN 'for' THEN 'approve'
      WHEN 'against' THEN 'reject'
      WHEN 'abstain' THEN 'abstain'
      ELSE NULL
    END;

    IF mapped IS NOT NULL THEN
      UPDATE public.meeting_invitations mi
      SET
        delivery_status = 'voted',
        vote = mapped,
        voted_at = now(),
        opened_at = COALESCE(mi.opened_at, now())
      WHERE mi.meeting_id = mid
        AND mi.property_id = pid
        AND mi.recipient_user_id = voter;
    END IF;
  END IF;

  PERFORM public.refresh_meeting_vote_result(mid, pid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_ballots_invite_vote_result ON public.meeting_ballots;
CREATE TRIGGER trg_meeting_ballots_invite_vote_result
  AFTER INSERT OR DELETE OR UPDATE OF selected_option_key, vote_id
  ON public.meeting_ballots
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_ballots_after_write_invite_and_vote_result();

CREATE OR REPLACE FUNCTION public.mark_meeting_invitation_opened(p_meeting_id uuid, p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.meeting_invitations mi
  SET
    opened_at = COALESCE(mi.opened_at, now()),
    delivery_status = CASE
      WHEN mi.delivery_status = 'voted' THEN 'voted'
      WHEN mi.delivery_status = 'failed' THEN 'failed'
      ELSE 'opened'
    END
  WHERE mi.meeting_id = p_meeting_id
    AND mi.property_id = p_property_id
    AND mi.recipient_user_id = (SELECT auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_meeting_invitation_opened(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.mark_meeting_invitation_opened(uuid, uuid) IS
  'Recipient marks their invitation opened; preserves voted/failed. Scoped by meeting + property.';

DROP POLICY IF EXISTS minv_update_recipient_opened ON public.meeting_invitations;
