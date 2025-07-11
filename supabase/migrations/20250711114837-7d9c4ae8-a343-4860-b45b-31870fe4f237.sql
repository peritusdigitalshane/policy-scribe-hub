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
    VALUES (NEW.id, 'super_admin'::user_role);
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