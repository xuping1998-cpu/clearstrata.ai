/*
  # Fix Hiring Candidates Insert Policy

  1. Changes
    - Drop the existing restrictive insert policy for hiring_candidates
    - Create a new policy that allows both owners and council members to insert candidates
    - This enables:
      - Owners to manually recommend candidates
      - Council members to use AI search functionality when creating jobs
  
  2. Security
    - Still requires authentication
    - Only allows owner and council roles
    - Maintains data integrity
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Owners can recommend candidates" ON hiring_candidates;

-- Create new policy that allows both owners and council members
CREATE POLICY "Owners and council can add candidates"
  ON hiring_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'council')
    )
  );
