
-- 1. Revoke public/anon EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_grant_premium(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_premium(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_subscriptions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;

-- 2. Tighten site_settings public read policy to known-safe keys
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Public can view safe site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('telegram_username', 'telegram_join_url'));
