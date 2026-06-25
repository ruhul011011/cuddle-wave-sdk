DROP FUNCTION IF EXISTS public.list_active_stream_fixture_ids();

CREATE TABLE IF NOT EXISTS public.active_stream_fixtures (
  fixture_id bigint PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.active_stream_fixtures TO anon, authenticated;
GRANT ALL ON public.active_stream_fixtures TO service_role;

ALTER TABLE public.active_stream_fixtures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active stream fixture ids" ON public.active_stream_fixtures;
CREATE POLICY "Anyone can view active stream fixture ids"
ON public.active_stream_fixtures
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.refresh_active_stream_fixture(_fixture_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.match_streams
    WHERE fixture_id = _fixture_id
      AND is_active = true
  ) THEN
    INSERT INTO public.active_stream_fixtures (fixture_id, updated_at)
    VALUES (_fixture_id, now())
    ON CONFLICT (fixture_id) DO UPDATE SET updated_at = excluded.updated_at;
  ELSE
    DELETE FROM public.active_stream_fixtures WHERE fixture_id = _fixture_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_active_stream_fixture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_active_stream_fixture(OLD.fixture_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_active_stream_fixture(NEW.fixture_id);
  IF TG_OP = 'UPDATE' AND OLD.fixture_id IS DISTINCT FROM NEW.fixture_id THEN
    PERFORM public.refresh_active_stream_fixture(OLD.fixture_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_active_stream_fixtures ON public.match_streams;
CREATE TRIGGER sync_active_stream_fixtures
AFTER INSERT OR UPDATE OR DELETE ON public.match_streams
FOR EACH ROW EXECUTE FUNCTION public.sync_active_stream_fixture();

TRUNCATE public.active_stream_fixtures;
INSERT INTO public.active_stream_fixtures (fixture_id, updated_at)
SELECT fixture_id, max(updated_at)
FROM public.match_streams
WHERE is_active = true
GROUP BY fixture_id
ON CONFLICT (fixture_id) DO UPDATE SET updated_at = excluded.updated_at;