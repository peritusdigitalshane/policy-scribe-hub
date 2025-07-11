-- Fix infinite recursion by using security definer functions
-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.documents;
DROP POLICY IF EXISTS "Document authors can create permissions" ON public.tenant_document_permissions;
DROP POLICY IF EXISTS "Users can view permissions for accessible documents" ON public.tenant_document_permissions;

-- Create security definer function to check if user is document author
CREATE OR REPLACE FUNCTION public.is_document_author(doc_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = doc_id AND author_id = user_id
  );
$$;

-- Create security definer function to get user's accessible document IDs
CREATE OR REPLACE FUNCTION public.get_user_accessible_documents(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(document_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Get documents user authored
  SELECT id as document_id FROM public.documents WHERE author_id = user_id
  UNION
  -- Get documents user has access to via tenant permissions
  SELECT tdp.document_id
  FROM public.tenant_document_permissions tdp
  WHERE tdp.tenant_id IN (
    SELECT utm.tenant_id 
    FROM public.user_tenant_memberships utm
    WHERE utm.user_id = get_user_accessible_documents.user_id 
    AND utm.is_active = true
  )
  AND tdp.can_view = true;
$$;

-- Create security definer function to check if user has access to document
CREATE OR REPLACE FUNCTION public.can_user_access_document(doc_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_user_accessible_documents(user_id) 
    WHERE document_id = doc_id
  );
$$;

-- Recreate documents policies using security definer functions
CREATE POLICY "Users can view accessible documents" 
ON public.documents 
FOR SELECT 
USING (
  is_super_admin()
  OR 
  can_user_access_document(id)
);

-- Recreate tenant document permissions policies
CREATE POLICY "Document authors can create permissions" 
ON public.tenant_document_permissions 
FOR INSERT 
WITH CHECK (
  is_super_admin()
  OR
  (
    is_document_author(document_id)
    AND tenant_id IN (
      SELECT utm.tenant_id 
      FROM user_tenant_memberships utm
      WHERE utm.user_id = auth.uid() 
      AND utm.is_active = true
    )
  )
);

CREATE POLICY "Users can view permissions for accessible documents" 
ON public.tenant_document_permissions 
FOR SELECT 
USING (
  is_super_admin()
  OR
  can_user_access_document(document_id)
  OR
  tenant_id IN (
    SELECT utm.tenant_id 
    FROM user_tenant_memberships utm
    WHERE utm.user_id = auth.uid() 
    AND utm.is_active = true
  )
);