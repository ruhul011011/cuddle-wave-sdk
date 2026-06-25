CREATE OR REPLACE FUNCTION public.list_active_stream_fixture_ids()
RETURNS TABLE(fixture_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ms.fixture_id
  FROM public.match_streams ms
  WHERE ms.is_active = true
  ORDER BY ms.fixture_id;
$$;

REVOKE ALL ON FUNCTION public.list_active_stream_fixture_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_stream_fixture_ids() TO anon, authenticated, service_role;