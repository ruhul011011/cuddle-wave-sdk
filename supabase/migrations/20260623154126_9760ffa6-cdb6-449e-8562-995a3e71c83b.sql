CREATE TABLE public.stripe_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text,
  event_type text,
  status text NOT NULL,
  message text,
  fixture_id bigint,
  user_id uuid,
  stripe_session_id text,
  amount_cents integer,
  currency text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stripe_webhook_logs TO authenticated;
GRANT ALL ON public.stripe_webhook_logs TO service_role;

ALTER TABLE public.stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stripe webhook logs"
ON public.stripe_webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX stripe_webhook_logs_created_at_idx ON public.stripe_webhook_logs (created_at DESC);
