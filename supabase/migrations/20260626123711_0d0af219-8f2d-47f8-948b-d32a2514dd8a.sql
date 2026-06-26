
ALTER PUBLICATION supabase_realtime DROP TABLE public.match_streams;

ALTER TABLE public.client_queries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS client_queries_user_id_idx ON public.client_queries(user_id);

DROP POLICY IF EXISTS "anyone submit query" ON public.client_queries;

CREATE POLICY "authenticated submit query" ON public.client_queries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(COALESCE(name,'')) > 0
    AND length(COALESCE(email,'')) > 0
    AND length(COALESCE(subject,'')) > 0
    AND length(COALESCE(message,'')) >= 5
  );

CREATE POLICY "anon submit query" ON public.client_queries
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND length(COALESCE(name,'')) > 0
    AND length(COALESCE(email,'')) > 0
    AND length(COALESCE(subject,'')) > 0
    AND length(COALESCE(message,'')) >= 5
  );

CREATE POLICY "users read own queries" ON public.client_queries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
