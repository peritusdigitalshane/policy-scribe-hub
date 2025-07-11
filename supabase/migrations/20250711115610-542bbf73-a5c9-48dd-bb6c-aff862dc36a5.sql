-- Let's simplify and create a manual super admin account
-- First, let's check what's in the database and clean up

-- Remove any existing admin profile that might be causing conflicts
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'admin@policyregister.com'
);
DELETE FROM public.profiles WHERE email = 'admin@policyregister.com';

-- Create a function to manually set up super admin after account creation
CREATE OR REPLACE FUNCTION public.setup_manual_super_admin(admin_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'super_admin'::user_role)
  ON CONFLICT DO NOTHING;
$$;