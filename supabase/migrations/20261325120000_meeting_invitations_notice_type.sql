-- Phase 7J: distinguish meeting notice vs voting notice on meeting_invitations.

BEGIN;

ALTER TABLE public.meeting_invitations
  ADD COLUMN IF NOT EXISTS notice_type text NOT NULL DEFAULT 'meeting_notice';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meeting_invitations_notice_type_check'
  ) THEN
    ALTER TABLE public.meeting_invitations
      ADD CONSTRAINT meeting_invitations_notice_type_check
      CHECK (notice_type IN ('meeting_notice', 'voting_notice'));
  END IF;
END $$;

COMMENT ON COLUMN public.meeting_invitations.notice_type IS
  'meeting_notice = agenda/discussion invite; voting_notice = frozen-roll ballot open notice.';

ALTER TABLE public.meeting_invitations
  DROP CONSTRAINT IF EXISTS meeting_invitations_meeting_id_recipient_user_id_key;

ALTER TABLE public.meeting_invitations
  DROP CONSTRAINT IF EXISTS meeting_invitations_pkey_recipient;

-- Production repair migration may have named the unique differently.
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'meeting_invitations'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) LIKE '%meeting_id%recipient_user_id%'
      AND pg_get_constraintdef(con.oid) NOT LIKE '%notice_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.meeting_invitations DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS meeting_invitations_meeting_recipient_notice_uidx
  ON public.meeting_invitations (meeting_id, recipient_user_id, notice_type);

COMMIT;
