import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { matches, leagues } from "@/lib/matches";
import { Play, Radio, Calendar, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Football Streaming — Watch Live Football Online" },
      { name: "description", content: "Watch live football streams from the Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and Champions League. Free HD football streaming." },
      { property: "og:title", content: "Football Streaming — Watch Live Football Online" },
      { property: "og:description", content: "Live football streams, schedules and highlights from every major league." },
    ],
  }),
  component: Index,
});

function Index() {
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished");
  const featured = live[0] ?? upcoming[0];

  return (
    <div className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="pitch-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(oklch(1_0_0/0.4)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.4)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 py-16 lg:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Radio className="h-3 w-3" /> Live HD Streaming
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              Every match.<br />
              <span className="text-primary">Every league.</span><br />
              One screen.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Stream live football matches from the Premier League, La Liga, Bundesliga, Serie A and Champions League — in stunning HD, no subscriptions, no hassle.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/live" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                <Play className="h-4 w-4 fill-current" /> Watch Live Now
              </Link>
              <Link to="/schedule" className="inline-flex items-center gap-2 rounded-md border border-border/80 bg-card/40 px-5 py-3 text-sm font-semibold hover:bg-secondary/60 transition-colors">
                <Calendar className="h-4 w-4" /> View Schedule
              </Link>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 text-center">
              {[
                { v: "120+", l: "Live Matches" },
                { v: "30", l: "Leagues" },
                { v: "HD", l: "Quality" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl text-primary">{s.v}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured match panel */}
          {featured && (
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-2xl" />
              <div className="relative rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <img src={featured.leagueLogo} className="h-4 w-4 rounded-sm" alt="" />
                    {featured.league}
                  </span>
                  {featured.status === "live" ? (
                    <span className="live-dot font-display text-live">LIVE · {featured.minute}</span>
                  ) : (
                    <span className="font-display text-primary">Upcoming</span>
                  )}
                </div>
                <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="flex flex-col items-center text-center">
                    <img src={featured.homeLogo} className="h-20 w-20 rounded-full ring-2 ring-primary/40" alt="" />
                    <div className="mt-3 font-display text-xl">{featured.homeTeam}</div>
                  </div>
                  <div className="font-display text-5xl">
                    {featured.status === "upcoming"
                      ? new Date(featured.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : <span>{featured.homeScore} <span className="text-muted-foreground/50">:</span> {featured.awayScore}</span>}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <img src={featured.awayLogo} className="h-20 w-20 rounded-full ring-2 ring-primary/40" alt="" />
                    <div className="mt-3 font-display text-xl">{featured.awayTeam}</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5 text-sm text-muted-foreground">
                  <span>{featured.venue}</span>
                  <Link
                    to="/match/$id"
                    params={{ id: featured.id }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Play className="h-4 w-4 fill-current" /> WATCH NOW
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LIVE NOW */}
      {live.length > 0 && (
        <Section
          eyebrow={<span className="live-dot text-live">LIVE NOW</span>}
          title="Matches streaming right now"
          link={{ to: "/live", label: "All live" }}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </Section>
      )}

      {/* UPCOMING */}
      <Section
        eyebrow={<span className="text-primary">UP NEXT</span>}
        title="Upcoming fixtures"
        link={{ to: "/schedule", label: "Full schedule" }}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.slice(0, 6).map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      </Section>

      {/* LEAGUES */}
      <Section
        eyebrow={<span className="text-primary">COMPETITIONS</span>}
        title="Top leagues & cups"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {leagues.map((l) => (
            <div key={l.id} className="group rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/50 hover:-translate-y-0.5">
              <Trophy className="h-6 w-6 text-primary" />
              <div className="mt-4 font-display text-xl">{l.name}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.country}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* RESULTS */}
      {finished.length > 0 && (
        <Section
          eyebrow={<span className="text-muted-foreground">RESULTS</span>}
          title="Latest results"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </Section>
      )}

      <Footer />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  link,
  children,
}: {
  eyebrow: React.ReactNode;
  title: string;
  link?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em]">{eyebrow}</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2>
        </div>
        {link && (
          <Link to={link.to} className="text-sm font-semibold text-primary hover:underline">
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
