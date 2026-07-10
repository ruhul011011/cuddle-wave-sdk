
-- Lock down SECURITY DEFINER functions from anonymous execution.
-- Triggers/internal helpers: revoke from all app roles.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_active_stream_fixture() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_active_stream_fixture(bigint) FROM PUBLIC, anon, authenticated;

-- Role / subscription checks: used by RLS policies for signed-in users.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;

-- Stream visibility: signed-in users only (function early-returns for anon anyway).
REVOKE ALL ON FUNCTION public.get_visible_streams(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_streams(bigint) TO authenticated;

-- Preview streams: intentionally public for unauthenticated preview.
REVOKE ALL ON FUNCTION public.get_preview_streams(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_preview_streams(bigint) TO anon, authenticated;

-- Admin-only functions: only signed-in users, with in-function admin check.
REVOKE ALL ON FUNCTION public.list_app_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_admin_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_revoke_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_premium(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_premium(uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_revoke_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_premium(uuid) TO authenticated;
