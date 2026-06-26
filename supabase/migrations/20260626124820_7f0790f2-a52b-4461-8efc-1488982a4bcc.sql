-- Revoke any anon access to match_streams; only authenticated/service can read.
REVOKE SELECT ON public.match_streams FROM anon;

-- Drop any leftover anon policies
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='match_streams'
      AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.match_streams', p.policyname);
  END LOOP;
END $$;