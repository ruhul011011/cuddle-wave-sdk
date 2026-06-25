import { createFileRoute } from "@tanstack/react-router";

function getBackendUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.PUBLIC_SUPABASE_URL?.trim()
  );
}

function sanitizeRedirectPath(value: string | null, origin: string) {
  if (!value) return "/";

  try {
    const url = new URL(value, origin);
    if (url.origin === origin) return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    // fall through
  }

  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export const Route = createFileRoute("/api/public/oauth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const backendUrl = getBackendUrl();

        if (!backendUrl) {
          return Response.redirect(`${url.origin}/auth?oauth_error=missing_backend_url`, 302);
        }

        const redirectPath = sanitizeRedirectPath(url.searchParams.get("redirect"), url.origin);
        const callbackUrl = new URL(`${url.origin}/auth/callback`);
        callbackUrl.searchParams.set("redirect", redirectPath);

        const authorizeUrl = new URL("/auth/v1/authorize", backendUrl);
        authorizeUrl.searchParams.set("provider", "google");
        authorizeUrl.searchParams.set("redirect_to", callbackUrl.toString());

        return Response.redirect(authorizeUrl.toString(), 302);
      },
    },
  },
});