/*
  # Add AI extraction failed status and invoice delete policy

  1. Changes
    - Add `ai_extraction_failed` value to `invoice_status` enum
      - Used when the AI OCR extraction fails after upload
    - Add DELETE policy for invoices
      - Users who uploaded an invoice can delete it
      - Council/manager roles can delete any invoice

  2. Security
    - DELETE policy restricted to the uploader or council/manager roles
*/

ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'ai_extraction_failed';

CREATE POLICY "Uploaders can delete own invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Council can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );
