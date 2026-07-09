import { describe, expect, it } from "vitest";
import { resolveMatchVisuals } from "./match-visuals";
import { getTeamFlagUrl, getWorldCup2026FixtureById } from "./world-cup-2026-fixtures";
import type { Match } from "./matches";

// A legacy WC id that we know maps to Brazil vs Norway via the WC dataset.
const WC_ID = "400021531";

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: "no-such-fixture-id",
    league: "Friendly",
    leagueLogo: "",
    homeTeam: "Testland",
    awayTeam: "Otherland",
    homeLogo: "",
    awayLogo: "",
    kickoff: "2026-07-05T20:00:00+00:00",
    status: "upcoming",
    ...overrides,
  };
}

describe("resolveMatchVisuals — live vs upcoming parity", () => {
  it("resolves W89/W90 quarter-final entrants to real team ids and API logo URLs", () => {
    const fixture = getWorldCup2026FixtureById("400021536");

    expect(fixture).toBeDefined();
    expect(fixture!.homeTeam).toBe("Colombia");
    expect(fixture!.awayTeam).toBe("Morocco");
    expect(fixture!.homeTeamId).toBe(8);
    expect(fixture!.awayTeamId).toBe(31);
    expect(fixture!.homeLogo).toBe("https://media.api-sports.io/football/teams/8.png");
    expect(fixture!.awayLogo).toBe("https://media.api-sports.io/football/teams/31.png");
  });

  it("returns identical visuals for a live and upcoming fixture when logos are blank", () => {
    const upcoming = makeMatch({ id: WC_ID, status: "upcoming", homeLogo: "", awayLogo: "" });
    const live = makeMatch({ id: WC_ID, status: "live", homeLogo: "", awayLogo: "", minute: "45'" });

    const a = resolveMatchVisuals(upcoming);
    const b = resolveMatchVisuals(live);

    expect(b.homeLogo).toBe(a.homeLogo);
    expect(b.awayLogo).toBe(a.awayLogo);
    expect(b.homeTeam).toBe(a.homeTeam);
    expect(b.awayTeam).toBe(a.awayTeam);
    expect(b.homeLogoSource).toBe(a.homeLogoSource);
    expect(b.awayLogoSource).toBe(a.awayLogoSource);
    expect(b.wcFallbackApplied).toBe(true);
  });

  it("uses the WC dataset logo when the fixture id is known", () => {
    const wc = getWorldCup2026FixtureById(WC_ID);
    expect(wc).toBeDefined();

    const live = makeMatch({ id: WC_ID, status: "live", homeLogo: "   ", awayLogo: "" });
    const visuals = resolveMatchVisuals(live);

    expect(visuals.homeLogo).toBe(wc!.homeLogo);
    expect(visuals.awayLogo).toBe(wc!.awayLogo);
    expect(visuals.homeLogoSource).toBe("wc-dataset");
    expect(visuals.awayLogoSource).toBe("wc-dataset");
  });

  it("falls back to the team flag URL for unknown fixtures with blank logos", () => {
    const live = makeMatch({
      id: "unknown-fixture-999",
      status: "live",
      homeTeam: "Brazil",
      awayTeam: "Norway",
      homeLogo: "",
      awayLogo: "",
    });
    const upcoming = { ...live, status: "upcoming" as const };

    const liveVis = resolveMatchVisuals(live);
    const upcomingVis = resolveMatchVisuals(upcoming);

    expect(liveVis.homeLogo).toBe(getTeamFlagUrl("Brazil"));
    expect(liveVis.awayLogo).toBe(getTeamFlagUrl("Norway"));
    expect(liveVis.homeLogoSource).toBe("flag-fallback");
    expect(liveVis.awayLogoSource).toBe("flag-fallback");
    expect(liveVis).toEqual(upcomingVis);
  });

  it("prefers a real api-football logo over the flag fallback for unknown fixtures", () => {
    const apiHome = "https://media.api-sports.io/football/teams/6.png";
    const apiAway = "https://media.api-sports.io/football/teams/26.png";
    const live = makeMatch({
      id: "unknown-fixture-1000",
      status: "live",
      homeTeam: "Brazil",
      awayTeam: "Norway",
      homeLogo: apiHome,
      awayLogo: apiAway,
    });

    const visuals = resolveMatchVisuals(live);
    expect(visuals.homeLogo).toBe(apiHome);
    expect(visuals.awayLogo).toBe(apiAway);
    expect(visuals.homeLogoSource).toBe("api-football");
    expect(visuals.awayLogoSource).toBe("api-football");
    expect(visuals.wcFallbackApplied).toBe(false);
  });
});
