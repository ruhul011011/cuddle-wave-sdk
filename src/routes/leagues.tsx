import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { leagues } from "@/lib/matches";
import { getScheduleFeed } from "@/lib/api-football.functions";
import { Trophy } from "lucide-react";

const scheduleQuery = queryOptions({
  queryKey: ["schedule-feed"],
  queryFn: () => getScheduleFeed(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/leagues")({
  head: () => ({
    meta: [
      { title: "Leagues — Football Streaming" },
      { name: "description", content: "Browse football leagues and competitions available for live streaming." },
      { property: "og:title", content: "Football Leagues" },
      { property: "og:description", content: "Browse all available football leagues and competitions." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQuery),
  errorComponent: ({ error }) => <div className="p-8 text-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">No leagues.</div>,
  component: LeaguesPage,
});

function LeaguesPage() {
  const { data: fixtures } = useSuspenseQuery(scheduleQuery);

  // Aggregate live league counts from real fixtures, merged with curated leagues list.
  const counts = new Map<string, { name: string; country: string; count: number }>();
  for (const f of fixtures) {
    const existing = counts.get(f.league);
    if (existing) existing.count += 1;
    else counts.set(f.league, { name: f.league, country: f.leagueCountry ?? "", count: 1 });
  }
  for (const l of leagues) {
    if (!counts.has(l.name)) counts.set(l.name, { name: l.name, country: l.country, count: 0 });
  }
  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Competitions</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">All leagues & cups</h1>
          <p className="mt-2 text-muted-foreground">Counts reflect upcoming fixtures over the next 4 days.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((l) => (
            <div key={l.name} className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/50 hover:-translate-y-0.5">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/15 text-primary">
                <Trophy className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl truncate">{l.name}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.country || "—"}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-primary">{l.count}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Matches</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
