-- Create a super admin account
-- Note: You'll need to sign up with this email through the auth system

-- Insert a profile for the super admin (this will be linked when you sign up)
INSERT INTO public.profiles (id, email, first_name, last_name, is_active)
VALUES (
  gen_random_uuid(), 
  'admin@policyregister.com', 
  'Super', 
  'Admin', 
  true
) ON CONFLICT (email) DO NOTHING;

-- Create a function to auto-promote the admin email on signup
CREATE OR REPLACE FUNCTION public.auto_promote_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this is the admin email, make them super admin
  IF NEW.email = 'admin@policyregister.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-promote admin on profile creation
DROP TRIGGER IF EXISTS auto_promote_admin_trigger ON public.profiles;
CREATE TRIGGER auto_promote_admin_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_admin();