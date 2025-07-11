-- Complete super admin setup - everything except the auth account
-- This will be ready when you create the auth user

-- Clean up any existing data
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'admin@policyregister.com'
);
DELETE FROM public.profiles WHERE email = 'admin@policyregister.com';

-- Create the profile that will be linked when auth user is created
-- Using a placeholder UUID that will be replaced when real user is created
INSERT INTO public.profiles (id, email, first_name, last_name, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@policyregister.com',
  'Super',
  'Admin',
  true
);

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Delete placeholder profile if it exists
  DELETE FROM public.profiles WHERE email = NEW.email AND id = '00000000-0000-0000-0000-000000000000'::uuid;
  
  -- Insert the real profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Super'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  
  -- Auto-promote admin email to super admin
  IF NEW.email = 'admin@policyregister.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::user_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;