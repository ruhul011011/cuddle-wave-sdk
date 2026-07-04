import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Football News — Yalla Football Live" },
      { name: "description", content: "Latest football news, match previews, transfers, and analysis." },
      { property: "og:title", content: "Football News — Yalla Football Live" },
      { property: "og:description", content: "Latest football news, match previews, transfers, and analysis." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: () => <Outlet />,
});
