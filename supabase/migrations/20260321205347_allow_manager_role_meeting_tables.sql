/*
  # Allow manager role on meeting-related tables

  1. Changes
    - Update INSERT/ALL policies on meeting_agenda_items to allow 'manager' role
    - Update INSERT/ALL policies on meeting_attendees to allow 'manager' role
    - Update INSERT policy on meeting_documents to allow 'manager' role

  2. Security
    - Both 'council' and 'manager' roles can now manage agenda items, attendees, and documents
    - Read access remains unchanged (all authenticated users can view)
*/

DO $$ BEGIN
  DROP POLICY IF EXISTS "Council can manage agenda items" ON meeting_agenda_items;
END $$;

CREATE POLICY "Council or manager can manage agenda items"
  ON meeting_agenda_items
  FOR ALL
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "Council can manage attendees" ON meeting_attendees;
END $$;

CREATE POLICY "Council or manager can manage attendees"
  ON meeting_attendees
  FOR ALL
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "Council can upload documents" ON meeting_documents;
END $$;

CREATE POLICY "Council or manager can upload documents"
  ON meeting_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );




