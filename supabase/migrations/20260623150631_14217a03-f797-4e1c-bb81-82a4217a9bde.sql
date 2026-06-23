
DROP POLICY IF EXISTS "Authenticated users view active streams" ON public.match_streams;

CREATE POLICY "Users view streams they can access"
ON public.match_streams
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.match_access ma
      WHERE ma.fixture_id = match_streams.fixture_id
        AND ma.access = 'paid'
    )
    OR EXISTS (
      SELECT 1 FROM public.match_purchases mp
      WHERE mp.user_id = auth.uid()
        AND mp.fixture_id = match_streams.fixture_id
        AND mp.status = 'paid'
    )
  )
);
