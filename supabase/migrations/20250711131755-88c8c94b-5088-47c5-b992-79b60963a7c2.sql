-- Update admin email from PolicyRegister to GovernanceHub rebrand
-- Update the handle_new_user function to use the new admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  
  -- Handle admin promotion with new email
  BEGIN
    IF NEW.email = 'admin@governancehub.com' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_admin'::user_role);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If role assignment fails, just continue
    NULL;
  END;
  
  RETURN NEW;
END;
$function$;