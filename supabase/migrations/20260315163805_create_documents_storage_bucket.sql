/*
  # Create Documents Storage Bucket

  1. Storage Setup
    - Create a public storage bucket named 'documents' for meeting documents
    - Configure bucket to allow authenticated users to upload files
    
  2. Security
    - Add RLS policies for authenticated users to upload and read files
    - Public read access for all meeting documents
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');

CREATE POLICY "Users can update their own documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can delete their own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND owner = auth.uid());




