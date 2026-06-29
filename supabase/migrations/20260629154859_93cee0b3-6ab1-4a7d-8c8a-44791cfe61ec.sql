DROP POLICY IF EXISTS "anyone read notifications" ON public.notifications;

CREATE POLICY "anon reads only public notifications"
  ON public.notifications FOR SELECT
  TO anon
  USING (audience = 'all');

CREATE POLICY "authenticated reads allowed notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    audience = 'all'
    OR (audience = 'premium' AND public.has_active_subscription(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

REVOKE SELECT ON public.notifications FROM anon;
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.notifications TO authenticated;