// Static reference data for FIFA World Cup 2026.
// 48 teams · 12 groups of 4 · Hosts: USA, Canada, Mexico · 11 Jun – 19 Jul 2026

export type WCTeam = { code: string; name: string; confederation: string };

export const wcInfo = {
  edition: "FIFA World Cup 2026",
  hosts: ["United States", "Canada", "Mexico"],
  dates: "June 11 – July 19, 2026",
  teams: 48,
  matches: 104,
  venues: 16,
  finalVenue: "MetLife Stadium, New Jersey",
  openingVenue: "Estadio Azteca, Mexico City",
};

// Confirmed qualified teams (auto-qualified hosts + confederation qualifiers).
// Groups are drawn on 5 Dec 2025 — labelled TBD until the draw.
export const qualifiedTeams: WCTeam[] = [
  { code: "USA", name: "United States", confederation: "CONCACAF (Host)" },
  { code: "CAN", name: "Canada", confederation: "CONCACAF (Host)" },
  { code: "MEX", name: "Mexico", confederation: "CONCACAF (Host)" },
  { code: "ARG", name: "Argentina", confederation: "CONMEBOL" },
  { code: "BRA", name: "Brazil", confederation: "CONMEBOL" },
  { code: "ECU", name: "Ecuador", confederation: "CONMEBOL" },
  { code: "URU", name: "Uruguay", confederation: "CONMEBOL" },
  { code: "COL", name: "Colombia", confederation: "CONMEBOL" },
  { code: "PAR", name: "Paraguay", confederation: "CONMEBOL" },
  { code: "JPN", name: "Japan", confederation: "AFC" },
  { code: "IRN", name: "Iran", confederation: "AFC" },
  { code: "KOR", name: "South Korea", confederation: "AFC" },
  { code: "AUS", name: "Australia", confederation: "AFC" },
  { code: "UZB", name: "Uzbekistan", confederation: "AFC" },
  { code: "JOR", name: "Jordan", confederation: "AFC" },
  { code: "QAT", name: "Qatar", confederation: "AFC" },
  { code: "KSA", name: "Saudi Arabia", confederation: "AFC" },
  { code: "MAR", name: "Morocco", confederation: "CAF" },
  { code: "TUN", name: "Tunisia", confederation: "CAF" },
  { code: "EGY", name: "Egypt", confederation: "CAF" },
  { code: "ALG", name: "Algeria", confederation: "CAF" },
  { code: "GHA", name: "Ghana", confederation: "CAF" },
  { code: "SEN", name: "Senegal", confederation: "CAF" },
  { code: "CIV", name: "Ivory Coast", confederation: "CAF" },
  { code: "RSA", name: "South Africa", confederation: "CAF" },
  { code: "CPV", name: "Cape Verde", confederation: "CAF" },
  { code: "NZL", name: "New Zealand", confederation: "OFC" },
  { code: "ENG", name: "England", confederation: "UEFA" },
  { code: "FRA", name: "France", confederation: "UEFA" },
  { code: "ESP", name: "Spain", confederation: "UEFA" },
  { code: "POR", name: "Portugal", confederation: "UEFA" },
  { code: "GER", name: "Germany", confederation: "UEFA" },
  { code: "NED", name: "Netherlands", confederation: "UEFA" },
  { code: "BEL", name: "Belgium", confederation: "UEFA" },
  { code: "CRO", name: "Croatia", confederation: "UEFA" },
  { code: "SUI", name: "Switzerland", confederation: "UEFA" },
  { code: "AUT", name: "Austria", confederation: "UEFA" },
  { code: "NOR", name: "Norway", confederation: "UEFA" },
];

export type GroupRow = {
  team: string;
  code: string;
  p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number;
};

export type Group = { name: string; rows: GroupRow[] };

const blank = (team: string, code: string): GroupRow => ({
  team, code, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
});

// 12 groups (A–L). Teams TBD until the draw on 5 Dec 2025.
const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export const groupStandings: Group[] = GROUP_LETTERS.map((letter) => ({
  name: `Group ${letter}`,
  rows: [1, 2, 3, 4].map((n) => blank(`Team ${letter}${n}`, `T${letter}${n}`)),
}));

export type WCStage = {
  stage: string;
  dates: string;
  matches: string;
  venues: string;
};

export const tournamentSchedule: WCStage[] = [
  { stage: "Group Stage — Matchday 1", dates: "Jun 11 – Jun 17, 2026", matches: "24 matches", venues: "All 16 host cities" },
  { stage: "Group Stage — Matchday 2", dates: "Jun 18 – Jun 23, 2026", matches: "24 matches", venues: "All 16 host cities" },
  { stage: "Group Stage — Matchday 3", dates: "Jun 24 – Jun 27, 2026", matches: "24 matches", venues: "All 16 host cities" },
  { stage: "Round of 32", dates: "Jun 28 – Jul 3, 2026", matches: "16 matches", venues: "Across host nations" },
  { stage: "Round of 16", dates: "Jul 4 – Jul 7, 2026", matches: "8 matches", venues: "Across host nations" },
  { stage: "Quarter-finals", dates: "Jul 9 – Jul 11, 2026", matches: "4 matches", venues: "Boston, LA, Dallas, Kansas City" },
  { stage: "Semi-finals", dates: "Jul 14 – Jul 15, 2026", matches: "2 matches", venues: "Dallas & Atlanta" },
  { stage: "Third-place play-off", dates: "Jul 18, 2026", matches: "1 match", venues: "Miami" },
  { stage: "Final", dates: "Jul 19, 2026", matches: "1 match", venues: "MetLife Stadium, New Jersey" },
];

export type KeyMatch = {
  date: string;
  kickoff: string;
  stage: string;
  match: string;
  venue: string;
};

export const keyMatches: KeyMatch[] = [
  { date: "Thu Jun 11, 2026", kickoff: "20:00", stage: "Opening Match", match: "Mexico vs TBD", venue: "Estadio Azteca, Mexico City" },
  { date: "Fri Jun 12, 2026", kickoff: "20:00", stage: "Group Stage", match: "Canada vs TBD", venue: "BMO Field, Toronto" },
  { date: "Fri Jun 12, 2026", kickoff: "21:00", stage: "Group Stage", match: "USA vs TBD", venue: "SoFi Stadium, Los Angeles" },
  { date: "Sun Jul 5, 2026", kickoff: "TBD", stage: "Round of 16", match: "TBD vs TBD", venue: "AT&T Stadium, Dallas" },
  { date: "Fri Jul 10, 2026", kickoff: "TBD", stage: "Quarter-final", match: "TBD vs TBD", venue: "Gillette Stadium, Boston" },
  { date: "Tue Jul 14, 2026", kickoff: "TBD", stage: "Semi-final", match: "TBD vs TBD", venue: "AT&T Stadium, Dallas" },
  { date: "Sat Jul 18, 2026", kickoff: "TBD", stage: "Third-place", match: "TBD vs TBD", venue: "Hard Rock Stadium, Miami" },
  { date: "Sun Jul 19, 2026", kickoff: "15:00", stage: "Final", match: "TBD vs TBD", venue: "MetLife Stadium, New Jersey" },
];
