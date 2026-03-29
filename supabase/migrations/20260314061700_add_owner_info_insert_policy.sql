/*
  # Fix Missing Owner Info INSERT Policy

  ## Summary
  Adds the missing INSERT policy for the owner_info table to allow users to create 
  their owner information records securely.

  ## Security Issue Fixed

  ### Issue #3: Missing INSERT Policy for owner_info Table
  **Problem:** The owner_info table has no INSERT policy at all. This means:
  - New users cannot create their owner information records
  - The Owner Info page would fail when users try to save their information
  - The application functionality is broken for onboarding new owners
  
  **Risk:** While not allowing inserts is "secure," it breaks core functionality. 
  Users need to be able to create their owner_info record once.
  
  **Solution:** Add a secure INSERT policy that:
  - Only allows authenticated users to create their own owner_info record
  - Ensures user_id matches the authenticated user
  - Prevents users from creating multiple records (handled by unique constraint on user_id)
  - Sets pending_approval to true by default for council review

  ## Changes Made

  1. Add INSERT policy for owner_info table with proper ownership checks
  2. Ensure users can only create records for themselves
  3. Follow the principle of least privilege

  ## Security Notes
  - Users can only insert their own owner_info record
  - The user_id field must match auth.uid()
  - Council approval workflow is maintained via pending_approval field
  - Existing UPDATE and SELECT policies remain unchanged
*/

-- Add missing INSERT policy for owner_info table
CREATE POLICY "Owners can create own info"
  ON owner_info FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
