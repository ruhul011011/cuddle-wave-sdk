import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getFixtureDetail } from "@/lib/api-football.functions";
import { getTeamFlagUrl, getWorldCup2026FixtureById } from "@/lib/world-cup-2026-fixtures";
import { getStreamsForFixture, getPreviewStreamsForFixture } from "@/lib/streams.functions";
import { getMatchAccess } from "@/lib/payments.functions";
import { StreamPlayer } from "@/components/StreamPlayer";
import { useAuth } from "@/hooks/use-auth";
import { Radio, MapPin, Calendar, Flag, Goal, Square, ArrowLeftRight, User, Lock, LogIn } from "lucide-react";


const fixtureQuery = (id: string) =>
  queryOptions({
    queryKey: ["fixture", id],
    queryFn: () => getFixtureDetail({ data: { id } }),
    // Cache longer to ease api-football rate-limit pressure.
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });

const streamsQuery = (id: string) =>
  queryOptions({
    queryKey: ["streams", id],
    queryFn: () => getStreamsForFixture({ data: { fixtureId: Number(id) } }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

const accessQuery = (id: string) =>
  queryOptions({
    queryKey: ["match-access", id],
    queryFn: () => getMatchAccess({ data: { fixtureId: Number(id) } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/match/$id")({
  head: () => ({
    meta: [
      { title: "Match — Football Streaming" },
      { name: "description", content: "Live football match details, lineups and events." },
    ],
  }),
  errorComponent: ({ error, reset }) => <MatchError message={error.message} reset={reset} />,
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

const ANON_PREVIEW_SECONDS = 120;
const anonPreviewStorageKey = (fixtureId: string) => `anon-preview-used:${fixtureId}`;

function readAnonPreviewUsed(fixtureId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(anonPreviewStorageKey(fixtureId)) === "1";
  } catch {
    return false;
  }
}

function markAnonPreviewUsed(fixtureId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(anonPreviewStorageKey(fixtureId), "1");
  } catch {}
}

function MatchPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  // Fixture metadata is best-effort: when api-football rate-limits or fails,
  // we still render the player using stream rows from our DB so users can watch.
  const { data: fixtureData } = useQuery(fixtureQuery(id));
  const accessResult = useQuery({
    ...accessQuery(id),
    queryKey: ["match-access", id, session?.user?.id ?? "guest"],
    enabled: !authLoading,
    staleTime: 5_000,
  });
  const access = accessResult.data;
  const isAuthed = Boolean(session);
  const isPreviewMode = access?.access === "preview" && !access.hasAccess;
  const streamsResult = useQuery({
    ...streamsQuery(id),
    // Streams require authentication; wait for session restore to avoid 401s.
    enabled:
      !authLoading &&
      isAuthed &&
      (!access || !(access.access === "premium" && !access.hasAccess)),
  });

  // Anonymous 2-minute live preview: any visitor gets a short preview on any
  // live match. Fetches through the public preview server fn (no auth), and
  // localStorage records that the preview has been used per fixture.
  const [anonPreviewUsed, setAnonPreviewUsed] = useState<boolean>(() => readAnonPreviewUsed(id));
  useEffect(() => {
    setAnonPreviewUsed(readAnonPreviewUsed(id));
  }, [id]);
  const isPremiumAccess = access?.access === "premium";
  const anonEligible = !authLoading && !isAuthed && !anonPreviewUsed;
  const previewStreamsResult = useQuery({
    queryKey: ["preview-streams", id],
    queryFn: () => getPreviewStreamsForFixture({ data: { fixtureId: Number(id) } }),
    enabled: anonEligible,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const streams = isAuthed ? (streamsResult.data ?? []) : (previewStreamsResult.data ?? []);
  const match: import("@/lib/api-football.functions").FixtureDetail = fixtureData ?? {
    id,
    league: "",
    leagueLogo: "",
    homeTeam: "Home",
    awayTeam: "Away",
    homeLogo: "",
    awayLogo: "",
    kickoff: new Date().toISOString(),
    status: "live",
    homeScore: undefined,
    awayScore: undefined,
    minute: undefined,
    venue: undefined,
    referee: undefined,
    events: [],
    lineups: [],
    statistics: [],
  };
  const isLive = match.status === "live";
  const worldCupMatch = getWorldCup2026FixtureById(match.id);
  const homeTeam = worldCupMatch?.homeTeam ?? match.homeTeam;
  const awayTeam = worldCupMatch?.awayTeam ?? match.awayTeam;
  const homeLogo = worldCupMatch?.homeLogo || match.homeLogo?.trim() || getTeamFlagUrl(homeTeam);
  const awayLogo = worldCupMatch?.awayLogo || match.awayLogo?.trim() || getTeamFlagUrl(awayTeam);
  const kickoff = new Date(match.kickoff);
  const isPaidLocked = isAuthed && access?.access === "premium" && !access.hasAccess;
  const isScheduledLocked = Boolean(access?.available_from) && access?.isAvailable === false;
  const isMixLocked = isAuthed && access?.access === "mix" && !access.hasAccess;
  const showAdsNotice = isAuthed && access?.access === "ads";
  const playerSources = useMemo(
    () => streams.map((s) => ({ id: s.id, label: s.label, stream_type: s.stream_type, url: s.url })),
    [streams],
  );

  // Anonymous preview: 2-minute client-side countdown. When it hits zero we
  // record the preview as used for this fixture and route to /auth.
  const showAnonPreview = anonEligible && playerSources.length > 0;
  const [anonLeft, setAnonLeft] = useState<number>(ANON_PREVIEW_SECONDS);
  const anonRedirectedRef = useRef(false);
  useEffect(() => {
    if (!showAnonPreview) return;
    setAnonLeft(ANON_PREVIEW_SECONDS);
    const startedAt = Date.now();
    const t = window.setInterval(() => {
      const remaining = Math.max(0, ANON_PREVIEW_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setAnonLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(t);
        if (!anonRedirectedRef.current) {
          anonRedirectedRef.current = true;
          markAnonPreviewUsed(id);
          setAnonPreviewUsed(true);
          navigate({ to: "/auth", search: { redirect: `/match/${id}` } as never });
        }
      }
    }, 500);
    return () => window.clearInterval(t);
  }, [showAnonPreview, id, navigate]);

  // 2-minute preview countdown for signed-in "preview" access type users.
  const previewSeconds = isPreviewMode ? (access?.previewSeconds ?? 120) : 0;
  const [previewLeft, setPreviewLeft] = useState<number>(previewSeconds);
  useEffect(() => {
    if (!isPreviewMode) return;
    setPreviewLeft(previewSeconds);
    if (playerSources.length === 0) return;
    const startedAt = Date.now();
    const t = setInterval(() => {
      const remaining = Math.max(0, previewSeconds - Math.floor((Date.now() - startedAt) / 1000));
      setPreviewLeft(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [isPreviewMode, previewSeconds, playerSources.length]);
  const previewExpired = isPreviewMode && previewLeft <= 0 && playerSources.length > 0;





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
            <img src={homeLogo} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/40 bg-secondary p-1" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{homeTeam}</div>
          </div>
          <div className="font-display text-6xl sm:text-7xl">
            {match.status === "upcoming"
              ? kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : <span>{match.homeScore ?? 0} <span className="text-muted-foreground/40">:</span> {match.awayScore ?? 0}</span>}
          </div>
          <div className="flex flex-col items-center text-center">
            <img src={awayLogo} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/40 bg-secondary p-1" />
            <div className="mt-4 font-display text-2xl sm:text-3xl">{awayTeam}</div>
          </div>
        </div>

        <div className="mt-8">
          {authLoading || accessResult.isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Checking your access…</p>
            </div>
          ) : !isAuthed && showAnonPreview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Free preview — <span className="font-display text-foreground">{Math.floor(anonLeft / 60)}:{String(anonLeft % 60).padStart(2, "0")}</span> remaining. Sign in to keep watching (it's free).
                </span>
                <Link
                  to="/auth"
                  search={{ redirect: `/match/${id}` } as never}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </Link>
              </div>
              <StreamPlayer
                sources={playerSources}
                isLive={isLive}
                placeholder={
                  isLive ? "NO STREAM AVAILABLE" :
                  match.status === "upcoming" ? "STREAM STARTS AT KICKOFF" : "MATCH HIGHLIGHTS"
                }
              />
            </div>
          ) : !isAuthed && isPremiumAccess ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Premium match</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This match requires a plan. Sign in and unlock instant access.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/auth"
                  search={{ redirect: `/match/${id}` } as never}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <Lock className="h-4 w-4" />
                  View plans
                </Link>
              </div>
            </div>
          ) : !isAuthed ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <LogIn className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Sign in to keep watching</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your free 2-minute preview is over. Sign in — it's free — to watch the full live match.
              </p>
              <Link
                to="/auth"
                search={{ redirect: `/match/${id}` } as never}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Sign in to watch live
              </Link>
            </div>
          ) : isScheduledLocked ? (

            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Stream opens soon</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This match unlocks at{" "}
                <span className="font-display text-foreground">
                  {new Date(access!.available_from!).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
                .
              </p>
            </div>
          ) : isPaidLocked ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Premium match</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Unlock the live stream for this match — one-time payment, instant access.
              </p>
              <Link
                to="/pricing"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="h-4 w-4" />
                View plans to unlock
              </Link>
            </div>
          ) : previewExpired ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl">Preview ended</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your free 2-minute preview is over. Choose a plan to keep watching the full match.
              </p>
              <Link
                to="/pricing"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="h-4 w-4" />
                View plans to continue
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {showAdsNotice && (
                <div className="rounded-lg border border-border/60 bg-card/60 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Ad-supported stream — playback may include ads.
                </div>
              )}
              {isPreviewMode && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Free preview — <span className="font-display text-foreground">{Math.floor(previewLeft / 60)}:{String(previewLeft % 60).padStart(2, "0")}</span> remaining. Subscribe to keep watching.
                  </span>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    View plans
                  </Link>
                </div>
              )}
              {isMixLocked && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Showing free streams. Premium streams for this match are locked.
                  </span>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    View plans
                  </Link>
                </div>
              )}
              <StreamPlayer
                sources={playerSources}
                isLive={isLive}
                placeholder={
                  isLive ? "NO STREAM AVAILABLE" :
                  match.status === "upcoming" ? "STREAM STARTS AT KICKOFF" : "MATCH HIGHLIGHTS"
                }
              />
            </div>
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

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function MatchError({ message, reset }: { message: string; reset: () => void }) {
  const router = useRouter();
  const rateLimited = /too many requests|rate/i.test(message);
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl">
          {rateLimited ? "Stream temporarily busy" : "Couldn't load match"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {rateLimited
            ? "We're hitting the live data provider's rate limit. Please try again in a moment."
            : message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <Link to="/" className="rounded-md border border-border/60 px-5 py-3 font-semibold">
            Back home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
