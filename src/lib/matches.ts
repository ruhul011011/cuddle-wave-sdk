// Static UI metadata for sidebar / leagues page.
// Live match data comes from src/lib/api-football.functions.ts.

import type { Fixture } from "./api-football.functions";

export type Match = Fixture;
export type MatchStatus = Fixture["status"];

const leagueLogoSeed = (name: string) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}&backgroundColor=ef4444,991b1b,4f46e5`;

const teamLogoSeed = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=991b1b,1e1e5a&fontWeight=700`;

export function formatKickoffTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatKickoffDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export type LeagueInfo = {
  id: string;
  name: string;
  short: string;
  country: string;
  matches: number;
  logo: string;
  accent: string;
};

export const popularLeagues: LeagueInfo[] = [
  { id: "wc", name: "FIFA World Cup 2026", short: "WC", country: "USA · CAN · MEX", matches: 104, logo: leagueLogoSeed("WC"), accent: "from-amber-500/40 to-rose-900/60" },
  { id: "ucl", name: "UEFA Champions League", short: "UCL", country: "Europe", matches: 92, logo: leagueLogoSeed("UCL"), accent: "from-indigo-600/40 to-indigo-900/60" },
  { id: "uel", name: "UEFA Europa League", short: "UEL", country: "Europe", matches: 20, logo: leagueLogoSeed("UEL"), accent: "from-orange-500/40 to-orange-900/60" },
  { id: "epl", name: "Premier League", short: "EPL", country: "England", matches: 153, logo: leagueLogoSeed("EPL"), accent: "from-purple-600/40 to-fuchsia-900/60" },
  { id: "laliga", name: "La Liga", short: "LL", country: "Spain", matches: 122, logo: leagueLogoSeed("LL"), accent: "from-red-600/40 to-rose-900/60" },
  { id: "bundes", name: "Bundesliga", short: "BL", country: "Germany", matches: 111, logo: leagueLogoSeed("BL"), accent: "from-red-700/40 to-zinc-900/60" },
];

export const topLeagues = [
  ...popularLeagues,
  { id: "seriea", name: "Serie A", short: "SA", country: "Italy", matches: 157, logo: leagueLogoSeed("SA"), accent: "" },
  { id: "ligue1", name: "Ligue 1", short: "L1", country: "France", matches: 100, logo: leagueLogoSeed("L1"), accent: "" },
  { id: "pro", name: "Pro League", short: "PRO", country: "Saudi Arabia", matches: 35, logo: leagueLogoSeed("PRO"), accent: "" },
  { id: "eredivisie", name: "Eredivisie", short: "ED", country: "Netherlands", matches: 34, logo: leagueLogoSeed("ED"), accent: "" },
];

export const popularTeams = [
  { id: "rma", name: "Real Madrid", logo: teamLogoSeed("RMA") },
  { id: "bar", name: "Barcelona", logo: teamLogoSeed("BAR") },
  { id: "mci", name: "Manchester City", logo: teamLogoSeed("MCI") },
  { id: "liv", name: "Liverpool", logo: teamLogoSeed("LIV") },
  { id: "bay", name: "Bayern Munich", logo: teamLogoSeed("BAY") },
  { id: "psg", name: "PSG", logo: teamLogoSeed("PSG") },
];

export const leagues = topLeagues.map((l) => ({ id: l.id, name: l.name, country: l.country }));

export function groupByDate(items: Fixture[]) {
  const map = new Map<string, Fixture[]>();
  for (const m of items) {
    const key = formatKickoffDate(m.kickoff);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}
