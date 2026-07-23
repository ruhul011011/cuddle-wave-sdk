import type { Match } from "@/lib/matches";
import { getTeamFlagUrl } from "@/lib/team-flags";

export type ResolvedMatchVisuals = {
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeLogoSource: "api-football" | "flag-fallback";
  awayLogoSource: "api-football" | "flag-fallback";
};

/**
 * Resolve team names and logo URLs the UI should render for a fixture.
 * The same resolution runs for every match regardless of status (live,
 * upcoming, finished) so live cards get the identical flag fallback as
 * upcoming cards when the API returns blank logos.
 */
export function resolveMatchVisuals(match: Match): ResolvedMatchVisuals {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;

  const rawHome = match.homeLogo?.trim();
  const rawAway = match.awayLogo?.trim();

  const homeLogo = rawHome || getTeamFlagUrl(homeTeam);
  const awayLogo = rawAway || getTeamFlagUrl(awayTeam);

  return {
    homeTeam,
    awayTeam,
    homeLogo,
    awayLogo,
    homeLogoSource: rawHome ? "api-football" : "flag-fallback",
    awayLogoSource: rawAway ? "api-football" : "flag-fallback",
  };
}
