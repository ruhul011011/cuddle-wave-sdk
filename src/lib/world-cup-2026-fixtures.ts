export type WorldCup2026Fixture = {
  id: string;
  league: string;
  leagueLogo: string;
  leagueCountry?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  kickoff: string;
  status: "live" | "upcoming" | "finished";
  venue?: string;
};

const RAW_WORLD_CUP_2026 = `
1489369|2026-06-11T19:00:00+00:00|Mexico|South Africa|Estadio Banorte
1538999|2026-06-12T02:00:00+00:00|South Korea|Czechia|Estadio Akron
1539000|2026-06-12T19:00:00+00:00|Canada|Bosnia & Herzegovina|BMO Field
1489370|2026-06-13T01:00:00+00:00|USA|Paraguay|SoFi Stadium
1489373|2026-06-13T19:00:00+00:00|Qatar|Switzerland|Levi's Stadium
1489371|2026-06-13T22:00:00+00:00|Brazil|Morocco|MetLife Stadium
1489372|2026-06-14T01:00:00+00:00|Haiti|Scotland|Gillette Stadium
1539001|2026-06-14T04:00:00+00:00|Australia|Türkiye|BC Place
1489374|2026-06-14T17:00:00+00:00|Germany|Curaçao|NRG Stadium
1489376|2026-06-14T20:00:00+00:00|Netherlands|Japan|AT&T Stadium
1489375|2026-06-14T23:00:00+00:00|Ivory Coast|Ecuador|Lincoln Financial Field
1539002|2026-06-15T02:00:00+00:00|Sweden|Tunisia|Estadio BBVA
1489380|2026-06-15T16:00:00+00:00|Spain|Cape Verde Islands|Mercedes-Benz Stadium
1489377|2026-06-15T19:00:00+00:00|Belgium|Egypt|Lumen Field
1489379|2026-06-15T22:00:00+00:00|Saudi Arabia|Uruguay|Hard Rock Stadium
1489378|2026-06-16T01:00:00+00:00|Iran|New Zealand|SoFi Stadium
1489383|2026-06-16T19:00:00+00:00|France|Senegal|MetLife Stadium
1539016|2026-06-16T22:00:00+00:00|Iraq|Norway|Gillette Stadium
1489381|2026-06-17T01:00:00+00:00|Argentina|Algeria|Arrowhead Stadium
1489382|2026-06-17T04:00:00+00:00|Austria|Jordan|Levi's Stadium
1539003|2026-06-17T17:00:00+00:00|Portugal|Congo DR|NRG Stadium
1489384|2026-06-17T20:00:00+00:00|England|Croatia|AT&T Stadium
1489385|2026-06-17T23:00:00+00:00|Ghana|Panama|BMO Field
1489386|2026-06-18T02:00:00+00:00|Uzbekistan|Colombia|Estadio Banorte
1539004|2026-06-18T16:00:00+00:00|Czechia|South Africa|Mercedes-Benz Stadium
1539005|2026-06-18T19:00:00+00:00|Switzerland|Bosnia & Herzegovina|SoFi Stadium
1489387|2026-06-18T22:00:00+00:00|Canada|Qatar|BC Place
1489388|2026-06-19T01:00:00+00:00|Mexico|South Korea|Estadio Akron
1489391|2026-06-19T19:00:00+00:00|USA|Australia|Lumen Field
1489390|2026-06-19T22:00:00+00:00|Scotland|Morocco|Gillette Stadium
1489389|2026-06-20T00:30:00+00:00|Brazil|Haiti|Lincoln Financial Field
1539006|2026-06-20T03:00:00+00:00|Türkiye|Paraguay|Levi's Stadium
1539007|2026-06-20T17:00:00+00:00|Netherlands|Sweden|NRG Stadium
1489393|2026-06-20T20:00:00+00:00|Germany|Ivory Coast|BMO Field
1489392|2026-06-21T00:00:00+00:00|Ecuador|Curaçao|Arrowhead Stadium
1489394|2026-06-21T04:00:00+00:00|Tunisia|Japan|Estadio BBVA
1489397|2026-06-21T16:00:00+00:00|Spain|Saudi Arabia|Mercedes-Benz Stadium
1489395|2026-06-21T19:00:00+00:00|Belgium|Iran|SoFi Stadium
1489398|2026-06-21T22:00:00+00:00|Uruguay|Cape Verde Islands|Hard Rock Stadium
1489396|2026-06-22T01:00:00+00:00|New Zealand|Egypt|BC Place
1489399|2026-06-22T17:00:00+00:00|Argentina|Austria|AT&T Stadium
1539017|2026-06-22T21:00:00+00:00|France|Iraq|Lincoln Financial Field
1489401|2026-06-23T00:00:00+00:00|Norway|Senegal|MetLife Stadium
1489400|2026-06-23T03:00:00+00:00|Jordan|Algeria|Levi's Stadium
1489404|2026-06-23T17:00:00+00:00|Portugal|Uzbekistan|NRG Stadium
1489402|2026-06-23T20:00:00+00:00|England|Ghana|Gillette Stadium
1489403|2026-06-23T23:00:00+00:00|Panama|Croatia|BMO Field
1539008|2026-06-24T02:00:00+00:00|Colombia|Congo DR|Estadio Akron
1489408|2026-06-24T19:00:00+00:00|Switzerland|Canada|BC Place
1539009|2026-06-24T19:00:00+00:00|Bosnia & Herzegovina|Qatar|Lumen Field
1489405|2026-06-24T22:00:00+00:00|Morocco|Haiti|Mercedes-Benz Stadium
1489406|2026-06-24T22:00:00+00:00|Scotland|Brazil|Hard Rock Stadium
1539010|2026-06-25T01:00:00+00:00|Czechia|Mexico|Estadio Banorte
1489407|2026-06-25T01:00:00+00:00|South Africa|South Korea|Estadio BBVA
1489410|2026-06-25T20:00:00+00:00|Ecuador|Germany|MetLife Stadium
1489409|2026-06-25T20:00:00+00:00|Curaçao|Ivory Coast|Lincoln Financial Field
1539011|2026-06-25T23:00:00+00:00|Japan|Sweden|AT&T Stadium
1489412|2026-06-25T23:00:00+00:00|Tunisia|Netherlands|Arrowhead Stadium
1539012|2026-06-26T02:00:00+00:00|Türkiye|USA|SoFi Stadium
1489411|2026-06-26T02:00:00+00:00|Paraguay|Australia|Levi's Stadium
1539074|2026-06-26T19:00:00+00:00|Senegal|Iraq|BMO Field
1489416|2026-06-26T19:00:00+00:00|Norway|France|Gillette Stadium
1489417|2026-06-27T00:00:00+00:00|Uruguay|Spain|Estadio Akron
1489413|2026-06-27T00:00:00+00:00|Cape Verde Islands|Saudi Arabia|NRG Stadium
1489414|2026-06-27T03:00:00+00:00|Egypt|Iran|Lumen Field
1489415|2026-06-27T03:00:00+00:00|New Zealand|Belgium|BC Place
1489420|2026-06-27T21:00:00+00:00|Croatia|Ghana|Lincoln Financial Field
1489422|2026-06-27T21:00:00+00:00|Panama|England|MetLife Stadium
1489419|2026-06-27T23:30:00+00:00|Colombia|Portugal|Hard Rock Stadium
1539013|2026-06-27T23:30:00+00:00|Congo DR|Uzbekistan|Mercedes-Benz Stadium
1489418|2026-06-28T02:00:00+00:00|Algeria|Austria|Arrowhead Stadium
1489421|2026-06-28T02:00:00+00:00|Jordan|Argentina|AT&T Stadium
1561329|2026-06-28T19:00:00+00:00|South Africa|Canada|SoFi Stadium
400021513|2026-06-29T16:30:00+00:00|Germany|Paraguay|Boston Stadium
400021522|2026-06-29T21:00:00+00:00|Netherlands|Morocco|Estadio Monterrey
400021516|2026-06-29T13:00:00+00:00|Brazil|Japan|Houston Stadium
400021523|2026-06-30T17:00:00+00:00|France|Sweden|New York New Jersey Stadium
400021514|2026-06-30T13:00:00+00:00|Côte d'Ivoire|Norway|Dallas Stadium
400021520|2026-06-30T21:00:00+00:00|Mexico|Ecuador|Mexico City Stadium
400021512|2026-07-01T12:00:00+00:00|England|Congo DR|Atlanta Stadium
400021524|2026-07-01T20:00:00+00:00|USA|Bosnia and Herzegovina|San Francisco Bay Area Stadium
400021525|2026-07-01T16:00:00+00:00|Belgium|Senegal|Seattle Stadium
400021526|2026-07-02T19:00:00+00:00|Portugal|Croatia|Toronto Stadium
400021519|2026-07-02T15:00:00+00:00|Spain|Austria|Los Angeles Stadium
400021527|2026-07-02T23:00:00+00:00|Switzerland|Algeria|BC Place Vancouver
400021521|2026-07-03T14:00:00+00:00|Argentina|Cabo Verde|Miami Stadium
400021517|2026-07-03T18:00:00+00:00|Colombia|Ghana|Kansas City Stadium
400021515|2026-07-03T21:30:00+00:00|Australia|Egypt|Dallas Stadium
1567310|2026-07-04T01:30:00+00:00|Colombia|Ghana|Arrowhead Stadium
1567824|2026-07-04T17:00:00+00:00|Canada|Morocco|NRG Stadium
1569870|2026-07-04T21:00:00+00:00|Paraguay|France|Lincoln Financial Field
1568100|2026-07-05T20:00:00+00:00|Brazil|Norway|MetLife Stadium
1570714|2026-07-06T00:00:00+00:00|Mexico|England|Estadio Banorte
1576756|2026-07-06T19:00:00+00:00|Portugal|Spain|
1570715|2026-07-07T00:00:00+00:00|USA|Belgium|Lumen Field
1576804|2026-07-07T16:00:00+00:00|Argentina|Egypt|
1576805|2026-07-07T20:00:00+00:00|Switzerland|Colombia|
400021536|2026-07-09T16:00:00+00:00|W89|W90|
400021538|2026-07-10T15:00:00+00:00|W93|W94|
400021539|2026-07-11T17:00:00+00:00|W91|W92|
400021537|2026-07-11T21:00:00+00:00|W95|W96|
400021541|2026-07-14T15:00:00+00:00|W97|W98|
400021540|2026-07-15T15:00:00+00:00|W99|W100|
400021542|2026-07-18T17:00:00+00:00|RU101|RU102|
400021543|2026-07-19T15:00:00+00:00|W101|W102|
`.trim();

// ISO 3166-1 alpha-2 codes powering flagcdn.com fallback logos.
// Used when api-football is unavailable (e.g. self-hosted VPS without API key).
const TEAM_FLAG_CODES: Record<string, string> = {
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czechia": "cz",
  "Canada": "ca", "Bosnia & Herzegovina": "ba", "Bosnia and Herzegovina": "ba", "USA": "us", "Paraguay": "py",
  "Qatar": "qa", "Switzerland": "ch", "Brazil": "br", "Morocco": "ma",
  "Haiti": "ht", "Scotland": "gb-sct", "Australia": "au", "Türkiye": "tr",
  "Germany": "de", "Curaçao": "cw", "Netherlands": "nl", "Japan": "jp",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci", "Côte d’Ivoire": "ci", "Ecuador": "ec", "Sweden": "se", "Tunisia": "tn",
  "Spain": "es", "Cape Verde Islands": "cv", "Cabo Verde": "cv", "Belgium": "be", "Egypt": "eg",
  "Saudi Arabia": "sa", "Uruguay": "uy", "Iran": "ir", "New Zealand": "nz",
  "France": "fr", "Senegal": "sn", "Iraq": "iq", "Norway": "no",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordan": "jo",
  "Portugal": "pt", "Congo DR": "cd", "England": "gb-eng", "Croatia": "hr",
  "Ghana": "gh", "Panama": "pa", "Uzbekistan": "uz", "Colombia": "co",
};

function flagUrl(team: string): string {
  const code = TEAM_FLAG_CODES[team];
  if (code) return `https://flagcdn.com/w80/${code}.png`;
  // Placeholder logo for TBD teams (e.g. "W75" = winner of match 75) so the
  // fixture card still shows a visible avatar next to the label.
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(team || "TBD")}&backgroundType=gradientLinear&backgroundColor=991b1b,1e1e5a&fontWeight=700`;
}

export function getTeamFlagUrl(team: string): string {
  return flagUrl(team);
}

// Turn cryptic bracket codes like "W75" / "L12" / "1A" into human labels so
// placeholder knockout fixtures don't look like broken data.
function humanizeTeam(team: string): string {
  const raw = (team ?? "").trim();
  if (!raw) return "TBD";
  let m = raw.match(/^W(\d+)$/i);
  if (m) return `Winner Match ${m[1]}`;
  m = raw.match(/^L(\d+)$/i);
  if (m) return `Loser Match ${m[1]}`;
  m = raw.match(/^([12])([A-L])$/i);
  if (m) return `${m[1] === "1" ? "Winner" : "Runner-up"} Group ${m[2].toUpperCase()}`;
  m = raw.match(/^3([A-L]+)$/i);
  if (m) return `3rd Place Group ${m[1].toUpperCase()}`;
  return raw;
}

const ALL_WORLD_CUP_2026_FIXTURES: WorldCup2026Fixture[] = RAW_WORLD_CUP_2026.split("\n")
  .map((line) => {
    const [id, kickoff, homeRaw, awayRaw, venue] = line.split("|");
    const homeTeam = humanizeTeam(homeRaw);
    const awayTeam = humanizeTeam(awayRaw);
    return {
      id,
      league: "World Cup",
      leagueLogo: "",
      leagueCountry: "World",
      homeTeam,
      awayTeam,
      homeLogo: flagUrl(homeRaw),
      awayLogo: flagUrl(awayRaw),
      kickoff,
      status: "upcoming" as const,
      venue,
    };
  })
  .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

function makeFixture(id: string, kickoff: string, homeRaw: string, awayRaw: string, venue = ""): WorldCup2026Fixture {
  const homeTeam = humanizeTeam(homeRaw);
  const awayTeam = humanizeTeam(awayRaw);
  return {
    id,
    league: "World Cup",
    leagueLogo: "",
    leagueCountry: "World",
    homeTeam,
    awayTeam,
    homeLogo: flagUrl(homeRaw),
    awayLogo: flagUrl(awayRaw),
    kickoff,
    status: "upcoming",
    venue,
  };
}

// Some existing live-stream rows were created with an older fixture feed whose
// knockout IDs no longer exist upstream. Keep those IDs usable for streams, but
// display the resolved country teams/flags from the current World Cup feed.
const LEGACY_WORLD_CUP_2026_BY_ID: Record<string, WorldCup2026Fixture> = {
  "400021530": makeFixture("400021530", "2026-07-04T01:30:00+00:00", "Colombia", "Ghana", "Arrowhead Stadium"),
  "400021533": makeFixture("400021533", "2026-07-04T17:00:00+00:00", "Canada", "Morocco", "NRG Stadium"),
  "400021532": makeFixture("400021532", "2026-07-04T21:00:00+00:00", "Paraguay", "France", "Lincoln Financial Field"),
  "400021531": makeFixture("400021531", "2026-07-05T20:00:00+00:00", "Brazil", "Norway", "MetLife Stadium"),
  "400021529": makeFixture("400021529", "2026-07-06T00:00:00+00:00", "Mexico", "England", "Estadio Banorte"),
  "400021534": makeFixture("400021534", "2026-07-06T19:00:00+00:00", "Portugal", "Spain"),
  "400021528": makeFixture("400021528", "2026-07-07T00:00:00+00:00", "USA", "Belgium", "Lumen Field"),
  "400021535": makeFixture("400021535", "2026-07-07T16:00:00+00:00", "Argentina", "Egypt"),
};

export function getWorldCup2026FallbackFixtures(date?: string, windowDays = 0): WorldCup2026Fixture[] {
  if (!date) return ALL_WORLD_CUP_2026_FIXTURES;

  const exact = ALL_WORLD_CUP_2026_FIXTURES.filter((match) => match.kickoff.slice(0, 10) === date);
  if (exact.length || windowDays <= 0) return exact;

  const target = Date.parse(`${date}T12:00:00Z`);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return ALL_WORLD_CUP_2026_FIXTURES.filter((match) => {
    const kickoff = Date.parse(match.kickoff);
    return Number.isFinite(kickoff) && Math.abs(kickoff - target) <= windowMs;
  });
}

export function getWorldCup2026FixtureById(id: string | number): WorldCup2026Fixture | undefined {
  const key = String(id);
  return ALL_WORLD_CUP_2026_FIXTURES.find((fixture) => fixture.id === key) ?? LEGACY_WORLD_CUP_2026_BY_ID[key];
}