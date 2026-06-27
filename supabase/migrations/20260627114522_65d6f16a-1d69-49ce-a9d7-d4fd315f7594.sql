
-- Allow active subscription to grant premium access to all premium fixtures
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
      AND plan <> 'free'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_visible_streams(_fixture_id bigint)
 RETURNS TABLE(id uuid, fixture_id bigint, label text, stream_type text, quality text, url text, is_active boolean, link_mode text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _access text;
  _avail timestamptz;
  _has_access boolean := false;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT ma.access, ma.available_from INTO _access, _avail
  FROM public.match_access ma WHERE ma.fixture_id = _fixture_id;

  IF _access IS NULL THEN _access := 'free'; END IF;
  IF _access = 'paid' THEN _access := 'premium'; END IF;
  IF _avail IS NOT NULL AND _avail > now() THEN RETURN; END IF;

  IF _access IN ('premium','mix') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.match_purchases mp
      WHERE mp.user_id = _uid AND mp.fixture_id = _fixture_id AND mp.status = 'paid'
    ) OR public.has_active_subscription(_uid)
    INTO _has_access;
  END IF;

  IF _access = 'premium' AND NOT _has_access THEN RETURN; END IF;

  RETURN QUERY
    SELECT s.id, s.fixture_id, s.label, s.stream_type::text, s.quality,
           s.url, s.is_active, s.link_mode::text
    FROM public.match_streams s
    WHERE s.fixture_id = _fixture_id
      AND s.is_active = true
      AND (_access <> 'mix' OR _has_access OR s.link_mode <> 'premium')
    ORDER BY s.created_at ASC;
END;
$function$;

-- Admin grant/revoke premium subscription
CREATE OR REPLACE FUNCTION public.admin_grant_premium(_user_id uuid, _months integer, _plan text DEFAULT 'premium')
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.subscriptions;
  _new_end timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _row FROM public.subscriptions WHERE user_id = _user_id;
  _new_end := GREATEST(COALESCE(_row.current_period_end, now()), now()) + make_interval(months => _months);

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (_user_id, _plan, 'active', _new_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_premium(uuid, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_premium(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_premium(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.subscriptions
     SET status = 'canceled', plan = 'free', current_period_end = now(), updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_premium(uuid) TO authenticated;

-- Admin listing of subscriptions with emails
CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE(user_id uuid, email text, plan text, status text, current_period_end timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT s.user_id, u.email::text, s.plan, s.status, s.current_period_end, s.updated_at
    FROM public.subscriptions s
    JOIN auth.users u ON u.id = s.user_id
    ORDER BY s.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated;
