-- Data API grants so anon/authenticated can actually reach these tables.
GRANT SELECT ON public.match_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_streams TO authenticated;
GRANT ALL ON public.match_streams TO service_role;

GRANT SELECT ON public.match_access TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_access TO authenticated;
GRANT ALL ON public.match_access TO service_role;

GRANT SELECT ON public.active_stream_fixtures TO anon;
GRANT SELECT ON public.active_stream_fixtures TO authenticated;
GRANT ALL ON public.active_stream_fixtures TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_purchases TO authenticated;
GRANT ALL ON public.match_purchases TO service_role;