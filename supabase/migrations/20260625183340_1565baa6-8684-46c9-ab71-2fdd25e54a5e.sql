REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_active_stream_fixture(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_active_stream_fixture() TO service_role;