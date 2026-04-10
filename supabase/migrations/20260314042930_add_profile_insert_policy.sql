/*
  # Add INSERT policy for profiles table

  ## Changes
  - Add policy to allow users to insert their own profile during signup
  
  ## Security
  - Users can only insert a profile with their own user ID (auth.uid())
*/

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);




