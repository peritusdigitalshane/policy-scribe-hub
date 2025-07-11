-- Add magic links table for document sharing
CREATE TABLE public.document_magic_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  magic_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  view_count INTEGER NOT NULL DEFAULT 0,
  max_views INTEGER DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on magic links
ALTER TABLE public.document_magic_links ENABLE ROW LEVEL SECURITY;

-- Users can create magic links for documents they have access to
CREATE POLICY "Users can create magic links for accessible documents" 
ON public.document_magic_links 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND (
    -- Super admins can create links for any document
    is_super_admin()
    OR 
    -- Users can create links for documents their tenant has access to
    document_id IN (
      SELECT tdp.document_id
      FROM tenant_document_permissions tdp
      WHERE tdp.tenant_id IN (SELECT get_user_tenants.tenant_id FROM get_user_tenants())
      AND tdp.can_view = true
    )
  )
);

-- Users can view their own magic links
CREATE POLICY "Users can view their own magic links" 
ON public.document_magic_links 
FOR SELECT 
USING (created_by = auth.uid() OR is_super_admin());

-- Super admins can manage all magic links
CREATE POLICY "Super admins can manage all magic links" 
ON public.document_magic_links 
FOR ALL 
USING (is_super_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_document_magic_links_updated_at
BEFORE UPDATE ON public.document_magic_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate secure magic token
CREATE OR REPLACE FUNCTION public.generate_magic_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Function to verify magic link access (public access for magic links)
CREATE OR REPLACE FUNCTION public.verify_magic_link_access(token TEXT)
RETURNS TABLE(
  document_id UUID,
  document_title TEXT,
  document_file_url TEXT,
  can_access BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    d.id as document_id,
    d.title as document_title,
    d.file_url as document_file_url,
    (ml.is_active AND ml.expires_at > now() AND (ml.max_views IS NULL OR ml.view_count < ml.max_views)) as can_access
  FROM public.document_magic_links ml
  JOIN public.documents d ON ml.document_id = d.id
  WHERE ml.magic_token = token;
$$;