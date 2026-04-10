/*
  # Add DELETE policies for procurement child tables

  1. Problem
    - CASCADE deletes on procurement_jobs fail because RLS on child tables
      has no DELETE policy, blocking the cascaded row removal.

  2. Changes
    - Add DELETE policies for council members on:
      - procurement_audit_log
      - procurement_ai_reports
      - procurement_approvals
      - procurement_invoices
      - procurement_photos
      - procurement_quote_notifications
      - procurement_quotes
      - procurement_verifications
      - vendor_ratings

  3. Security
    - Only council role users can trigger these deletes (same as the
      parent procurement_jobs delete policy)
*/

CREATE POLICY "Council can delete audit log entries"
  ON procurement_audit_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete ai reports"
  ON procurement_ai_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete approvals"
  ON procurement_approvals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete procurement invoices"
  ON procurement_invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete procurement photos"
  ON procurement_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete quote notifications"
  ON procurement_quote_notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete quotes"
  ON procurement_quotes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete verifications"
  ON procurement_verifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete vendor ratings"
  ON vendor_ratings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );




