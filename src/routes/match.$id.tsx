import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getFixtureDetail } from "@/lib/api-football.functions";
import { getStreamsForFixture } from "@/lib/streams.functions";
import { getMatchAccess, createMatchCheckout } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { StreamPlayer } from "@/components/StreamPlayer";
import { Radio, MapPin, Calendar, Flag, Goal, Square, ArrowLeftRight, User, Lock, Loader2 } from "lucide-react";

const fixtureQuery = (id: string) =>
  queryOptions({
    queryKey: ["fixture", id],
    queryFn: () => getFixtureDetail({ data: { id } }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

const streamsQuery = (id: string) =>
  queryOptions({
    queryKey: ["streams", id],
    queryFn: () => getStreamsForFixture({ data: { fixtureId: Number(id) } }),
    staleTime: 30_000,
  });

const accessQuery = (id: string) =>
  queryOptions({
    queryKey: ["match-access", id],
    queryFn: () => getMatchAccess({ data: { fixtureId: Number(id) } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/match/$id")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(fixtureQuery(params.id));
    if (!data) throw notFound();
    return null;
  },
  head: () => ({
    meta: [
      { title: "Match — Football Streaming" },
      { name: "description", content: "Live football match details, lineups and events." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl">Match not found</h1>
        <p className="mt-3 text-muted-foreground">This fixture isn't available.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">Back home</Link>
      </div>
      <Footer />
    </div>
  ),
  component: MatchPage,
});

function MatchPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(fixtureQuery(id));
  const { data: access, refetch: refetchAccess } = useQuery(accessQuery(id));
  const { data: streams = [] } = useQuery({
    ...streamsQuery(id),
    enabled: !!access && (access.access === "free" || access.hasAccess),
  });
  const checkoutFn = useServerFn(createMatchCheckout);
  const [buying, setBuying] = useState(false);
  if (!data) return null;
  const match = data;
  const isLive = match.status === "live";
  const kickoff = new Date(match.kickoff);
  const isPaidLocked = access?.access === "paid" && !access.hasAccess;

  async function handleBuy() {
    setBuying(true);
    try {
      // Ensure signed in; if not, redirect to /auth with redirect back here.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const back = window.location.pathname + window.location.search;
        window.location.assign(`/auth?redirect=${encodeURIComponent(back)}`);
        return;
      }
      const res = await checkoutFn({ data: { fixtureId: Number(id) } });
      if (res.alreadyPurchased) {
        await refetchAccess();
        return;
      }
      if (res.url) window.location.assign(res.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>

        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider">
          <span className="flex items-center gap-2 text-muted-foreground">
            {match.leagueLogo && <img src={match.leagueLogo} className="h-4 w-4 rounded-sm" alt="" />}
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

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6 rounded-2xl border border-border/60 bg-card/60 p-8">
          <div className="flex flex-col items-center text-center">
            <img src={match.homeLogo} alt="" className="h-24 w-24 rounded-full ring-2 ring-primary/40 bg-secondary p-1" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{match.homeTeam}</div>
          </div>
          <div className="font-display text-6xl sm:text-7xl">
            {match.status === "upcoming"
              ? kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : <span>{match.homeScore ?? 0} <span className="text-muted-foreground/40">:</span> {match.awayScore ?? 0}</span>}
          </div>
          <div className="flex flex-col items-center text-center">
            <img src={match.awayLogo} alt="" className="h-24 w-24 rounded-full ring-2 ring-primary/40 bg-secondary p-1" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{match.awayTeam}</div>
          </div>
        </div>

        <div className="mt-8">
          {isPaidLocked ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Premium match</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Unlock the live stream for this match — one-time payment, instant access.
              </p>
              <button
                onClick={handleBuy}
                disabled={buying}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Buy access — {formatMoney(access!.price_cents, access!.currency)}
              </button>
            </div>
          ) : (
            <StreamPlayer
              sources={streams.map((s) => ({ id: s.id, label: s.label, stream_type: s.stream_type, url: s.url }))}
              isLive={isLive}
              placeholder={
                isLive ? "NO STREAM AVAILABLE" :
                match.status === "upcoming" ? "STREAM STARTS AT KICKOFF" : "MATCH HIGHLIGHTS"
              }
            />
          )}
        </div>


        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard icon={<MapPin className="h-5 w-5" />} label="Venue" value={match.venue ?? "TBD"} />
          <InfoCard icon={<Calendar className="h-5 w-5" />} label="Kickoff" value={kickoff.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} />
          <InfoCard icon={<Flag className="h-5 w-5" />} label="Referee" value={match.referee ?? "TBD"} />
          <InfoCard icon={<Radio className="h-5 w-5" />} label="Status" value={isLive ? `Live · ${match.minute}` : match.status === "finished" ? "Full Time" : "Upcoming"} />
        </div>

        {match.events.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl">Match events</h2>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
              {match.events.map((e, i) => (
                <div key={i} className="grid grid-cols-[60px_28px_1fr] items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-display tracking-wider text-primary">{e.minute}{e.extra ? `+${e.extra}` : ""}'</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground">
                    {eventIcon(e.type, e.detail)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate"><span className="font-semibold">{e.player || "—"}</span> <span className="text-muted-foreground">· {e.detail}</span></div>
                    {e.assist && <div className="text-xs text-muted-foreground">assist: {e.assist}</div>}
                  </div>
                  <span className={`ml-auto col-start-3 justify-self-end text-xs uppercase tracking-wider ${e.team === "home" ? "text-primary" : "text-muted-foreground"}`}>
                    {e.team === "home" ? match.homeTeam : match.awayTeam}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {match.lineups.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl">Lineups</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {match.lineups.map((l) => (
                <div key={l.team} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                    {l.teamLogo && <img src={l.teamLogo} alt="" className="h-10 w-10 rounded-full bg-secondary p-1" />}
                    <div>
                      <div className="font-display text-xl leading-tight">{l.team}</div>
                      <div className="text-xs text-muted-foreground">Formation {l.formation || "—"} · Coach {l.coach || "—"}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Starting XI</div>
                    <ul className="grid grid-cols-1 gap-1 text-sm">
                      {l.startXI.map((p, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="grid h-6 w-6 place-items-center rounded bg-primary/15 text-primary text-xs font-bold">{p.number || "-"}</span>
                          <span className="flex-1 truncate"><User className="inline h-3 w-3 mr-1 text-muted-foreground" />{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.pos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {l.substitutes.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Substitutes</div>
                      <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {l.substitutes.map((p, i) => (
                          <li key={i} className="truncate">#{p.number} {p.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {match.statistics.length === 2 && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl">Statistics</h2>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="grid grid-cols-3 items-center pb-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <span className="text-left">{match.statistics[0].team}</span>
                <span className="text-center">Stat</span>
                <span className="text-right">{match.statistics[1].team}</span>
              </div>
              {match.statistics[0].stats.map((s, i) => {
                const other = match.statistics[1].stats[i];
                return (
                  <div key={i} className="grid grid-cols-3 items-center py-2 text-sm border-b border-border/40 last:border-0">
                    <span className="text-left font-display">{s.value ?? "—"}</span>
                    <span className="text-center text-xs text-muted-foreground">{s.type}</span>
                    <span className="text-right font-display">{other?.value ?? "—"}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-base truncate">{value}</div>
      </div>
    </div>
  );
}

function eventIcon(type: string, detail: string) {
  const t = type.toLowerCase();
  const d = detail.toLowerCase();
  if (t === "goal") return <Goal className="h-4 w-4 text-emerald-400" />;
  if (t === "card") return <Square className={`h-3 w-3 ${d.includes("red") ? "fill-red-500 text-red-500" : "fill-yellow-400 text-yellow-400"}`} />;
  if (t === "subst") return <ArrowLeftRight className="h-4 w-4 text-sky-400" />;
  return <Radio className="h-3 w-3 text-muted-foreground" />;
}
