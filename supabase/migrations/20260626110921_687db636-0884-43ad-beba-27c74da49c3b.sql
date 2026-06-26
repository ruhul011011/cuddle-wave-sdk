DROP TRIGGER IF EXISTS trg_sync_active_stream_fixture ON public.match_streams;
CREATE TRIGGER trg_sync_active_stream_fixture
AFTER INSERT OR UPDATE OF fixture_id, is_active OR DELETE ON public.match_streams
FOR EACH ROW
EXECUTE FUNCTION public.sync_active_stream_fixture();

INSERT INTO public.active_stream_fixtures (fixture_id, updated_at)
SELECT fixture_id, now()
FROM public.match_streams
WHERE is_active = true
GROUP BY fixture_id
ON CONFLICT (fixture_id) DO UPDATE SET updated_at = excluded.updated_at;

DELETE FROM public.active_stream_fixtures af
WHERE NOT EXISTS (
  SELECT 1
  FROM public.match_streams ms
  WHERE ms.fixture_id = af.fixture_id
    AND ms.is_active = true
);