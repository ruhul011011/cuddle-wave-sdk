GRANT SELECT ON public.active_stream_fixtures TO anon, authenticated;
GRANT ALL ON public.active_stream_fixtures TO service_role;
GRANT SELECT ON public.match_access TO anon, authenticated;
GRANT ALL ON public.match_access TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_streams TO authenticated;
GRANT ALL ON public.match_streams TO service_role;