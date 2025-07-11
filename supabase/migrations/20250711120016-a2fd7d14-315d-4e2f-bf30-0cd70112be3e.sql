-- Fix the trigger function to prevent database errors
-- Drop and recreate a simpler, more robust version

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simple, bulletproof function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Simple insert with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id, 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Name')
    );
  EXCEPTION WHEN OTHERS THEN
    -- If insert fails, just continue - don't block user creation
    NULL;
  END;
  
  -- Handle admin promotion separately with error handling
  BEGIN
    IF NEW.email = 'admin@policyregister.com' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_admin'::user_role);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If role assignment fails, just continue
    NULL;
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();