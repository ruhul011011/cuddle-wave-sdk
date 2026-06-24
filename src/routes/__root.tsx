import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "World Cup TV — Watch FIFA World Cup 2026 Live TV Online Free in HD" },
      { name: "description", content: "World Cup TV is the #1 place to watch the FIFA World Cup 2026 live in HD. Free World Cup live TV streaming, fixtures, schedule, groups and points table." },
      { name: "keywords", content: "World Cup Live TV, World Cup TV, World Cup TV 2026, FIFA World Cup 2026, Watch World Cup Live, World Cup Live Streaming, World Cup 2026 Live, World Cup Online TV, Football Live TV, World Cup HD Streaming" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "google-site-verification", content: "5YWLez48JOIO95ILOd7kFEFNXL5lh6Fbbjt4UlZ7tyE" },
      { name: "author", content: "World Cup TV" },
      { name: "application-name", content: "World Cup TV" },
      { name: "theme-color", content: "#0b0f1a" },
      { property: "og:site_name", content: "World Cup TV" },
      { property: "og:title", content: "World Cup TV — Watch FIFA World Cup 2026 Live in HD" },
      { property: "og:description", content: "Free live TV streaming of every FIFA World Cup 2026 match. Schedule, groups, points table and highlights." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.worldcuptv.to/" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "World Cup TV — Watch FIFA World Cup 2026 Live in HD" },
      { name: "twitter:description", content: "Free World Cup Live TV. Watch every FIFA World Cup 2026 match in HD." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e5516a50-1e69-4b32-a78b-66838b44704f/id-preview-f3d36f9f--654303a2-7faa-4fa2-a9fc-6fa333a3cb6a.lovable.app-1782221691088.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e5516a50-1e69-4b32-a78b-66838b44704f/id-preview-f3d36f9f--654303a2-7faa-4fa2-a9fc-6fa333a3cb6a.lovable.app-1782221691088.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "World Cup TV",
          alternateName: ["World Cup Live TV", "World Cup TV 2026"],
          url: "https://www.worldcuptv.to/",
          description: "Watch the FIFA World Cup 2026 live in HD on World Cup TV — free live streaming, schedule, groups and points table.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.worldcuptv.to/schedule?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
