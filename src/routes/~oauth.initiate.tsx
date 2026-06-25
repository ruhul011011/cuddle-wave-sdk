import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/~oauth/initiate")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    provider: typeof search.provider === "string" ? search.provider : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
  }),
  component: OAuthInitiateCompatibility,
});

function OAuthInitiateCompatibility() {
  const search = Route.useSearch();
  const [message, setMessage] = useState("Redirecting to Google…");

  useEffect(() => {
    let cancelled = false;

    async function startGoogleOAuth() {
      if (search.provider && search.provider !== "google") {
        window.location.replace("/auth");
        return;
      }

      try {
        sessionStorage.setItem("postAuthRedirect", sanitizeRedirectPath(search.redirect_uri));
      } catch {
        // ignore storage failures
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (!cancelled && error) {
        setMessage(error.message || "Google sign-in failed. Please try again.");
      }
    }

    startGoogleOAuth();
    return () => {
      cancelled = true;
    };
  }, [search.provider, search.redirect_uri]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link to="/auth" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

function sanitizeRedirectPath(value?: string) {
  if (!value) return "/";

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    // fall through
  }

  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}