GRANT SELECT ON public.match_streams TO anon;
GRANT SELECT ON public.match_access TO anon;
GRANT SELECT ON public.active_stream_fixtures TO anon;

CREATE POLICY "Anon view free streams"
ON public.match_streams
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.match_access ma
    WHERE ma.fixture_id = match_streams.fixture_id
      AND ma.access = ANY (ARRAY['free'::text, 'ads'::text, 'mix'::text])
  )
);

CREATE POLICY "Anon view match access"
ON public.match_access
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon view active fixtures"
ON public.active_stream_fixtures
FOR SELECT
TO anon
USING (true);