import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchCard } from "@/components/site/MatchCard";
import { getMatch, matches } from "@/lib/matches";
import { Play, Radio, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/match/$id")({
  loader: ({ params }) => {
    const match = getMatch(params.id);
    if (!match) throw notFound();
    return { match };
  },
  head: ({ loaderData }) => {
    const m = loaderData?.match;
    const title = m ? `${m.homeTeam} vs ${m.awayTeam} — Live Stream` : "Match — Football Streaming";
    const desc = m ? `Watch ${m.homeTeam} vs ${m.awayTeam} live from ${m.league}. HD football streaming.` : "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl">Match not found</h1>
        <p className="mt-3 text-muted-foreground">This fixture isn't in our schedule.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">Back home</Link>
      </div>
      <Footer />
    </div>
  ),
  component: MatchPage,
});

function MatchPage() {
  const { match } = Route.useLoaderData();
  const isLive = match.status === "live";
  const others = matches.filter((m) => m.id !== match.id).slice(0, 3);
  const kickoff = new Date(match.kickoff);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>

        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider">
          <span className="flex items-center gap-2 text-muted-foreground">
            <img src={match.leagueLogo} className="h-4 w-4 rounded-sm" alt="" />
            {match.league}
          </span>
          {isLive ? (
            <span className="live-dot font-display text-live">LIVE · {match.minute}</span>
          ) : match.status === "finished" ? (
            <span className="font-display text-muted-foreground">Full Time</span>
          ) : (
            <span className="font-display text-primary">Upcoming</span>
          )}
        </div>

        {/* Score header */}
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6 rounded-2xl border border-border/60 bg-card/60 p-8">
          <div className="flex flex-col items-center text-center">
            <img src={match.homeLogo} alt="" className="h-24 w-24 rounded-full ring-2 ring-primary/40" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{match.homeTeam}</div>
          </div>
          <div className="font-display text-6xl sm:text-7xl">
            {match.status === "upcoming"
              ? kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : <span>{match.homeScore} <span className="text-muted-foreground/40">:</span> {match.awayScore}</span>}
          </div>
          <div className="flex flex-col items-center text-center">
            <img src={match.awayLogo} alt="" className="h-24 w-24 rounded-full ring-2 ring-primary/40" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{match.awayTeam}</div>
          </div>
        </div>

        {/* Player */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-black">
          <div className="relative aspect-video w-full pitch-gradient">
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_oklch(0.58_0.22_275/0.6)] cursor-pointer hover:scale-105 transition-transform">
                  <Play className="h-8 w-8 fill-current" />
                </div>
                <div className="mt-4 font-display text-2xl tracking-wider">
                  {isLive ? "TAP TO WATCH LIVE" : match.status === "upcoming" ? "STREAM STARTS AT KICKOFF" : "MATCH HIGHLIGHTS"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">HD · Multi-language commentary</div>
              </div>
            </div>
            {isLive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-md bg-live px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Radio className="h-3 w-3" /> Live
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <InfoCard icon={<MapPin className="h-5 w-5" />} label="Venue" value={match.venue ?? "TBD"} />
          <InfoCard icon={<Calendar className="h-5 w-5" />} label="Kickoff" value={kickoff.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} />
          <InfoCard icon={<Radio className="h-5 w-5" />} label="Status" value={isLive ? `Live · ${match.minute}` : match.status === "finished" ? "Full Time" : "Upcoming"} />
        </div>
      </div>

      {/* Other matches */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <h2 className="mb-6 font-display text-3xl">Other matches</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-lg">{value}</div>
      </div>
    </div>
  );
}
