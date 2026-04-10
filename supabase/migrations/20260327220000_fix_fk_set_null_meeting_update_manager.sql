/*
  # Fix delete FK blocks and meeting updates for managers

  1. meetings
    - Allow `manager` role to UPDATE (was council-only; UI showed Edit to managers but RLS denied)

  2. Foreign keys -> ON DELETE SET NULL
    - disputes.related_meeting_id, disputes.related_invoice_id (deleting meeting/invoice no longer blocked)
    - meeting_minutes.approved_by_meeting_id (deleting referenced meeting)
    - procurement_jobs.selected_quote_id (deleting quote clears selection)
*/

-- Meetings: council OR manager can update
DROP POLICY IF EXISTS "Council can update meetings" ON meetings;

CREATE POLICY "Council or manager can update meetings"
  ON meetings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );

DO $$
DECLARE
  r RECORD;
BEGIN
  -- disputes.related_meeting_id
  FOR r IN
    SELECT rc.constraint_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = 'disputes'
      AND kcu.column_name = 'related_meeting_id'
  LOOP
    EXECUTE format('ALTER TABLE disputes DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'related_meeting_id'
  ) THEN
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_related_meeting_id_fkey
      FOREIGN KEY (related_meeting_id) REFERENCES meetings(id) ON DELETE SET NULL;
  END IF;

  -- disputes.related_invoice_id
  FOR r IN
    SELECT rc.constraint_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = 'disputes'
      AND kcu.column_name = 'related_invoice_id'
  LOOP
    EXECUTE format('ALTER TABLE disputes DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'related_invoice_id'
  ) THEN
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_related_invoice_id_fkey
      FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;

  -- meeting_minutes.approved_by_meeting_id
  FOR r IN
    SELECT rc.constraint_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = 'meeting_minutes'
      AND kcu.column_name = 'approved_by_meeting_id'
  LOOP
    EXECUTE format('ALTER TABLE meeting_minutes DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_minutes' AND column_name = 'approved_by_meeting_id'
  ) THEN
    ALTER TABLE meeting_minutes
      ADD CONSTRAINT meeting_minutes_approved_by_meeting_id_fkey
      FOREIGN KEY (approved_by_meeting_id) REFERENCES meetings(id) ON DELETE SET NULL;
  END IF;

  -- procurement_jobs.selected_quote_id
  FOR r IN
    SELECT rc.constraint_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = 'procurement_jobs'
      AND kcu.column_name = 'selected_quote_id'
  LOOP
    EXECUTE format('ALTER TABLE procurement_jobs DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procurement_jobs' AND column_name = 'selected_quote_id'
  ) THEN
    ALTER TABLE procurement_jobs
      ADD CONSTRAINT procurement_jobs_selected_quote_id_fkey
      FOREIGN KEY (selected_quote_id) REFERENCES procurement_quotes(id) ON DELETE SET NULL;
  END IF;
END $$;




