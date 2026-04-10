/*
  # Redesign Procurement Workflow to 6-Step Process

  ## Overview
  Redesigns the procurement/maintenance workflow so that:
  - Step 1: Collect quotes (existing)
  - Step 2: Council approves a specific quote and sends to Property Manager
  - Step 3: PM executes the work (contacts vendor, arranges construction)
  - Step 4: PM uploads completion photos and marks work complete
  - Step 5: Council inspects - pass or fail
  - Step 6: On pass, enters invoice and payment flow

  Council only controls two decision nodes: approve quote + inspect completion.
  All execution is handled by the Property Manager.

  ## Changes

  ### New enum values for procurement_status
  - `pending_approval` - quotes collected, awaiting council decision
  - `pm_executing` - approved quote sent to PM, work in progress
  - `pm_completed` - PM marked work as complete with photos
  - `pending_inspection` - awaiting council inspection
  - `inspection_passed` - council approved the completed work
  - `inspection_failed` - council rejected the completed work

  ### New columns on procurement_jobs
  - `selected_quote_id` - which quote the council approved
  - `assigned_manager_id` - which property manager is executing
  - `pm_completion_notes` - PM notes when marking complete
  - `pm_completed_at` - when PM marked complete
  - `inspection_result` - pass/fail
  - `inspection_notes` - council inspection comments
  - `inspected_by` - which council member inspected
  - `inspected_at` - when inspection happened

  ### Security
  - All existing RLS policies remain
  - New columns inherit table-level RLS
*/

-- Add new enum values to procurement_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_approval' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'pending_approval';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pm_executing' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'pm_executing';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pm_completed' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'pm_completed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_inspection' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'pending_inspection';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'inspection_passed' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'inspection_passed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'inspection_failed' AND enumtypid = 'procurement_status'::regtype) THEN
    ALTER TYPE procurement_status ADD VALUE 'inspection_failed';
  END IF;
END $$;

-- Add new columns to procurement_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'selected_quote_id'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN selected_quote_id uuid REFERENCES procurement_quotes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'assigned_manager_id'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN assigned_manager_id uuid REFERENCES property_managers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'pm_completion_notes'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN pm_completion_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'pm_completed_at'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN pm_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'inspection_result'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN inspection_result text CHECK (inspection_result IN ('passed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'inspection_notes'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN inspection_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'inspected_by'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN inspected_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'inspected_at'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN inspected_at timestamptz;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_selected_quote ON procurement_jobs(selected_quote_id);
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_assigned_manager ON procurement_jobs(assigned_manager_id);




