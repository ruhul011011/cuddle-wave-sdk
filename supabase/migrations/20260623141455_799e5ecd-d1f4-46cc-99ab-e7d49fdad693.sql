-- Fix: privilege escalation risk on user_roles — ensure no write grants to anon/authenticated
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Explicit deny policies are unnecessary (default deny applies), but enforce no write policies exist
DROP POLICY IF EXISTS "Users insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users delete own roles" ON public.user_roles;

-- Fix: stream URLs publicly readable — require authentication to view streams
DROP POLICY IF EXISTS "Anyone can view active streams" ON public.match_streams;
REVOKE SELECT ON public.match_streams FROM anon;
CREATE POLICY "Authenticated users view active streams" ON public.match_streams
  FOR SELECT TO authenticated
  USING (is_active = true);