CREATE OR REPLACE FUNCTION public.get_visible_streams(_fixture_id bigint)
 RETURNS TABLE(id uuid, fixture_id bigint, label text, stream_type text, quality text, url text, is_active boolean, link_mode text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _access text;
  _avail timestamptz;
  _has_access boolean := false;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT ma.access, ma.available_from INTO _access, _avail
  FROM public.match_access ma WHERE ma.fixture_id = _fixture_id;

  IF _access IS NULL THEN _access := 'free'; END IF;
  IF _access = 'paid' THEN _access := 'premium'; END IF;
  IF _avail IS NOT NULL AND _avail > now() THEN RETURN; END IF;

  IF _access IN ('premium','mix') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.match_purchases mp
      WHERE mp.user_id = _uid AND mp.fixture_id = _fixture_id AND mp.status = 'paid'
    ) OR public.has_active_subscription(_uid)
    INTO _has_access;
  END IF;

  IF _access = 'premium' AND NOT _has_access THEN RETURN; END IF;

  RETURN QUERY
    SELECT s.id, s.fixture_id, s.label, s.stream_type::text, s.quality,
           s.url, s.is_active, s.link_mode::text
    FROM public.match_streams s
    WHERE s.fixture_id = _fixture_id
      AND s.is_active = true
      AND (_access <> 'mix' OR _has_access OR s.link_mode <> 'premium')
    ORDER BY s.created_at ASC;
END;
$function$;