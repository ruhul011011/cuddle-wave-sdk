GRANT SELECT ON public.active_stream_fixtures TO anon, authenticated;
GRANT ALL ON public.active_stream_fixtures TO service_role;

-- Backfill in case the trigger missed any currently-active streams
INSERT INTO public.active_stream_fixtures (fixture_id, updated_at)
SELECT DISTINCT fixture_id, now() FROM public.match_streams WHERE is_active = true
ON CONFLICT (fixture_id) DO UPDATE SET updated_at = now();