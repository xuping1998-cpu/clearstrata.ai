/*
  # Update Storage Bucket Size Limit

  1. Changes
    - Update the documents bucket to allow files up to 100MB (104857600 bytes)
    - This enables users to upload larger documents and images
  
  2. Security
    - File size validation is also performed on the client side
    - Images over 5MB are automatically compressed before upload
*/

UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE name = 'documents';




