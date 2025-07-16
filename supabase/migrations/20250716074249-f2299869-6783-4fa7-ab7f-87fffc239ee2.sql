-- Create categories table for document organization
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for document categories
CREATE POLICY "Everyone can view active categories" 
ON public.document_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage all categories" 
ON public.document_categories 
FOR ALL 
USING (is_super_admin());

-- Add foreign key to documents table
ALTER TABLE public.documents 
ADD COLUMN category_id UUID REFERENCES public.document_categories(id);

-- Create index for better performance
CREATE INDEX idx_documents_category_id ON public.documents(category_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_document_categories_updated_at
BEFORE UPDATE ON public.document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories
INSERT INTO public.document_categories (name, description, color, icon) VALUES
('Policies', 'Company policies and procedures', '#3B82F6', 'shield-check'),
('ISO Standards', 'ISO compliance and standards', '#10B981', 'award'),
('Cyber Security', 'Cybersecurity protocols and guidelines', '#EF4444', 'shield'),
('Privacy', 'Data privacy and protection documents', '#8B5CF6', 'lock'),
('Quality Management', 'Quality assurance and management', '#F59E0B', 'star'),
('Training Materials', 'Employee training and development', '#06B6D4', 'graduation-cap'),
('Compliance', 'Regulatory compliance documents', '#84CC16', 'check-circle'),
('Risk Management', 'Risk assessment and management', '#F97316', 'alert-triangle');