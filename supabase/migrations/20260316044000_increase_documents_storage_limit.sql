/*
  # Increase Document Storage Size Limit

  1. Changes
    - Update the `documents` storage bucket file size limit from 100MB to 500MB
    - This allows users to upload larger compliance documents, meeting recordings, and other files
  
  2. Security
    - No changes to existing RLS policies
    - File size validation is handled at the storage bucket level
*/

UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE name = 'documents';
