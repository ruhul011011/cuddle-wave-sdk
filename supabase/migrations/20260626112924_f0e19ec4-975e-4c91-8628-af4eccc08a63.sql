DROP POLICY IF EXISTS "Anon view free streams" ON public.match_streams;
REVOKE SELECT ON public.match_streams FROM anon;