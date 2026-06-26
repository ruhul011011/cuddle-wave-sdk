import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const { hasServerEnv } = await import("@/lib/env.server");
        return Response.json({
          ok: true,
          service: "worldcuptv",
          authFlow: "v13-auth-required-streams",
          checkedAt: new Date().toISOString(),
          env: {
            SUPABASE_URL: hasServerEnv("SUPABASE_URL"),
            SUPABASE_PUBLISHABLE_KEY: hasServerEnv("SUPABASE_PUBLISHABLE_KEY"),
            VITE_SUPABASE_URL: hasServerEnv("VITE_SUPABASE_URL"),
            VITE_SUPABASE_PUBLISHABLE_KEY: hasServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
            SUPABASE_SERVICE_ROLE_KEY: hasServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
            API_FOOTBALL_KEY: hasServerEnv("API_FOOTBALL_KEY"),
            STRIPE_SECRET_KEY: hasServerEnv("STRIPE_SECRET_KEY"),
            STRIPE_WEBHOOK_SECRET: hasServerEnv("STRIPE_WEBHOOK_SECRET"),
            STREAM_SIGNING_SECRET: hasServerEnv("STREAM_SIGNING_SECRET"),
          },
        });
      },
    },
  },
});