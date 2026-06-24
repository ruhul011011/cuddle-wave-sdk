import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Calendar, MapPin, Users, Flag, Clock } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  wcInfo,
  qualifiedTeams,
  groupStandings as defaultGroupStandings,
  tournamentSchedule,
  keyMatches as fallbackKeyMatches,
  type Group,
} from "@/lib/world-cup";
import { getWorldCupFixtures, getWorldCupStandings } from "@/lib/world-cup.functions";

export const Route = createFileRoute("/world-cup")({
  head: () => ({
    meta: [
      { title: "World Cup TV 2026 — FIFA World Cup Schedule, Groups & Points Table" },
      { name: "description", content: "World Cup TV 2026: complete FIFA World Cup schedule, group standings, points table, qualified teams and live TV streaming. Hosts: USA, Canada, Mexico." },
      { name: "keywords", content: "World Cup TV 2026, World Cup 2026 Schedule, World Cup Points Table, FIFA World Cup Groups, World Cup Live TV, World Cup Fixtures 2026" },
      { property: "og:title", content: "World Cup TV 2026 — Schedule, Groups & Points Table" },
      { property: "og:description", content: "FIFA World Cup 2026 group standings, schedule and live TV streaming on World Cup TV." },
      { property: "og:url", content: "https://www.worldcuptv.to/world-cup" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.worldcuptv.to/world-cup" }],
  }),
  component: WorldCupPage,
});


function WorldCupPage() {
  const { data: groupStandings = defaultGroupStandings } = useQuery({
    queryKey: ["site_settings", "world_cup_groups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "world_cup_groups")
        .maybeSingle();
      if (!data?.value) return defaultGroupStandings;
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return Array.isArray(parsed) ? (parsed as Group[]) : defaultGroupStandings;
      } catch {
        return defaultGroupStandings;
      }
    },
    staleTime: 60_000,
  });

  const { data: liveMatches } = useQuery({
    queryKey: ["wc-fixtures"],
    queryFn: () => getWorldCupFixtures(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const keyMatches =
    liveMatches && liveMatches.source === "api" && liveMatches.matches.length > 0
      ? liveMatches.matches
      : fallbackKeyMatches;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/20 via-card to-card p-8 sm:p-12">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Trophy className="h-3.5 w-3.5" /> Tournament Hub
            </div>
            <h1 className="mt-4 font-display text-4xl sm:text-6xl leading-tight">
              FIFA World Cup <span className="text-primary">2026</span>
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              The biggest World Cup in history — 48 teams, 104 matches across the United States, Canada and Mexico.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<Calendar className="h-4 w-4" />} label="Dates" value={wcInfo.dates} />
              <Stat icon={<Users className="h-4 w-4" />} label="Teams" value={`${wcInfo.teams} nations`} />
              <Stat icon={<Flag className="h-4 w-4" />} label="Matches" value={`${wcInfo.matches} games`} />
              <Stat icon={<MapPin className="h-4 w-4" />} label="Venues" value={`${wcInfo.venues} cities`} />
            </div>
          </div>
        </section>

        {/* Tournament schedule */}
        <section>
          <SectionHeading
            eyebrow="Tournament Schedule"
            title="Stage-by-stage calendar"
            sub="Key dates from kickoff to the Final at MetLife Stadium."
          />
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Matches</th>
                  <th className="px-4 py-3 hidden md:table-cell">Venues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {tournamentSchedule.map((s) => (
                  <tr key={s.stage} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{s.stage}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.dates}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.matches}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.venues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key matches */}
        <section>
          <SectionHeading
            eyebrow="Marquee Fixtures"
            title="Matches to watch"
            sub="Opening match, host nations and knockout-stage headliners."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {keyMatches.map((m, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{m.stage}</span>
                  <span className="text-muted-foreground">{m.date}</span>
                </div>
                <div className="mt-3 font-display text-xl">{m.match}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {m.kickoff}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {m.venue}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Points table per group */}
        <section>
          <SectionHeading
            eyebrow="Points Table"
            title="Group standings"
            sub="12 groups of 4. Top two from each group plus the eight best third-placed teams advance to the Round of 32. Teams placeholders until the draw on 5 December 2025."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groupStandings.map((g) => (
              <div key={g.name} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-4 py-3">
                  <div className="font-display text-lg">{g.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Draw pending</div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Team</th>
                      <Th>P</Th><Th>W</Th><Th>D</Th><Th>L</Th><Th>GF</Th><Th>GA</Th>
                      <th className="px-3 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {g.rows.map((r) => (
                      <tr key={r.code}>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">{r.code}</span>
                            <span className="text-muted-foreground">{r.team}</span>
                          </span>
                        </td>
                        <Td>{r.p}</Td><Td>{r.w}</Td><Td>{r.d}</Td><Td>{r.l}</Td><Td>{r.gf}</Td><Td>{r.ga}</Td>
                        <td className="px-3 py-2.5 text-right font-bold">{r.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* Qualified teams */}
        <section>
          <SectionHeading
            eyebrow="Qualified Nations"
            title="Teams confirmed for 2026"
            sub={`${qualifiedTeams.length} nations confirmed so far. Remaining slots decided via UEFA play-offs and the inter-confederation play-off tournament.`}
          />
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {qualifiedTeams.map((t) => (
              <div key={t.code} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 transition-colors">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {t.code}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{t.confederation}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <div className="font-display text-2xl">Watch every match live in HD</div>
          <p className="mt-2 text-sm text-muted-foreground">Group stage to the Final — free streaming on WorldCupTV.</p>
          <Link
            to="/schedule"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            See full match schedule
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-lg">{value}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 text-center w-9">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-2.5 text-center text-muted-foreground">{children}</td>;
}
