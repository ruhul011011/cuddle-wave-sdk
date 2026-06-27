
-- List all admin users (id, email, created_at, last_sign_in_at)
CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id
  WHERE r.role = 'admin'
  ORDER BY u.email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_admins() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;

-- Grant the admin role to an existing user identified by email
CREATE OR REPLACE FUNCTION public.admin_grant_admin_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %. They must sign in at least once first.', _email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_admin_by_email(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_admin_by_email(text) TO authenticated;

-- Revoke admin role from a user (cannot revoke yourself)
CREATE OR REPLACE FUNCTION public.admin_revoke_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role.';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) TO authenticated;
