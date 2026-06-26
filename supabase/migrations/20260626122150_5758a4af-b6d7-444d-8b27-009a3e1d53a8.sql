-- Allow the public server/client role to read only non-sensitive metadata needed
-- to render the player button. Do not grant url here.
GRANT SELECT (id, fixture_id, label, stream_type, quality, is_active, link_mode, created_at)
ON public.match_streams TO anon;

-- Keep authenticated users able to read/manage rows through the existing RLS rules.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_streams TO authenticated;
GRANT ALL ON public.match_streams TO service_role;

-- Public metadata policy for streams that are explicitly public through match_access.
-- This does not expose premium-only streams.
DROP POLICY IF EXISTS "Anon view public stream metadata" ON public.match_streams;
CREATE POLICY "Anon view public stream metadata"
ON public.match_streams
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.match_access ma
    WHERE ma.fixture_id = match_streams.fixture_id
      AND ma.access IN ('free', 'ads', 'mix')
      AND (ma.available_from IS NULL OR ma.available_from <= now())
  )
);

-- Server helper for the stream proxy to resolve a playable URL by id.
-- It returns URLs only for active public/free/ad-supported/mix streams.
CREATE OR REPLACE FUNCTION public.resolve_public_stream_url(_stream_id uuid)
RETURNS TABLE(url text, stream_type text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ms.url, ms.stream_type, ms.is_active
  FROM public.match_streams ms
  WHERE ms.id = _stream_id
    AND ms.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.match_access ma
      WHERE ma.fixture_id = ms.fixture_id
        AND ma.access IN ('free', 'ads', 'mix')
        AND (ma.available_from IS NULL OR ma.available_from <= now())
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolve_public_stream_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_stream_url(uuid) TO anon, authenticated, service_role;