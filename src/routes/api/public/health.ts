import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseEnvDiagnostics } from "@/lib/env-check.server";
import { getServerEnv } from "@/lib/env.server";

// Public liveness probe. Includes safe auth-env diagnostics for self-hosted
// deployments: no private secrets are returned, only project refs and masked keys.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const authEnv = getSupabaseEnvDiagnostics();
        const stripeSecret = getServerEnv("STRIPE_SECRET_KEY");
        const stripeWebhook = getServerEnv("STRIPE_WEBHOOK_SECRET");
        const stripe = {
          STRIPE_SECRET_KEY: Boolean(stripeSecret),
          STRIPE_SECRET_KEY_prefix: stripeSecret ? stripeSecret.slice(0, 7) : null,
          STRIPE_WEBHOOK_SECRET: Boolean(stripeWebhook),
          API_FOOTBALL_KEY: Boolean(getServerEnv("API_FOOTBALL_KEY")),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(getServerEnv("SUPABASE_SERVICE_ROLE_KEY")),
        };
        return Response.json({ ok: true, authEnv, stripe });
      },
    },
  },
});
