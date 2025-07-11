-- Drop the conflicting trigger first
DROP TRIGGER IF EXISTS auto_promote_admin_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.auto_promote_admin();

-- Update the existing handle_new_user function to include admin promotion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- If this is the admin email, make them super admin
  IF NEW.email = 'admin@policyregister.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::user_role);
  END IF;
  
  RETURN NEW;
END;
$$;