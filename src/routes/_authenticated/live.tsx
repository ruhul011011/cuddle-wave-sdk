import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { getFixturesByIds, type Fixture } from "@/lib/api-football.functions";
import { listStreamedFixtureIds } from "@/lib/streams.functions";

async function loadLive(): Promise<Fixture[]> {
  const streamedIds = await listStreamedFixtureIds().catch(() => [] as number[]);
  if (!streamedIds.length) return [];
  const streamed = await getFixturesByIds({ data: { ids: streamedIds } }).catch(() => [] as Fixture[]);
  // Source of truth for "available to stream" is match_streams.is_active —
  // we intentionally do NOT filter by api-football status here (it often
  // mislabels recent/upcoming fixtures as FT). Admins toggle is_active off
  // when a stream should no longer appear.
  return streamed.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

const liveQuery = queryOptions({
  queryKey: ["live-fixtures-with-streams"],
  queryFn: loadLive,
  staleTime: 10_000,
  refetchInterval: 15_000,
});

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live Football Streams — Football Streaming" },
      { name: "description", content: "Watch live football matches streaming right now in HD." },
      { property: "og:title", content: "Live Football Streams" },
      { property: "og:description", content: "Watch live football matches streaming right now in HD." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(liveQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">No live matches.</div>,
  component: LivePage,
});

function LivePage() {
  const { data: live } = useSuspenseQuery(liveQuery);
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="live-dot text-xs font-semibold uppercase tracking-[0.2em] text-live">Live Now</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Matches streaming live</h1>
          <p className="mt-2 text-muted-foreground">{live.length} matches currently available to stream.</p>
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
