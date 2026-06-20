/*
  # Council review queue (Phase P2B-5E)
*/

BEGIN;

ALTER TABLE public.council_actions
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'council_actions_review_status_check'
      AND conrelid = 'public.council_actions'::regclass
  ) THEN
    ALTER TABLE public.council_actions
      ADD CONSTRAINT council_actions_review_status_check
      CHECK (review_status IN ('not_ready', 'ready_for_review', 'approved', 'returned'));
  END IF;
END $$;

COMMENT ON COLUMN public.council_actions.review_status IS 'Council review queue: not_ready, ready_for_review, approved, returned';
COMMENT ON COLUMN public.council_actions.reviewed_by IS 'Council member who approved or returned manager feedback';
COMMENT ON COLUMN public.council_actions.reviewed_at IS 'When council review decision was recorded';
COMMENT ON COLUMN public.council_actions.review_note IS 'Optional approval note or required return reason';

COMMIT;

NOTIFY pgrst, 'reload schema';
