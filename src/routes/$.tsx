import { useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: CatchAllPage,
});

function CatchAllPage() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  useEffect(() => {
    if (pathname !== "/~oauth/initiate") return;

    const search = new URLSearchParams(router.state.location.searchStr);
    const provider = search.get("provider") || "google";
    const redirectUri = search.get("redirect_uri");

    if (provider !== "google") {
      window.location.replace("/auth");
      return;
    }

    try {
      sessionStorage.setItem("postAuthRedirect", sanitizeRedirectPath(redirectUri));
    } catch {
      // ignore storage failures
    }

    window.location.replace(`/api/public/oauth/google?redirect=${encodeURIComponent(sanitizeRedirectPath(redirectUri))}`);
  }, [pathname, router.state.location.searchStr]);

  if (pathname === "/~oauth/initiate") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">Redirecting to Google…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function sanitizeRedirectPath(value: string | null) {
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