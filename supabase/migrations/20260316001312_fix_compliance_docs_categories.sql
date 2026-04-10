/*
  # Fix Compliance Documents Categories

  1. Changes
    - Update category constraint to match frontend categories
    - Change from ('legal', 'insurance', 'license', 'contract')
    - To ('insurance', 'bylaw', 'financial', 'safety', 'legal', 'other')
    
  2. Migration Strategy
    - Drop the existing constraint
    - Add new constraint with updated values
*/

DO $$
BEGIN
  -- Drop the existing category check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'compliance_docs_category_check'
  ) THEN
    ALTER TABLE compliance_docs DROP CONSTRAINT compliance_docs_category_check;
  END IF;
  
  -- Add the new category constraint with updated values
  ALTER TABLE compliance_docs 
    ADD CONSTRAINT compliance_docs_category_check 
    CHECK (category IN ('insurance', 'bylaw', 'financial', 'safety', 'legal', 'other'));
END $$;




