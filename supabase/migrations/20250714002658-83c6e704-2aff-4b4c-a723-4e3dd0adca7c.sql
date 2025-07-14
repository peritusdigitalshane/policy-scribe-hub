-- Make documents bucket completely public for testing
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view accessible documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Document authors can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Document authors can delete their documents" ON storage.objects;

-- Create very permissive policies for testing
CREATE POLICY "Allow public read access to documents" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated upload to documents" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to documents" ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete from documents" ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');