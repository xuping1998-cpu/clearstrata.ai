-- Phase 7E-2A: independent opening statement fields on meetings.

BEGIN;

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS opening_statement_zh text,
ADD COLUMN IF NOT EXISTS opening_statement_en text;

COMMENT ON COLUMN public.meetings.opening_statement_zh IS
'Opening statement shown in public discussion and archived discussion record. Separate from meeting description and formal notice.';

COMMENT ON COLUMN public.meetings.opening_statement_en IS
'English opening statement shown in public discussion and archived discussion record. Separate from meeting description and formal notice.';

COMMIT;
