import type { Match } from "@/lib/matches";
import { getTeamFlagUrl, getWorldCup2026FixtureById } from "@/lib/world-cup-2026-fixtures";

export type ResolvedMatchVisuals = {
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeLogoSource: "wc-dataset" | "api-football" | "flag-fallback";
  awayLogoSource: "wc-dataset" | "api-football" | "flag-fallback";
  wcFallbackApplied: boolean;
};

/**
 * Resolve the team names and logo URLs the UI should render for a fixture.
 *
 * The same resolution runs for every match regardless of status (live,
 * upcoming, finished) so live cards get the identical WC/flag fallback as
 * upcoming cards when the API returns blank logos.
 */
export function resolveMatchVisuals(match: Match): ResolvedMatchVisuals {
  const wc = getWorldCup2026FixtureById(match.id);
  const homeTeam = wc?.homeTeam ?? match.homeTeam;
  const awayTeam = wc?.awayTeam ?? match.awayTeam;

  const rawHome = match.homeLogo?.trim();
  const rawAway = match.awayLogo?.trim();

  const homeLogo = wc?.homeLogo || rawHome || getTeamFlagUrl(homeTeam);
  const awayLogo = wc?.awayLogo || rawAway || getTeamFlagUrl(awayTeam);

  return {
    homeTeam,
    awayTeam,
    homeLogo,
    awayLogo,
    homeLogoSource: wc?.homeLogo ? "wc-dataset" : rawHome ? "api-football" : "flag-fallback",
    awayLogoSource: wc?.awayLogo ? "wc-dataset" : rawAway ? "api-football" : "flag-fallback",
    wcFallbackApplied: Boolean(wc),
  };
}
