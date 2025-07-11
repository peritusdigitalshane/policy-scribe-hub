-- Make the documents bucket public for access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents';

-- Create storage policies using the proper syntax
CREATE POLICY "Public read access for documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');