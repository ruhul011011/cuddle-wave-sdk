import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatKickoffTime } from "@/lib/matches";
import { getHomeFeed, getFixturesByIds, type Fixture } from "@/lib/api-football.functions";
import { listStreamedFixtureIds } from "@/lib/streams.functions";
import { Clock, Radio, ChevronLeft } from "lucide-react";

async function loadLiveStreams() {
  const [feed, streamedIds] = await Promise.all([
    getHomeFeed(),
    listStreamedFixtureIds().catch(() => [] as number[]),
  ]);
  const streamed = new Set(streamedIds);
  const known = [...feed.live, ...feed.upcoming].filter((m) => streamed.has(Number(m.id)));
  const knownIds = new Set(known.map((m) => Number(m.id)));
  const missing = streamedIds.filter((id) => !knownIds.has(id));
  const extra = missing.length
    ? await getFixturesByIds({ data: { ids: missing } }).catch(() => [] as Fixture[])
    : [];
  const all = [...known, ...extra].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return all;
}

const liveQuery = queryOptions({
  queryKey: ["live-streamed-fixtures"],
  queryFn: loadLiveStreams,
  staleTime: 15_000,
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Watch Live Football — Streaming Now" },
      { name: "description", content: "All football matches currently streaming live in HD." },
      { property: "og:title", content: "Watch Live Football — Streaming Now" },
      { property: "og:description", content: "Live football matches streaming right now." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(liveQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-3xl text-primary">Couldn't load live matches</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">No live matches.</div>,
  component: LivePage,
});

function LivePage() {
  const { data: matches } = useSuspenseQuery(liveQuery);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
          <h1 className="mt-3 flex items-center gap-3 font-display text-3xl sm:text-4xl">
            <Radio className="h-7 w-7 text-primary" /> Live Streams
            <span className="text-base text-muted-foreground">({matches.length})</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Matches with streams added by the admin.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-muted-foreground">
            No live streams available right now. Check back soon.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
            {matches.map((m) => (
              <FixtureRow key={m.id} match={m} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function FixtureRow({ match: m }: { match: Fixture }) {
  const isLive = m.status === "live";
  return (
    <Link
      to="/match/$id"
      params={{ id: m.id }}
      className="block px-4 py-4 hover:bg-secondary/40 transition-colors"
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground">
          {m.leagueLogo && <img src={m.leagueLogo} alt="" className="h-3 w-3" />}
          {m.league}
        </span>
        {isLive ? (
          <span className="live-dot font-display tracking-wider text-live">{m.minute ?? "LIVE"}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1 font-display tracking-wider text-foreground">
            <Clock className="h-3 w-3" /> {formatKickoffTime(m.kickoff)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={m.homeLogo} alt="" className="h-8 w-8 rounded-full object-cover bg-secondary" />
          <span className="font-display text-base sm:text-lg truncate">{m.homeTeam}</span>
        </div>
        <div className="font-display text-lg tracking-wider text-muted-foreground">
          {isLive || m.status === "finished" ? (
            <span className="text-foreground">{m.homeScore ?? 0} <span className="text-muted-foreground/60">:</span> {m.awayScore ?? 0}</span>
          ) : (
            "VS"
          )}
        </div>
        <div className="flex items-center justify-end gap-3 min-w-0">
          <span className="font-display text-base sm:text-lg truncate text-right">{m.awayTeam}</span>
          <img src={m.awayLogo} alt="" className="h-8 w-8 rounded-full object-cover bg-secondary" />
        </div>
      </div>
    </Link>
  );
}
