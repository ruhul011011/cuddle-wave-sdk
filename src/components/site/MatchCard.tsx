import { Link } from "@tanstack/react-router";
import type { Match } from "@/lib/matches";
import { getTeamFlagUrl, getWorldCup2026FixtureById } from "@/lib/world-cup-2026-fixtures";
import { Play } from "lucide-react";

function timeLabel(m: Match) {
  if (m.status === "live") return m.minute ?? "LIVE";
  if (m.status === "finished") return "FT";
  const d = new Date(m.kickoff);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const worldCupMatch = getWorldCup2026FixtureById(match.id);
  const homeTeam = worldCupMatch?.homeTeam ?? match.homeTeam;
  const awayTeam = worldCupMatch?.awayTeam ?? match.awayTeam;
  const rawHome = match.homeLogo?.trim();
  const rawAway = match.awayLogo?.trim();
  const homeLogo = worldCupMatch?.homeLogo || rawHome || getTeamFlagUrl(homeTeam);
  const awayLogo = worldCupMatch?.awayLogo || rawAway || getTeamFlagUrl(awayTeam);

  if (isLive && typeof window !== "undefined") {
    const homeSource = worldCupMatch?.homeLogo
      ? "wc-dataset"
      : rawHome
        ? "api-football"
        : "flag-fallback";
    const awaySource = worldCupMatch?.awayLogo
      ? "wc-dataset"
      : rawAway
        ? "api-football"
        : "flag-fallback";
    // eslint-disable-next-line no-console
    console.debug("[live-fixture logo]", {
      id: match.id,
      wcFallback: Boolean(worldCupMatch),
      home: { team: homeTeam, url: homeLogo, source: homeSource, apiUrl: match.homeLogo },
      away: { team: awayTeam, url: awayLogo, source: awaySource, apiUrl: match.awayLogo },
    });
  }
  return (
    <Link
      to="/match/$id"
      params={{ id: match.id }}
      className="group relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_oklch(0.58_0.22_275/0.5)]"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {match.leagueLogo && <img src={match.leagueLogo} alt="" className="h-4 w-4 rounded-sm" />}
          <span className="font-medium">{match.league}</span>
        </div>
        {isLive ? (
          <span className="live-dot font-display tracking-wider text-live">{match.minute}</span>
        ) : match.status === "finished" ? (
          <span className="font-display tracking-wider text-muted-foreground">FT</span>
        ) : (
          <span className="font-display tracking-wider text-foreground">{timeLabel(match)}</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center text-center">
          <img src={homeLogo} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-border/60" />
          <div className="mt-2 text-sm font-semibold leading-tight">{homeTeam}</div>
        </div>
        <div className="font-display text-3xl tracking-wider text-foreground">
          {match.status === "upcoming" ? (
            <span className="text-muted-foreground/60">vs</span>
          ) : (
            <span>{match.homeScore} <span className="text-muted-foreground/60">:</span> {match.awayScore}</span>
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <img src={awayLogo} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-border/60" />
          <div className="mt-2 text-sm font-semibold leading-tight">{awayTeam}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span>{match.venue}</span>
        <span className="inline-flex items-center gap-1 font-display tracking-wider text-primary group-hover:translate-x-0.5 transition-transform">
          <Play className="h-3 w-3 fill-current" /> WATCH
        </span>
      </div>
    </Link>
  );
}
