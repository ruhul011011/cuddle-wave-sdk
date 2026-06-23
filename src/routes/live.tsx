import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { matches } from "@/lib/matches";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Football Streams — Football Streaming" },
      { name: "description", content: "Watch live football matches streaming right now in HD." },
      { property: "og:title", content: "Live Football Streams" },
      { property: "og:description", content: "Watch live football matches streaming right now in HD." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const live = matches.filter((m) => m.status === "live");
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="live-dot text-xs font-semibold uppercase tracking-[0.2em] text-live">Live Now</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Matches streaming live</h1>
          <p className="mt-2 text-muted-foreground">{live.length} matches currently live across the world.</p>
        </div>
        {live.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-muted-foreground">
            No live matches right now. Check the schedule for upcoming fixtures.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
