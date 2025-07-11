-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Super admins can manage all documents" 
ON storage.objects 
FOR ALL 
USING (public.is_super_admin());

CREATE POLICY "Users can view documents for their tenants" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND name LIKE ANY(
    SELECT tenant_id::text || '/%'
    FROM public.get_user_tenants()
  )
);

-- Create policy for tenant admins to manage their tenant's documents
CREATE POLICY "Tenant admins can manage their tenant documents" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = auth.uid()
    AND utm.role IN ('tenant_admin', 'super_admin')
    AND utm.is_active = true
    AND name LIKE utm.tenant_id::text || '/%'
  )
);