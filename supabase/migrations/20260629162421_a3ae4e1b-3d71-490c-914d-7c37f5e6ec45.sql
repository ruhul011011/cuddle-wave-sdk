-- Lock down user_roles writes: deny INSERT/UPDATE/DELETE to authenticated/anon; only service_role (or SECURITY DEFINER admin RPCs) can modify roles.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- Explicit deny policies for clarity and defense-in-depth
DROP POLICY IF EXISTS "No direct role inserts" ON public.user_roles;
CREATE POLICY "No direct role inserts" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "No direct role updates" ON public.user_roles;
CREATE POLICY "No direct role updates" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct role deletes" ON public.user_roles;
CREATE POLICY "No direct role deletes" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);

-- Lock down match_purchases writes: only service_role / SECURITY DEFINER backend can insert purchase records.
REVOKE INSERT, UPDATE, DELETE ON public.match_purchases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.match_purchases FROM anon;

DROP POLICY IF EXISTS "No direct purchase inserts" ON public.match_purchases;
CREATE POLICY "No direct purchase inserts" ON public.match_purchases
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "No direct purchase updates" ON public.match_purchases;
CREATE POLICY "No direct purchase updates" ON public.match_purchases
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct purchase deletes" ON public.match_purchases;
CREATE POLICY "No direct purchase deletes" ON public.match_purchases
  FOR DELETE TO authenticated, anon USING (false);

COMMENT ON TABLE public.match_purchases IS 'Purchase records are inserted exclusively by trusted server code (Stripe webhook using service role). Client roles cannot insert, update, or delete.';
COMMENT ON TABLE public.user_roles IS 'Role assignments are managed exclusively by admin SECURITY DEFINER RPCs (admin_grant_admin_by_email, admin_revoke_admin). Client roles cannot insert, update, or delete directly.';
