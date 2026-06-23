export type MatchStatus = "live" | "upcoming" | "finished";

export type Match = {
  id: string;
  league: string;
  leagueLogo: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  kickoff: string; // ISO
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  venue?: string;
};

const logo = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=4f46e5,1e1e5a&fontWeight=700`;

export const matches: Match[] = [
  {
    id: "mci-liv",
    league: "Premier League",
    leagueLogo: logo("PL"),
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    homeLogo: logo("MCI"),
    awayLogo: logo("LIV"),
    kickoff: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "live",
    homeScore: 1,
    awayScore: 1,
    minute: "62'",
    venue: "Etihad Stadium",
  },
  {
    id: "rma-bar",
    league: "La Liga",
    leagueLogo: logo("LL"),
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeLogo: logo("RMA"),
    awayLogo: logo("BAR"),
    kickoff: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "live",
    homeScore: 2,
    awayScore: 0,
    minute: "38'",
    venue: "Santiago Bernabéu",
  },
  {
    id: "bay-dor",
    league: "Bundesliga",
    leagueLogo: logo("BL"),
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    homeLogo: logo("BAY"),
    awayLogo: logo("DOR"),
    kickoff: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    venue: "Allianz Arena",
  },
  {
    id: "psg-mar",
    league: "Ligue 1",
    leagueLogo: logo("L1"),
    homeTeam: "PSG",
    awayTeam: "Marseille",
    homeLogo: logo("PSG"),
    awayLogo: logo("MAR"),
    kickoff: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    venue: "Parc des Princes",
  },
  {
    id: "juv-int",
    league: "Serie A",
    leagueLogo: logo("SA"),
    homeTeam: "Juventus",
    awayTeam: "Inter",
    homeLogo: logo("JUV"),
    awayLogo: logo("INT"),
    kickoff: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    venue: "Allianz Stadium",
  },
  {
    id: "ars-che",
    league: "Premier League",
    leagueLogo: logo("PL"),
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    homeLogo: logo("ARS"),
    awayLogo: logo("CHE"),
    kickoff: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    venue: "Emirates Stadium",
  },
  {
    id: "atl-sev",
    league: "La Liga",
    leagueLogo: logo("LL"),
    homeTeam: "Atlético Madrid",
    awayTeam: "Sevilla",
    homeLogo: logo("ATM"),
    awayLogo: logo("SEV"),
    kickoff: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    venue: "Metropolitano",
  },
  {
    id: "mun-tot",
    league: "Premier League",
    leagueLogo: logo("PL"),
    homeTeam: "Man United",
    awayTeam: "Tottenham",
    homeLogo: logo("MUN"),
    awayLogo: logo("TOT"),
    kickoff: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: "finished",
    homeScore: 2,
    awayScore: 1,
    venue: "Old Trafford",
  },
  {
    id: "nap-mil",
    league: "Serie A",
    leagueLogo: logo("SA"),
    homeTeam: "Napoli",
    awayTeam: "AC Milan",
    homeLogo: logo("NAP"),
    awayLogo: logo("MIL"),
    kickoff: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "finished",
    homeScore: 0,
    awayScore: 0,
    venue: "Diego Maradona",
  },
];

export const leagues = [
  { id: "premier-league", name: "Premier League", country: "England" },
  { id: "la-liga", name: "La Liga", country: "Spain" },
  { id: "bundesliga", name: "Bundesliga", country: "Germany" },
  { id: "serie-a", name: "Serie A", country: "Italy" },
  { id: "ligue-1", name: "Ligue 1", country: "France" },
  { id: "champions-league", name: "Champions League", country: "Europe" },
  { id: "europa-league", name: "Europa League", country: "Europe" },
  { id: "mls", name: "MLS", country: "USA" },
];

export function getMatch(id: string) {
  return matches.find((m) => m.id === id);
}
