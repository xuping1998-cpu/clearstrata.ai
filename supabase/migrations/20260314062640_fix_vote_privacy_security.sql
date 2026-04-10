/*
  # Fix Vote Privacy Security Issue

  ## Summary
  Fixes critical security issue where all users can view everyone's vote responses,
  violating voting privacy principles.

  ## Security Issue Fixed

  ### CRITICAL: Vote Responses Visible to All Users
  **Problem:** The current policy allows ANY authenticated user to view ALL vote responses:
  ```sql
  "Users can view all vote responses" ON vote_responses FOR SELECT USING (true)
  ```
  
  **Risk:** 
  - Voting privacy is completely compromised
  - Users can see how everyone else voted (yes/no)
  - This could lead to social pressure, retaliation, or manipulation
  - Violates basic principles of secret ballot voting
  
  **Solution:** 
  - Users can only view their OWN vote responses
  - Council members can view aggregate statistics through the votes table (yes_count, no_count, total_votes)
  - Individual voting choices remain private
  - This maintains voting integrity while allowing users to verify their own votes

  ## Changes Made

  1. Drop the overly permissive SELECT policy on vote_responses
  2. Add restrictive policy that allows users to only see their own votes
  3. Vote aggregation data remains available in the votes table for transparency

  ## Security Notes
  - Users can only see their own voting history
  - Aggregate vote counts are still visible in the votes table
  - Council cannot see individual voting choices, only totals
  - This follows democratic voting best practices
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all vote responses" ON vote_responses;

-- Add secure policy that protects voting privacy
CREATE POLICY "Users can view own vote responses"
  ON vote_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());




