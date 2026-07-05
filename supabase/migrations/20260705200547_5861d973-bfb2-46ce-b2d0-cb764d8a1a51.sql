
CREATE OR REPLACE FUNCTION public.get_preview_streams(_fixture_id bigint)
 RETURNS TABLE(id uuid, fixture_id bigint, label text, stream_type text, quality text, url text, is_active boolean, link_mode text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _avail timestamptz;
BEGIN
  SELECT ma.available_from INTO _avail
  FROM public.match_access ma WHERE ma.fixture_id = _fixture_id;

  IF _avail IS NOT NULL AND _avail > now() THEN RETURN; END IF;

  RETURN QUERY
    SELECT s.id, s.fixture_id, s.label, s.stream_type::text, s.quality,
           s.url, s.is_active, s.link_mode::text
    FROM public.match_streams s
    WHERE s.fixture_id = _fixture_id
      AND s.is_active = true
    ORDER BY s.created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_preview_streams(bigint) TO anon, authenticated;
