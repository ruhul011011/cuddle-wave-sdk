export type MatchStatus = "live" | "upcoming" | "finished";

export type Match = {
  id: string;
  league: string;
  leagueLogo: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  kickoff: string; // ISO with explicit UTC
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  venue?: string;
};

const flag = (code: string) =>
  `https://flagcdn.com/w80/${code}.png`;

const teamLogo = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=991b1b,1e1e5a&fontWeight=700`;

const leagueLogo = (name: string) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}&backgroundColor=ef4444,991b1b,4f46e5`;

// Static dates so SSR & client render identical strings (no hydration mismatch)
export const matches: Match[] = [
  {
    id: "usa-mex",
    league: "FIFA World Cup 2026",
    leagueLogo: leagueLogo("WC26"),
    homeTeam: "USA",
    awayTeam: "Mexico",
    homeLogo: flag("us"),
    awayLogo: flag("mx"),
    kickoff: "2026-06-23T18:00:00Z",
    status: "live",
    homeScore: 2,
    awayScore: 1,
    minute: "71'",
    venue: "MetLife Stadium, New Jersey",
  },
  {
    id: "bra-arg",
    league: "FIFA World Cup 2026",
    leagueLogo: leagueLogo("WC26"),
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    homeLogo: flag("br"),
    awayLogo: flag("ar"),
    kickoff: "2026-06-23T20:00:00Z",
    status: "live",
    homeScore: 1,
    awayScore: 1,
    minute: "55'",
    venue: "AT&T Stadium, Dallas",
  },
  {
    id: "fra-ger",
    league: "FIFA World Cup 2026",
    leagueLogo: leagueLogo("WC26"),
    homeTeam: "France",
    awayTeam: "Germany",
    homeLogo: flag("fr"),
    awayLogo: flag("de"),
    kickoff: "2026-06-23T19:30:00Z",
    status: "live",
    homeScore: 0,
    awayScore: 0,
    minute: "23'",
    venue: "Estadio Azteca, Mexico City",
  },
  {
    id: "por-uzb",
    league: "World Cup",
    leagueLogo: leagueLogo("WC"),
    homeTeam: "Portugal",
    awayTeam: "Uzbekistan",
    homeLogo: flag("pt"),
    awayLogo: flag("uz"),
    kickoff: "2026-06-23T13:00:00Z",
    status: "upcoming",
    venue: "Lusail Stadium",
  },
  {
    id: "eng-gha",
    league: "World Cup",
    leagueLogo: leagueLogo("WC"),
    homeTeam: "England",
    awayTeam: "Ghana",
    homeLogo: flag("gb-eng"),
    awayLogo: flag("gh"),
    kickoff: "2026-06-23T16:00:00Z",
    status: "upcoming",
    venue: "Wembley Stadium",
  },
  {
    id: "pan-cro",
    league: "World Cup",
    leagueLogo: leagueLogo("WC"),
    homeTeam: "Panama",
    awayTeam: "Croatia",
    homeLogo: flag("pa"),
    awayLogo: flag("hr"),
    kickoff: "2026-06-23T19:00:00Z",
    status: "upcoming",
    venue: "Estadio Rommel Fernández",
  },
  {
    id: "mci-liv",
    league: "Premier League",
    leagueLogo: leagueLogo("PL"),
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    homeLogo: teamLogo("MCI"),
    awayLogo: teamLogo("LIV"),
    kickoff: "2026-06-23T20:00:00Z",
    status: "live",
    homeScore: 1,
    awayScore: 1,
    minute: "62'",
    venue: "Etihad Stadium",
  },
  {
    id: "rma-bar",
    league: "La Liga",
    leagueLogo: leagueLogo("LL"),
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeLogo: teamLogo("RMA"),
    awayLogo: teamLogo("BAR"),
    kickoff: "2026-06-23T20:30:00Z",
    status: "live",
    homeScore: 2,
    awayScore: 0,
    minute: "38'",
    venue: "Santiago Bernabéu",
  },
  {
    id: "bay-dor",
    league: "Bundesliga",
    leagueLogo: leagueLogo("BL"),
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    homeLogo: teamLogo("BAY"),
    awayLogo: teamLogo("DOR"),
    kickoff: "2026-06-24T18:30:00Z",
    status: "upcoming",
    venue: "Allianz Arena",
  },
  {
    id: "psg-mar",
    league: "Ligue 1",
    leagueLogo: leagueLogo("L1"),
    homeTeam: "PSG",
    awayTeam: "Marseille",
    homeLogo: teamLogo("PSG"),
    awayLogo: teamLogo("MAR"),
    kickoff: "2026-06-24T20:00:00Z",
    status: "upcoming",
    venue: "Parc des Princes",
  },
  {
    id: "juv-int",
    league: "Serie A",
    leagueLogo: leagueLogo("SA"),
    homeTeam: "Juventus",
    awayTeam: "Inter",
    homeLogo: teamLogo("JUV"),
    awayLogo: teamLogo("INT"),
    kickoff: "2026-06-25T18:45:00Z",
    status: "upcoming",
    venue: "Allianz Stadium",
  },
  {
    id: "ars-che",
    league: "Premier League",
    leagueLogo: leagueLogo("PL"),
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    homeLogo: teamLogo("ARS"),
    awayLogo: teamLogo("CHE"),
    kickoff: "2026-06-25T20:00:00Z",
    status: "upcoming",
    venue: "Emirates Stadium",
  },
  {
    id: "atl-sev",
    league: "La Liga",
    leagueLogo: leagueLogo("LL"),
    homeTeam: "Atlético Madrid",
    awayTeam: "Sevilla",
    homeLogo: teamLogo("ATM"),
    awayLogo: teamLogo("SEV"),
    kickoff: "2026-06-26T19:00:00Z",
    status: "upcoming",
    venue: "Metropolitano",
  },
  {
    id: "mun-tot",
    league: "Premier League",
    leagueLogo: leagueLogo("PL"),
    homeTeam: "Man United",
    awayTeam: "Tottenham",
    homeLogo: teamLogo("MUN"),
    awayLogo: teamLogo("TOT"),
    kickoff: "2026-06-22T15:00:00Z",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
    venue: "Old Trafford",
  },
  {
    id: "nap-mil",
    league: "Serie A",
    leagueLogo: leagueLogo("SA"),
    homeTeam: "Napoli",
    awayTeam: "AC Milan",
    homeLogo: teamLogo("NAP"),
    awayLogo: teamLogo("MIL"),
    kickoff: "2026-06-22T18:00:00Z",
    status: "finished",
    homeScore: 0,
    awayScore: 0,
    venue: "Diego Maradona",
  },
];

// Deterministic time format — same on server and client
export function formatKickoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatKickoffDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export type LeagueInfo = {
  id: string;
  name: string;
  short: string;
  country: string;
  matches: number;
  logo: string;
  accent: string; // tailwind gradient classes
};

export const popularLeagues: LeagueInfo[] = [
  { id: "ucl", name: "UEFA Champions League", short: "UCL", country: "Europe", matches: 92, logo: leagueLogo("UCL"), accent: "from-indigo-600/40 to-indigo-900/60" },
  { id: "uel", name: "UEFA Europa League", short: "UEL", country: "Europe", matches: 20, logo: leagueLogo("UEL"), accent: "from-orange-500/40 to-orange-900/60" },
  { id: "epl", name: "Premier League", short: "EPL", country: "England", matches: 153, logo: leagueLogo("EPL"), accent: "from-purple-600/40 to-fuchsia-900/60" },
  { id: "laliga", name: "La Liga", short: "LL", country: "Spain", matches: 122, logo: leagueLogo("LL"), accent: "from-red-600/40 to-rose-900/60" },
  { id: "bundes", name: "Bundesliga", short: "BL", country: "Germany", matches: 111, logo: leagueLogo("BL"), accent: "from-red-700/40 to-zinc-900/60" },
  { id: "seriea", name: "Serie A", short: "SA", country: "Italy", matches: 157, logo: leagueLogo("SA"), accent: "from-sky-600/40 to-blue-900/60" },
];

export const topLeagues = [
  ...popularLeagues,
  { id: "ligue1", name: "Ligue 1", short: "L1", country: "France", matches: 100, logo: leagueLogo("L1"), accent: "" },
  { id: "pro", name: "Pro League", short: "PRO", country: "Saudi Arabia", matches: 35, logo: leagueLogo("PRO"), accent: "" },
  { id: "supercopa", name: "Spanish Super Cup", short: "SC", country: "Spain", matches: 0, logo: leagueLogo("SC"), accent: "" },
  { id: "eredivisie", name: "Eredivisie", short: "ED", country: "Netherlands", matches: 34, logo: leagueLogo("ED"), accent: "" },
];

export const popularTeams = [
  { id: "rma", name: "Real Madrid", logo: teamLogo("RMA") },
  { id: "bar", name: "Barcelona", logo: teamLogo("BAR") },
  { id: "mci", name: "Manchester City", logo: teamLogo("MCI") },
  { id: "liv", name: "Liverpool", logo: teamLogo("LIV") },
  { id: "bay", name: "Bayern Munich", logo: teamLogo("BAY") },
  { id: "psg", name: "PSG", logo: teamLogo("PSG") },
];

export const leagues = topLeagues.map((l) => ({ id: l.id, name: l.name, country: l.country }));

export function getMatch(id: string) {
  return matches.find((m) => m.id === id);
}

export function groupByDate(items: Match[]) {
  const map = new Map<string, Match[]>();
  for (const m of items) {
    const key = formatKickoffDate(m.kickoff);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}
