import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { matches } from "@/lib/matches";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Football Schedule — Football Streaming" },
      { name: "description", content: "Complete schedule of upcoming football matches across all major leagues." },
      { property: "og:title", content: "Football Match Schedule" },
      { property: "og:description", content: "Upcoming football fixtures and kickoff times." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const upcoming = matches.filter((m) => m.status !== "finished");
  const byDay = upcoming.reduce<Record<string, typeof matches>>((acc, m) => {
    const day = new Date(m.kickoff).toDateString();
    (acc[day] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Schedule</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Upcoming matches</h1>
          <p className="mt-2 text-muted-foreground">All fixtures grouped by matchday.</p>
        </div>
        <div className="space-y-12">
          {Object.entries(byDay).map(([day, list]) => (
            <div key={day}>
              <h2 className="mb-5 font-display text-2xl text-primary">{day}</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
