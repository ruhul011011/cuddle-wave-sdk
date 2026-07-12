import { createFileRoute } from "@tanstack/react-router";

// Public liveness probe. Diagnostics that reveal which backend secrets are
// configured are intentionally NOT returned here — that information helps
// attackers map the attack surface. Admin diagnostics live behind auth.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true }),
    },
  },
});
