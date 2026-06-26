DROP FUNCTION IF EXISTS public.resolve_public_stream_url(uuid);

-- Public visitors need to read the active free/ad stream row so the player can render.
-- Column grant excludes admin-only fields such as created_by and updated_at.
GRANT SELECT (id, fixture_id, label, stream_type, quality, url, is_active, link_mode, created_at)
ON public.match_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_streams TO authenticated;
GRANT ALL ON public.match_streams TO service_role;

DROP POLICY IF EXISTS "Anon view public stream metadata" ON public.match_streams;
DROP POLICY IF EXISTS "Anon view public streams" ON public.match_streams;
CREATE POLICY "Anon view public streams"
ON public.match_streams
FOR SELECT
TO anon
USING (
  is_active = true
  AND link_mode <> 'premium'
  AND EXISTS (
    SELECT 1
    FROM public.match_access ma
    WHERE ma.fixture_id = match_streams.fixture_id
      AND ma.access IN ('free', 'ads', 'mix')
      AND (ma.available_from IS NULL OR ma.available_from <= now())
  )
);

DROP POLICY IF EXISTS "Users view streams they can access" ON public.match_streams;
CREATE POLICY "Users view streams they can access"
ON public.match_streams
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.match_access ma
    WHERE ma.fixture_id = match_streams.fixture_id
      AND (ma.available_from IS NULL OR ma.available_from <= now())
      AND (
        (
          ma.access IN ('free', 'ads')
          AND match_streams.link_mode <> 'premium'
        )
        OR (
          ma.access = 'mix'
          AND match_streams.link_mode <> 'premium'
        )
        OR (
          (ma.access IN ('premium', 'paid') OR (ma.access = 'mix' AND match_streams.link_mode = 'premium'))
          AND EXISTS (
            SELECT 1
            FROM public.match_purchases mp
            WHERE mp.user_id = auth.uid()
              AND mp.fixture_id = match_streams.fixture_id
              AND mp.status = 'paid'
              AND mp.created_at > (now() - interval '24 hours')
          )
        )
      )
  )
);