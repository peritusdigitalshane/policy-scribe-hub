-- Check and fix storage bucket policies for documents
-- First, ensure the bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Create comprehensive policies for document access
-- Policy for authenticated users to view documents they have access to
CREATE POLICY "Users can view accessible documents" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  (
    -- Super admins can access all
    is_super_admin() OR
    -- Document authors can access their own documents
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.file_url = name 
      AND d.author_id = auth.uid()
    ) OR
    -- Users can access documents they have tenant permissions for
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tenant_document_permissions tdp ON d.id = tdp.document_id
      JOIN public.user_tenant_memberships utm ON tdp.tenant_id = utm.tenant_id
      WHERE d.file_url = name 
      AND utm.user_id = auth.uid() 
      AND utm.is_active = true 
      AND tdp.can_view = true
    )
  )
);

-- Policy for uploading documents
CREATE POLICY "Authenticated users can upload documents" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Policy for updating documents (only authors and super admins)
CREATE POLICY "Document authors can update their documents" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.file_url = name 
      AND d.author_id = auth.uid()
    )
  )
);

-- Policy for deleting documents (only authors and super admins)
CREATE POLICY "Document authors can delete their documents" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.file_url = name 
      AND d.author_id = auth.uid()
    )
  )
);