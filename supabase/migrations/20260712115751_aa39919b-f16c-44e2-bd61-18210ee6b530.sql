
REVOKE EXECUTE ON FUNCTION public.get_preview_streams(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_preview_streams(bigint) TO authenticated;
