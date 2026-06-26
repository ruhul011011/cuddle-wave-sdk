import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const search = Route.useSearch();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Supabase JS auto-parses the OAuth code/hash on load. Wait for a session,
      // then redirect to the originally requested path.
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          let target = "/";
          if (search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//")) {
            target = search.redirect;
          }
          try {
            const saved = sessionStorage.getItem("postAuthRedirect");
            if (saved && saved.startsWith("/")) target = saved;
            sessionStorage.removeItem("postAuthRedirect");
          } catch {
            // ignore
          }
          window.location.replace(target);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) {
        setMessage("Sign-in failed or timed out. Redirecting to sign-in…");
        setTimeout(() => window.location.replace("/auth"), 1500);
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
