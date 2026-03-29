/*
  # Invoice audit trail + optional columns for finance workflow

  1. `invoice_audit_log` — who did what (approve, reject, pay, edit, etc.)
  2. `invoices` — verified_by, verified_at, paid_at, paid_by, review_notes (reject reason)
  3. RLS for audit log; permissive UPDATE on invoices for finance roles + uploader
*/

CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  notes text,
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_invoice ON invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_created ON invoice_audit_log(created_at DESC);

ALTER TABLE invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice audit log"
  ON invoice_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Finance roles can insert invoice audit log"
  ON invoice_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('council', 'admin', 'manager')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN verified_by uuid REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN verified_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paid_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN paid_by uuid REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE invoices ADD COLUMN review_notes text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP POLICY IF EXISTS "Uploader or finance staff can update invoices" ON invoices;

CREATE POLICY "Uploader or finance staff can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('council', 'admin', 'manager')
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('council', 'admin', 'manager')
    )
  );

-- monthly_summaries: allow admin same as council
DROP POLICY IF EXISTS "Published summaries visible to all authenticated users" ON monthly_summaries;
CREATE POLICY "Published summaries visible to all authenticated users"
  ON monthly_summaries FOR SELECT
  TO authenticated
  USING (
    published = true
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council can create summaries" ON monthly_summaries;
CREATE POLICY "Council or admin can create summaries"
  ON monthly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council can update summaries" ON monthly_summaries;
CREATE POLICY "Council or admin can update summaries"
  ON monthly_summaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council can create special levies" ON special_levies;
CREATE POLICY "Council or admin can create special levies"
  ON special_levies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council can update special levies" ON special_levies;
CREATE POLICY "Council or admin can update special levies"
  ON special_levies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );
