REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_visible_streams(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visible_streams(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visible_streams(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.list_app_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_app_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO authenticated;

REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM anon;
REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM authenticated;