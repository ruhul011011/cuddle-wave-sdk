DROP FUNCTION IF EXISTS public.list_app_users();

CREATE FUNCTION public.list_app_users()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  roles text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
    SELECT
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      COALESCE(
        array_agg(ur.role::text ORDER BY ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
        ARRAY[]::text[]
      ) AS roles
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
    ORDER BY u.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_app_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_app_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO authenticated;