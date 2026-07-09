INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'ruhul.spify@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;