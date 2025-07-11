-- Update document policies to allow tenant members to upload documents for their tenant
DROP POLICY IF EXISTS "Authors can manage their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents their tenant has access to" ON public.documents;

-- Allow tenant members to upload documents for their tenant
CREATE POLICY "Tenant members can upload documents for their tenant" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND (
    is_super_admin()
    OR 
    -- Check if user is an active member of at least one tenant
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid() 
      AND utm.is_active = true
    )
  )
);

-- Allow users to view documents they authored or their tenant has access to
CREATE POLICY "Users can view accessible documents" 
ON public.documents 
FOR SELECT 
USING (
  is_super_admin()
  OR 
  author_id = auth.uid()
  OR 
  id IN (
    SELECT tdp.document_id
    FROM tenant_document_permissions tdp
    WHERE tdp.tenant_id IN (
      SELECT utm.tenant_id 
      FROM user_tenant_memberships utm
      WHERE utm.user_id = auth.uid() 
      AND utm.is_active = true
    )
    AND tdp.can_view = true
  )
);

-- Allow authors and super admins to update documents
CREATE POLICY "Authors and super admins can update documents" 
ON public.documents 
FOR UPDATE 
USING (
  is_super_admin() 
  OR 
  author_id = auth.uid()
);

-- Allow authors and super admins to delete documents
CREATE POLICY "Authors and super admins can delete documents" 
ON public.documents 
FOR DELETE 
USING (
  is_super_admin() 
  OR 
  author_id = auth.uid()
);

-- Update tenant document permissions policy to allow tenant members to manage permissions for their documents
DROP POLICY IF EXISTS "Users can view permissions for their tenants" ON public.tenant_document_permissions;

CREATE POLICY "Users can view permissions for accessible documents" 
ON public.tenant_document_permissions 
FOR SELECT 
USING (
  is_super_admin()
  OR
  -- Users can view permissions for their tenant documents
  tenant_id IN (
    SELECT utm.tenant_id 
    FROM user_tenant_memberships utm
    WHERE utm.user_id = auth.uid() 
    AND utm.is_active = true
  )
  OR
  -- Document authors can view permissions for their documents
  document_id IN (
    SELECT d.id FROM documents d WHERE d.author_id = auth.uid()
  )
);

-- Allow document authors to create permissions for their documents
CREATE POLICY "Document authors can create permissions" 
ON public.tenant_document_permissions 
FOR INSERT 
WITH CHECK (
  is_super_admin()
  OR
  -- Authors can assign their documents to any tenant they have access to
  (document_id IN (
    SELECT d.id FROM documents d WHERE d.author_id = auth.uid()
  )
  AND tenant_id IN (
    SELECT utm.tenant_id 
    FROM user_tenant_memberships utm
    WHERE utm.user_id = auth.uid() 
    AND utm.is_active = true
  ))
);

-- Update magic link policy to allow tenant members to create links for accessible documents
DROP POLICY IF EXISTS "Users can create magic links for accessible documents" ON public.document_magic_links;

CREATE POLICY "Users can create magic links for accessible documents" 
ON public.document_magic_links 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND (
    is_super_admin()
    OR 
    -- Document authors can create magic links
    document_id IN (
      SELECT d.id FROM documents d WHERE d.author_id = auth.uid()
    )
    OR
    -- Users can create links for documents their tenant has access to
    document_id IN (
      SELECT tdp.document_id
      FROM tenant_document_permissions tdp
      WHERE tdp.tenant_id IN (
        SELECT utm.tenant_id 
        FROM user_tenant_memberships utm
        WHERE utm.user_id = auth.uid() 
        AND utm.is_active = true
      )
      AND tdp.can_view = true
    )
  )
);