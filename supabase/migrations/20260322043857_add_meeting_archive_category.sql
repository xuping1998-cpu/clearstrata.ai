/*
  # Add meeting_archive category to compliance_docs

  1. Changes
    - Update the CHECK constraint on `compliance_docs.category` column
    - Add new category value: 'meeting_archive' (会议存档)
    - Full allowed values: 'insurance', 'bylaw', 'financial', 'safety', 'legal', 'meeting_archive', 'other'

  2. Important Notes
    - Existing data is not affected as no values are removed
    - The new category allows archiving meeting-related documents in the compliance library
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'compliance_docs_category_check'
  ) THEN
    ALTER TABLE compliance_docs DROP CONSTRAINT compliance_docs_category_check;
  END IF;
  
  ALTER TABLE compliance_docs 
    ADD CONSTRAINT compliance_docs_category_check 
    CHECK (category IN ('insurance', 'bylaw', 'financial', 'safety', 'legal', 'meeting_archive', 'other'));
END $$;
