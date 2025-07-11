-- Create a function to make a user a super admin
CREATE OR REPLACE FUNCTION public.make_super_admin(user_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.user_roles (user_id, role)
  SELECT p.id, 'super_admin'::user_role
  FROM public.profiles p
  WHERE p.email = user_email
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'
  );
$$;

-- Create a function to check if any super admin exists
CREATE OR REPLACE FUNCTION public.has_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role = 'super_admin'
  );
$$;