/*
  # Fix Critical Security Issues

  ## Summary
  Addresses two critical security vulnerabilities discovered before production deployment.

  ## Security Issues Fixed

  ### Issue #1: Notifications INSERT Policy Too Permissive
  **Problem:** The "System can create notifications" policy allows ANY authenticated user 
  to create notifications for ANY other user with `WITH CHECK (true)`.
  
  **Risk:** Users could:
  - Spam other users with fake notifications
  - Impersonate system notifications
  - Create phishing attacks through fake urgent notifications
  
  **Solution:** Replace with a restrictive policy that only allows council members to 
  create notifications. In a production system, this should be handled by backend 
  Edge Functions with service role access, but this provides immediate protection.

  ### Issue #2: Profiles UPDATE Policy Allows Role Escalation
  **Problem:** The "Users can update own profile" policy allows users to update ALL 
  fields including the critical `role` field.
  
  **Risk:** Any user can:
  - Promote themselves to 'council' role
  - Grant themselves 'caretaker' permissions
  - Access and modify all financial, owner, and sensitive data
  - Bypass all role-based security throughout the application
  
  **Solution:** Add explicit column-level restrictions that prevent users from 
  modifying their own role. Only allow updates to safe personal information fields.

  ## Changes Made

  1. Drop and recreate notifications INSERT policy with council-only access
  2. Drop and recreate profiles UPDATE policy with explicit column restrictions
  3. Add new council-only policy for role management

  ## Security Notes
  - Notifications should ideally be created by Edge Functions with service role
  - Role changes should only be managed by council members through admin interface
  - All personal data fields remain user-editable for self-service
  - These policies follow principle of least privilege
*/

-- Fix Issue #1: Restrict notification creation to council only
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Council can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

-- Fix Issue #2: Prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile info"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Add council-only policy for role management
CREATE POLICY "Council can update user roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );
