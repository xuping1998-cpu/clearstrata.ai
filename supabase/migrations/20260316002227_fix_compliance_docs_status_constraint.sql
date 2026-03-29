/*
  # Fix Compliance Documents Status Constraint

  1. Changes
    - Update status constraint to match frontend status values
    - Change from ('active', 'expired', 'pending')
    - To ('valid', 'expired', 'expiring')
    
  2. Migration Strategy
    - Drop the existing status check constraint
    - Add new constraint with updated values
    - Update default value from 'active' to 'valid'
*/

DO $$
BEGIN
  -- Drop the existing status check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'compliance_docs_status_check'
  ) THEN
    ALTER TABLE compliance_docs DROP CONSTRAINT compliance_docs_status_check;
  END IF;
  
  -- Update default value for status column
  ALTER TABLE compliance_docs ALTER COLUMN status SET DEFAULT 'valid';
  
  -- Add the new status constraint with updated values
  ALTER TABLE compliance_docs 
    ADD CONSTRAINT compliance_docs_status_check 
    CHECK (status IN ('valid', 'expired', 'expiring'));
END $$;
