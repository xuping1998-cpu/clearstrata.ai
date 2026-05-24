-- Phase 6B-3 hotfix-4: Drop legacy meeting_minutes BEFORE UPDATE auto-increment trigger.
-- create_minutes_version() incremented current_version on every draft_content change,
-- conflicting with revise/finalize RPC version lifecycle (Phase 6B-3).

BEGIN;

DROP TRIGGER IF EXISTS minutes_version_trigger ON public.meeting_minutes;

COMMENT ON FUNCTION public.create_minutes_version() IS
  'Legacy trigger function retained for compatibility only. The minutes_version_trigger was dropped because Phase 6B-3 controls meeting minutes versions via RPC and meeting_documents archive rows.';

COMMIT;
