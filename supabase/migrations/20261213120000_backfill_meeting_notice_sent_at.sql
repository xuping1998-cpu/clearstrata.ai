-- Backfill meetings.notice_sent_at from earliest successful meeting_invitations.sent_at.
-- Does not overwrite existing notice_sent_at.

WITH first_notice AS (
  SELECT
    meeting_id,
    MIN(sent_at) AS first_sent_at
  FROM public.meeting_invitations
  WHERE sent_at IS NOT NULL
    AND delivery_status IN ('sent', 'opened', 'voted')
  GROUP BY meeting_id
)
UPDATE public.meetings m
SET notice_sent_at = fn.first_sent_at
FROM first_notice fn
WHERE m.id = fn.meeting_id
  AND m.notice_sent_at IS NULL;
