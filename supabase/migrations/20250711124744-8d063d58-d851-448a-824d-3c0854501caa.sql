-- Create system settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage system settings
CREATE POLICY "Super admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (is_super_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default magic link settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('magic_link_default_expiry_days', '30', 'Default expiration time for magic links in days'),
('magic_link_max_views_default', 'null', 'Default maximum views for magic links (null = unlimited)'),
('magic_link_enabled', 'true', 'Whether magic link creation is enabled system-wide'),
('pdf_viewer_security_level', '"high"', 'Security level for PDF viewing (low, medium, high)'),
('max_file_size_mb', '50', 'Maximum file size for uploads in MB'),
('allowed_file_types', '["pdf"]', 'Allowed file types for document uploads')
ON CONFLICT (setting_key) DO NOTHING;