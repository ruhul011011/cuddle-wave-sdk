DROP POLICY IF EXISTS "Users view streams they can access" ON public.match_streams;

CREATE POLICY "Users view streams they can access"
ON public.match_streams
FOR SELECT
USING (
  is_active = true
  AND (
    EXISTS (
      SELECT 1 FROM public.match_access ma
      WHERE ma.fixture_id = match_streams.fixture_id
        AND ma.access IN ('free', 'ads', 'mix', 'premium')
    )
    OR EXISTS (
      SELECT 1 FROM public.match_purchases mp
      WHERE mp.user_id = auth.uid()
        AND mp.fixture_id = match_streams.fixture_id
        AND mp.status = 'paid'
        AND mp.created_at > (now() - interval '24 hours')
    )
  )
);