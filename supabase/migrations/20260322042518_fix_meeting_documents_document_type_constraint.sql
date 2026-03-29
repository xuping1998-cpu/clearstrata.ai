/*
  # Fix meeting_documents document_type constraint

  1. Changes
    - Update the CHECK constraint on `meeting_documents.document_type` column
    - New allowed values: 'agenda', 'background', 'minutes', 'report', 'other'
    - Replaces previous values: 'financial_report', 'procurement_quote', 'bylaw_reference'
      with: 'minutes', 'report'

  2. Important Notes
    - This aligns the database with the frontend dropdown options:
      议程 (agenda), 背景资料 (background), 会议纪要 (minutes), 报告 (report), 其他 (other)
*/

ALTER TABLE meeting_documents
  DROP CONSTRAINT IF EXISTS meeting_documents_document_type_check;

ALTER TABLE meeting_documents
  ADD CONSTRAINT meeting_documents_document_type_check
  CHECK (document_type IN ('agenda', 'background', 'minutes', 'report', 'other'));
