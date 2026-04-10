/*
  # Fix compliance document title requirements

  1. Changes
    - Make title_en (English title) optional (nullable)
    - Make title_zh (Chinese title) required (NOT NULL)
    - This allows users to upload documents with only Chinese titles
  
  2. Security
    - No changes to RLS policies
*/

-- Make title_en nullable (optional)
ALTER TABLE compliance_docs 
ALTER COLUMN title_en DROP NOT NULL;

-- Make title_zh required (NOT NULL)
-- First update any existing null values
UPDATE compliance_docs 
SET title_zh = title_en 
WHERE title_zh IS NULL;

-- Then add the NOT NULL constraint
ALTER TABLE compliance_docs 
ALTER COLUMN title_zh SET NOT NULL;



