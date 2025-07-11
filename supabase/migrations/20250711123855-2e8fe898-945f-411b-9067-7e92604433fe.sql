-- Manually assign super_admin role to the admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('dc8208ae-89b5-4541-8d02-318394fc62fa', 'super_admin'::user_role)
ON CONFLICT (user_id, role) DO NOTHING;