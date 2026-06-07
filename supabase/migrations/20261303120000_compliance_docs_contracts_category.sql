/*
  Add contracts category to compliance_docs for service-contract records
  (future procurement authorization / invoice audit contract-scope checks).
  Existing rows unchanged; only extends the category CHECK whitelist.
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
    CHECK (category IN (
      'insurance',
      'contracts',
      'bylaw',
      'financial',
      'safety',
      'legal',
      'meeting_archive',
      'other'
    ));
END $$;
