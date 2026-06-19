/*
  # Council Action → Manager Task bridge (Phase P2B-5C)
*/

BEGIN;

ALTER TABLE public.manager_tasks
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS council_action_id uuid REFERENCES public.council_actions(id) ON DELETE SET NULL;

ALTER TABLE public.council_actions
  ADD COLUMN IF NOT EXISTS manager_task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manager_tasks_source
  ON public.manager_tasks(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_action
  ON public.manager_tasks(council_action_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_tasks_council_action_unique
  ON public.manager_tasks(council_action_id)
  WHERE council_action_id IS NOT NULL;

ALTER TABLE public.manager_tasks DROP CONSTRAINT IF EXISTS manager_tasks_task_type_check;

ALTER TABLE public.manager_tasks
  ADD CONSTRAINT manager_tasks_task_type_check
  CHECK (task_type IN (
    'repair',
    'vendor',
    'invoice_review',
    'dispute',
    'owner_request',
    'procurement',
    'invoice_upload',
    'maintenance',
    'budget_review',
    'owner_fee_collection',
    'finance_mapping',
    'follow_up'
  ));

COMMENT ON COLUMN public.manager_tasks.source_type IS 'Origin module, e.g. council_action';
COMMENT ON COLUMN public.manager_tasks.source_id IS 'Origin record id (e.g. council_actions.id)';
COMMENT ON COLUMN public.manager_tasks.council_action_id IS 'Linked council action when spawned from budget risk workflow';
COMMENT ON COLUMN public.council_actions.manager_task_id IS 'Auto-created manager task after assign-to-manager';

COMMIT;

NOTIFY pgrst, 'reload schema';
