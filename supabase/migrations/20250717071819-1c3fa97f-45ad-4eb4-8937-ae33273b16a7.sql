-- Update document upload policy to restrict to tenant administrators only
DROP POLICY IF EXISTS "Tenant members can upload documents for their tenant" ON public.documents;

-- Create new policy that only allows tenant administrators to upload documents
CREATE POLICY "Only tenant administrators can upload documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND (
    is_super_admin() 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid() 
      AND utm.role IN ('tenant_admin', 'super_admin')
      AND utm.is_active = true
    )
  )
);