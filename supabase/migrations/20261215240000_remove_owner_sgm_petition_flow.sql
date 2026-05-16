-- Remove owner-initiated remote-written v3 SGM petition RPCs; clean empty orphan drafts only.

BEGIN;

DROP FUNCTION IF EXISTS public.create_owner_remote_written_v3_sgm(uuid);
DROP FUNCTION IF EXISTS public.update_owner_remote_written_v3_sgm_draft(uuid, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.save_owner_remote_written_v3_sgm_agenda_drafts(uuid, jsonb);
DROP FUNCTION IF EXISTS public.prepare_owner_remote_written_v3_sgm_invitations(uuid);
DROP FUNCTION IF EXISTS public.delete_owner_remote_written_v3_sgm_draft(uuid);

-- Empty owner-requisitioned remote-written v3 drafts with no related activity (DB rows only; not Storage).
WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (
      SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id
    )
)
DELETE FROM public.meeting_ballots b
USING public.meeting_votes v, orphan_owner_petition_drafts o
WHERE b.vote_id = v.id AND v.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_vote_options o
USING public.meeting_votes v, orphan_owner_petition_drafts d
WHERE o.vote_id = v.id AND v.meeting_id = d.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_votes v
USING orphan_owner_petition_drafts o
WHERE v.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_resolutions r
USING orphan_owner_petition_drafts o
WHERE r.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_invitations i
USING orphan_owner_petition_drafts o
WHERE i.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.invite_tokens t
USING orphan_owner_petition_drafts o
WHERE t.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_attendees a
USING orphan_owner_petition_drafts o
WHERE a.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_minutes mm
USING orphan_owner_petition_drafts o
WHERE mm.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_documents d
USING orphan_owner_petition_drafts o
WHERE d.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meeting_agenda_items a
USING orphan_owner_petition_drafts o
WHERE a.meeting_id = o.id;

WITH orphan_owner_petition_drafts AS (
  SELECT m.id
  FROM public.meetings m
  WHERE lower(trim(both FROM coalesce(m.status, ''))) = 'draft'
    AND coalesce(m.description_zh, '') LIKE '%owner_requisitioned%'
    AND coalesce(m.description_zh, '') LIKE '%clearstrata-written-remote%'
    AND NOT EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_invitations i WHERE i.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_votes v WHERE v.meeting_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.meeting_documents d WHERE d.meeting_id = m.id)
)
DELETE FROM public.meetings m
USING orphan_owner_petition_drafts o
WHERE m.id = o.id;

COMMIT;
