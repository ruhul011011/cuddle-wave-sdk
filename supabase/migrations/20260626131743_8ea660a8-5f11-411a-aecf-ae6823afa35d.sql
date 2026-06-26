
-- 1) Tighten match_streams: remove broad authenticated SELECT, keep admin-only.
DROP POLICY IF EXISTS "Users view streams they can access" ON public.match_streams;
DROP POLICY IF EXISTS "Authenticated view streams" ON public.match_streams;
DROP POLICY IF EXISTS "Anon view free streams" ON public.match_streams;

-- Ensure admin-only SELECT policy exists (admins still manage via dashboard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='match_streams' AND policyname='Admins can select streams'
  ) THEN
    CREATE POLICY "Admins can select streams" ON public.match_streams
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

REVOKE SELECT ON public.match_streams FROM anon;

-- 2) SECURITY DEFINER function that enforces access rules and returns rows.
CREATE OR REPLACE FUNCTION public.get_visible_streams(_fixture_id bigint)
RETURNS TABLE (
  id uuid,
  fixture_id bigint,
  label text,
  stream_type text,
  quality text,
  url text,
  is_active boolean,
  link_mode text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _access text;
  _avail timestamptz;
  _has_purchase boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  SELECT ma.access, ma.available_from
    INTO _access, _avail
  FROM public.match_access ma
  WHERE ma.fixture_id = _fixture_id;

  IF _access IS NULL THEN _access := 'free'; END IF;
  IF _access = 'paid' THEN _access := 'premium'; END IF;

  IF _avail IS NOT NULL AND _avail > now() THEN
    RETURN;
  END IF;

  IF _access IN ('premium','mix') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.match_purchases mp
      WHERE mp.user_id = _uid
        AND mp.fixture_id = _fixture_id
        AND mp.status = 'paid'
    ) INTO _has_purchase;
  END IF;

  IF _access = 'premium' AND NOT _has_purchase THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT s.id, s.fixture_id, s.label, s.stream_type::text, s.quality,
           s.url, s.is_active, s.link_mode::text
    FROM public.match_streams s
    WHERE s.fixture_id = _fixture_id
      AND s.is_active = true
      AND (
        _access <> 'mix'
        OR _has_purchase
        OR s.link_mode <> 'premium'
      )
    ORDER BY s.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_visible_streams(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.get_visible_streams(bigint) TO authenticated;
