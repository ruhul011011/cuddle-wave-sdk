import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { popularLeagues, topLeagues, popularTeams, groupByDate, formatKickoffTime } from "@/lib/matches";
import { getHomeFeed, type Fixture } from "@/lib/api-football.functions";
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
const emptyHomeFeed: { live: Fixture[]; upcoming: Fixture[]; streamed: Fixture[] } = {
  live: [],
  upcoming: [],
  streamed: [],
};

const homeFeedQuery = queryOptions({
  queryKey: ["home-feed"],
  queryFn: async () => {
    try {
      return await getHomeFeed();
    } catch (error) {
      console.error("Home feed failed", error);
      return emptyHomeFeed;
    }
  },
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 20_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup Live TV — Watch FIFA World Cup 2026 Live in HD Free | World Cup TV" },
      { name: "description", content: "World Cup Live TV — watch every FIFA World Cup 2026 match live in HD for free. Live scores, fixtures, schedule, groups and points table on World Cup TV." },
      { name: "keywords", content: "World Cup Live TV, World Cup TV, World Cup TV 2026, FIFA World Cup 2026 Live, Watch World Cup 2026 Online, World Cup Live Streaming Free, World Cup HD TV, Football World Cup Live" },
      { property: "og:title", content: "World Cup Live TV — Watch FIFA World Cup 2026 Live HD Free" },
      { property: "og:description", content: "Free World Cup Live TV streaming for every FIFA World Cup 2026 match. Fixtures, groups and points table." },
      { property: "og:url", content: "https://www.worldcuptv.to/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.worldcuptv.to/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "FIFA World Cup 2026",
          alternateName: "World Cup 2026 Live TV",
          description: "Watch FIFA World Cup 2026 live on World Cup TV. Free HD live streaming of all World Cup matches.",
          startDate: "2026-06-11",
          endDate: "2026-07-19",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
          location: [
            { "@type": "Country", name: "United States" },
            { "@type": "Country", name: "Canada" },
            { "@type": "Country", name: "Mexico" },
          ],
          organizer: { "@type": "Organization", name: "FIFA", url: "https://www.fifa.com" },
          offers: {
            "@type": "Offer",
            url: "https://www.worldcuptv.to/",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        }),
      },
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
  const initialFeed = Route.useLoaderData();
  const [hasMounted, setHasMounted] = useState(false);
  const { data: freshFeed } = useQuery({ ...homeFeedQuery, initialData: initialFeed });
  const feed = hasMounted ? (freshFeed ?? initialFeed) : initialFeed;

  useEffect(() => {
    setHasMounted(true);
  }, []);
  const live = [...(feed.streamed ?? [])]
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
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
                to={l.id === "wc" ? "/world-cup" : "/leagues"}
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
            <TelegramJoinCard />


            <SidebarSection icon={<Trophy className="h-4 w-4 text-primary" />} title="Top Leagues">
              <ul className="divide-y divide-border/60">
                {topLeagues.map((l) => (
                  <li key={l.id}>
                    <Link to={l.id === "wc" ? "/world-cup" : "/leagues"} className="flex items-center gap-3 px-1.5 py-2.5 text-sm hover:text-primary transition-colors">
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
        className="group block px-4 py-4 hover:bg-secondary/40 transition-colors"
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground">
          {m.leagueLogo && <img src={m.leagueLogo} alt="" loading="lazy" decoding="async" className="h-3 w-3" />}
          {m.league}
        </span>
        {isLive ? (
          <span className="live-dot font-display tracking-wider text-live" suppressHydrationWarning>{m.minute}</span>
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
      {isLive && (
        <div className="mt-4 flex justify-end">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground group-hover:bg-primary/90">
            <Play className="h-3.5 w-3.5 fill-current" /> Watch Live
          </span>
        </div>
      )}
    </Link>
  );
}

function TelegramJoinCard() {
  const { data } = useQuery({
    queryKey: ["site_settings", "telegram_join_url"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["telegram_join_url", "telegram_username"]);
        if (error) throw error;
        const map = new Map((data ?? []).map((r: any) => [r.key, r.value as string]));
        const url = (map.get("telegram_join_url") || "").trim();
        const username = (map.get("telegram_username") || "").trim();
        return url || (username ? `https://t.me/${username.replace(/^@/, "")}` : "");
      } catch (error) {
        console.error("Telegram settings failed", error);
        return "";
      }
    },
    enabled: typeof window !== "undefined",
    staleTime: 60_000,
    retry: false,
  });
  const href = data || "";
  return (
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
      <a
        href={href || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!href}
        onClick={(e) => { if (!href) e.preventDefault(); }}
        className="mt-4 block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Join Telegram
      </a>
    </div>
  );
}

