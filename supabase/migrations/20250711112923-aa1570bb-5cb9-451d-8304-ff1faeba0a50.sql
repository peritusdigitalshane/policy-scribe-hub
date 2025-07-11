-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'tenant_admin', 'user');

-- Create enum for policy/standard types
CREATE TYPE public.document_type AS ENUM ('policy', 'standard');

-- Create enum for document status
CREATE TYPE public.document_status AS ENUM ('draft', 'active', 'archived');

-- Create tenants/customers table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create user tenant memberships table
CREATE TABLE public.user_tenant_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Create policies/standards documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  document_type document_type NOT NULL,
  status document_status NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL DEFAULT '1.0',
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT,
  tags TEXT[],
  file_url TEXT,
  effective_date DATE,
  review_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant document permissions table
CREATE TABLE public.tenant_document_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_download BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, document_id)
);

-- Enable Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_document_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to check user roles
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_super_admin.user_id 
    AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(user_id UUID DEFAULT auth.uid(), tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenant_memberships 
    WHERE user_tenant_memberships.user_id = is_tenant_admin.user_id 
    AND (tenant_id IS NULL OR user_tenant_memberships.tenant_id = is_tenant_admin.tenant_id)
    AND role IN ('tenant_admin', 'super_admin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenants(user_id UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT utm.tenant_id 
  FROM public.user_tenant_memberships utm
  WHERE utm.user_id = get_user_tenants.user_id 
  AND utm.is_active = true;
$$;

-- Create RLS policies for tenants
CREATE POLICY "Super admins can view all tenants" ON public.tenants
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can view their assigned tenants" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.get_user_tenants())
  );

CREATE POLICY "Super admins can manage all tenants" ON public.tenants
  FOR ALL USING (public.is_super_admin());

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- Create RLS policies for user roles
CREATE POLICY "Super admins can manage all user roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Create RLS policies for user tenant memberships
CREATE POLICY "Super admins can manage all memberships" ON public.user_tenant_memberships
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Tenant admins can manage their tenant memberships" ON public.user_tenant_memberships
  FOR ALL USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Users can view their own memberships" ON public.user_tenant_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Create RLS policies for documents
CREATE POLICY "Super admins can manage all documents" ON public.documents
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Authors can manage their own documents" ON public.documents
  FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Users can view documents their tenant has access to" ON public.documents
  FOR SELECT USING (
    id IN (
      SELECT document_id 
      FROM public.tenant_document_permissions tdp
      WHERE tdp.tenant_id IN (SELECT tenant_id FROM public.get_user_tenants())
      AND tdp.can_view = true
    )
  );

-- Create RLS policies for tenant document permissions
CREATE POLICY "Super admins can manage all permissions" ON public.tenant_document_permissions
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view permissions for their tenants" ON public.tenant_document_permissions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenants())
  );

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tenant_memberships_updated_at
  BEFORE UPDATE ON public.user_tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert sample data
INSERT INTO public.tenants (name, slug, description, contact_email) VALUES
  ('Acme Corporation', 'acme-corp', 'Large enterprise customer', 'admin@acme.com'),
  ('Tech Startup Inc', 'tech-startup', 'Fast growing tech company', 'contact@techstartup.com'),
  ('Healthcare Solutions', 'healthcare-sol', 'Healthcare industry client', 'info@healthcaresol.com');

-- Sample policies and standards
INSERT INTO public.documents (title, description, document_type, status, author_id, category) VALUES
  ('Data Privacy Policy', 'Company-wide data privacy and protection policy', 'policy', 'active', (SELECT id FROM auth.users LIMIT 1), 'Privacy'),
  ('Security Standards', 'Information security standards and guidelines', 'standard', 'active', (SELECT id FROM auth.users LIMIT 1), 'Security'),
  ('HR Handbook', 'Human resources policies and procedures', 'policy', 'active', (SELECT id FROM auth.users LIMIT 1), 'HR'),
  ('Quality Management Standard', 'ISO 9001 quality management standards', 'standard', 'active', (SELECT id FROM auth.users LIMIT 1), 'Quality');