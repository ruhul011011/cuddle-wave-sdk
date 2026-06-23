import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { popularLeagues, topLeagues, popularTeams, groupByDate, formatKickoffTime } from "@/lib/matches";
import { getHomeFeed, getFixturesByIds, type Fixture } from "@/lib/api-football.functions";
import { listStreamedFixtureIds } from "@/lib/streams.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  ChevronRight,
  Calendar,
  Send,
  Star,
  ChevronDown,
  Clock,
  Play,
  Radio,
} from "lucide-react";

// Critical path: only the home feed blocks SSR. Streamed-ids + missing-fixtures
// hydrate client-side after first paint.
const homeFeedQuery = queryOptions({
  queryKey: ["home-feed"],
  queryFn: () => getHomeFeed(),
  staleTime: 60_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});

const streamedIdsQuery = queryOptions({
  queryKey: ["streamed-fixture-ids"],
  queryFn: () => listStreamedFixtureIds().catch(() => [] as number[]),
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Watch Football World Cup 2026 Live in HD" },
      { name: "description", content: "Watch the FIFA World Cup 2026 live in HD. Free football streaming for every World Cup match, fixtures, groups and highlights." },
      { property: "og:title", content: "Watch Football World Cup 2026 Live in HD" },
      { property: "og:description", content: "Live HD streams for every FIFA World Cup 2026 match — fixtures, groups and highlights." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeFeedQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-3xl text-primary">Couldn't load fixtures</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">No fixtures available.</div>,
  component: Index,
});

function Index() {
  const { data: feed } = useSuspenseQuery(homeFeedQuery);
  // Client-only: which fixtures have admin streams
  const { data: streamedIds = [] } = useQuery(streamedIdsQuery);
  // Client-only: fetch any streamed fixtures missing from the popular-league feed
  const knownIds = new Set(feed.live.map((m) => Number(m.id)));
  const missing = streamedIds.filter((id) => !knownIds.has(id));
  const { data: extraLive = [] } = useQuery({
    queryKey: ["home-extra-live", missing.sort().join(",")],
    queryFn: () => getFixturesByIds({ data: { ids: missing } }),
    enabled: missing.length > 0,
    staleTime: 60_000,
  });

  const streamed = new Set(streamedIds);
  const liveFromFeed = feed.live.filter((m) => streamed.has(Number(m.id)));
  const live = [...liveFromFeed, ...extraLive].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const upcoming = feed.upcoming;
  const featured = upcoming[0] ?? live[0];


  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-8">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl sm:text-3xl">
              <Trophy className="h-6 w-6 text-primary" /> Popular Leagues
            </h2>
            <Link to="/leagues" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularLeagues.map((l) => (
              <Link
                key={l.id}
                to="/leagues"
                className={`group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${l.accent} p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50`}
              >
                <img src={l.logo} alt="" loading="lazy" decoding="async" className="absolute -right-4 -top-4 h-24 w-24 opacity-20 transition-transform group-hover:scale-110" />
                <div className="relative">
                  <div className="font-display text-base leading-tight">{l.name}</div>
                  <div className="mt-6 text-xs text-muted-foreground flex items-center justify-between">
                    <span>{l.country}</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-lg leading-tight">Join our Telegram</div>
                  <div className="text-xs text-muted-foreground">Connect with other sports fans</div>
                </div>
              </div>
              <button className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                Join Telegram
              </button>
            </div>

            <SidebarSection icon={<Trophy className="h-4 w-4 text-primary" />} title="Top Leagues">
              <ul className="divide-y divide-border/60">
                {topLeagues.map((l) => (
                  <li key={l.id}>
                    <Link to="/leagues" className="flex items-center gap-3 px-1.5 py-2.5 text-sm hover:text-primary transition-colors">
                      <img src={l.logo} alt="" loading="lazy" decoding="async" className="h-7 w-7 rounded-full bg-secondary p-0.5" />
                      <span className="flex-1 truncate">{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.country}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarSection>

            <SidebarSection icon={<Star className="h-4 w-4 text-primary" />} title="Popular Teams">
              <ul className="divide-y divide-border/60">
                {popularTeams.map((t) => (
                  <li key={t.id}>
                    <a className="flex items-center gap-3 px-1.5 py-2.5 text-sm hover:text-primary cursor-pointer transition-colors">
                      <img src={t.logo} alt="" loading="lazy" decoding="async" className="h-7 w-7 rounded-full" />
                      <span className="flex-1 truncate">{t.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </SidebarSection>
          </aside>

          <div className="space-y-8 min-w-0">
            {featured && (
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-900/60 via-card to-card p-6 sm:p-10">
                <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(oklch(1_0_0/0.5)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
                <div className="absolute -right-12 -bottom-12 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
                <div className="relative grid gap-6 sm:grid-cols-[1.2fr_auto] sm:items-center">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Radio className="h-3 w-3" /> Live & Upcoming
                    </span>
                    <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
                      EVERY MATCH, <span className="text-primary">EVERY LEAGUE.</span>
                    </h1>
                    <p className="mt-3 max-w-md text-sm text-muted-foreground">
                      Real-time fixtures, live scores and HD streams powered by API-Football.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link to="/live" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Play className="h-4 w-4 fill-current" /> Watch Live ({live.length})
                      </Link>
                      <Link to="/schedule" className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
                        <Calendar className="h-4 w-4" /> Fixtures
                      </Link>
                    </div>
                  </div>
                  <div className="hidden sm:block font-display text-7xl lg:text-8xl text-primary/90 leading-none">
                    {live.length}
                    <div className="text-base tracking-widest text-muted-foreground">LIVE NOW</div>
                  </div>
                </div>
              </div>
            )}

            {live.length > 0 && (
              <FixturesBlock
                icon={<span className="live-dot text-live font-display tracking-wider">LIVE NOW</span>}
                title="Streaming right now"
                allHref="/live"
              >
                {live.slice(0, 10).map((m) => (
                  <FixtureRow key={m.id} match={m} />
                ))}
              </FixturesBlock>
            )}

            <FixturesBlock
              icon={<Calendar className="h-5 w-5 text-primary" />}
              title="Upcoming Matches"
              allHref="/schedule"
            >
              {groupByDate(upcoming.slice(0, 20)).map(([date, list]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" /> {date}
                  </div>
                  {list.map((m) => (
                    <FixtureRow key={m.id} match={m} />
                  ))}
                </div>
              ))}
            </FixturesBlock>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SidebarSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 font-display text-base">{icon} {title}</div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function FixturesBlock({
  icon,
  title,
  allHref,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  allHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl sm:text-3xl">
          {icon} {title}
        </h2>
        {allHref && (
          <Link to={allHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {children}
      </div>
    </section>
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
          {m.leagueLogo && <img src={m.leagueLogo} alt="" loading="lazy" decoding="async" className="h-3 w-3" />}
          {m.league}
        </span>
        {isLive ? (
          <span className="live-dot font-display tracking-wider text-live">{m.minute}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1 font-display tracking-wider text-foreground">
            <Clock className="h-3 w-3" /> {formatKickoffTime(m.kickoff)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={m.homeLogo} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full object-cover bg-secondary" />
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
          <img src={m.awayLogo} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full object-cover bg-secondary" />
        </div>
      </div>
    </Link>
  );
}
