import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseEnvDiagnostics } from "@/lib/env-check.server";

// Public liveness probe. Includes safe auth-env diagnostics for self-hosted
// deployments: no private secrets are returned, only project refs and masked keys.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const authEnv = getSupabaseEnvDiagnostics();
        return Response.json({ ok: true, authEnv });
      },
    },
  },
});
