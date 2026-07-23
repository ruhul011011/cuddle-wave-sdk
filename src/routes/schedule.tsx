import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { getScheduleFeed, type Fixture } from "@/lib/api-football.functions";

const scheduleQuery = queryOptions({
  queryKey: ["schedule-feed"],
  queryFn: () => getScheduleFeed(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Football Schedule — Football Streaming" },
      { name: "description", content: "Complete schedule of upcoming football matches across all major leagues." },
      { property: "og:title", content: "Football Match Schedule" },
      { property: "og:description", content: "Upcoming football fixtures and kickoff times." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">No fixtures.</div>,
  component: SchedulePage,
});

function SchedulePage() {
  const { data: upcoming } = useSuspenseQuery(scheduleQuery);
  const byDay = upcoming.reduce<Record<string, Fixture[]>>((acc, m) => {
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
          <p className="mt-2 text-muted-foreground">All fixtures for the next 4 days.</p>
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

function ScheduleCard({ match: m }: { match: Fixture }) {
  const time = new Date(m.kickoff).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {m.leagueLogo && <img src={m.leagueLogo} alt="" loading="lazy" decoding="async" className="h-4 w-4 rounded-sm" />}
          <span className="font-medium">{m.league}</span>
        </div>
        <span className="font-display tracking-wider text-foreground">{time}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center text-center">
          {m.homeLogo && <img src={m.homeLogo} alt="" loading="lazy" decoding="async" className="h-12 w-12 rounded-full ring-2 ring-border/60" />}
          <div className="mt-2 text-sm font-semibold leading-tight">{m.homeTeam}</div>
        </div>
        <div className="font-display text-3xl tracking-wider text-muted-foreground/60">VS</div>
        <div className="flex flex-col items-center text-center">
          {m.awayLogo && <img src={m.awayLogo} alt="" loading="lazy" decoding="async" className="h-12 w-12 rounded-full ring-2 ring-border/60" />}
          <div className="mt-2 text-sm font-semibold leading-tight">{m.awayTeam}</div>
        </div>
      </div>
      {m.venue && (
        <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">{m.venue}</div>
      )}
    </div>
  );
}
