import { createFileRoute } from "@tanstack/react-router";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "worldcuptv",
          authFlow: "direct-google-oauth-v2",
          checkedAt: new Date().toISOString(),
          env: {
            SUPABASE_URL: hasEnv("SUPABASE_URL"),
            SUPABASE_PUBLISHABLE_KEY: hasEnv("SUPABASE_PUBLISHABLE_KEY"),
            VITE_SUPABASE_URL: hasEnv("VITE_SUPABASE_URL"),
            VITE_SUPABASE_PUBLISHABLE_KEY: hasEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
            SUPABASE_SERVICE_ROLE_KEY: hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
            API_FOOTBALL_KEY: hasEnv("API_FOOTBALL_KEY"),
            STRIPE_SECRET_KEY: hasEnv("STRIPE_SECRET_KEY"),
            STRIPE_WEBHOOK_SECRET: hasEnv("STRIPE_WEBHOOK_SECRET"),
          },
        });
      },
    },
  },
});