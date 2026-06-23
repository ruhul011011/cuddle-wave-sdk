import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { leagues, matches } from "@/lib/matches";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/leagues")({
  head: () => ({
    meta: [
      { title: "Leagues — Football Streaming" },
      { name: "description", content: "Browse football leagues and competitions available for live streaming." },
      { property: "og:title", content: "Football Leagues" },
      { property: "og:description", content: "Browse all available football leagues and competitions." },
    ],
  }),
  component: LeaguesPage,
});

function LeaguesPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Competitions</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">All leagues & cups</h1>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((l) => {
            const count = matches.filter((m) => m.league === l.name).length;
            return (
              <div key={l.id} className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/50 hover:-translate-y-0.5">
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Trophy className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-2xl">{l.name}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.country}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl text-primary">{count}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Matches</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
