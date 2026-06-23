
DROP POLICY IF EXISTS "anyone submit query" ON public.client_queries;
CREATE POLICY "anyone submit query" ON public.client_queries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(name,'')) > 0
    AND length(coalesce(email,'')) > 0
    AND length(coalesce(subject,'')) > 0
    AND length(coalesce(message,'')) >= 5
  );
