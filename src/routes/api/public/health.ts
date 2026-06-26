import { createFileRoute } from "@tanstack/react-router";

// Public liveness probe. Intentionally minimal — do not leak environment
// configuration or internal version strings to unauthenticated callers.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true }),
    },
  },
});
