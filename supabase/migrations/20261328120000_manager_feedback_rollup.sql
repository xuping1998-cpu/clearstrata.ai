/*
  # Manager feedback rollup for Council Action review (Phase P2B-5D)
*/

BEGIN;

ALTER TABLE public.manager_tasks
  ADD COLUMN IF NOT EXISTS manager_feedback text,
  ADD COLUMN IF NOT EXISTS manager_feedback_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_feedback_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.manager_tasks.manager_feedback IS 'Manager outcome summary for council review (e.g. council_action tasks).';
COMMENT ON COLUMN public.manager_tasks.manager_feedback_at IS 'When manager_feedback was last submitted.';
COMMENT ON COLUMN public.manager_tasks.manager_feedback_by IS 'User who submitted manager_feedback.';

COMMIT;

NOTIFY pgrst, 'reload schema';
