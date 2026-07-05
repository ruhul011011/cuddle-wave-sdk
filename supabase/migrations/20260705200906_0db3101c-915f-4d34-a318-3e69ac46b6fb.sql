
REVOKE EXECUTE ON FUNCTION public.get_preview_streams(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_preview_streams(bigint) TO service_role;
