import { createServerFn } from "@tanstack/react-start";

const BASE = "https://v3.football.api-sports.io";

async function af<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) throw new Error(`api-football error ${res.status}`);
  const json = (await res.json()) as { response: T; errors?: unknown };
  return json.response;
}

export type Fixture = {
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
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  venue?: string;
  referee?: string;
};

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function normalize(raw: any): Fixture {
  const short = raw.fixture?.status?.short ?? "NS";
  const status: Fixture["status"] = LIVE_STATUSES.has(short)
    ? "live"
    : FINISHED_STATUSES.has(short)
      ? "finished"
      : "upcoming";
  const venueName = raw.fixture?.venue?.name;
  const venueCity = raw.fixture?.venue?.city;
  return {
    id: String(raw.fixture.id),
    league: raw.league?.name ?? "",
    leagueLogo: raw.league?.logo ?? "",
    leagueCountry: raw.league?.country,
    homeTeam: raw.teams?.home?.name ?? "",
    awayTeam: raw.teams?.away?.name ?? "",
    homeLogo: raw.teams?.home?.logo ?? "",
    awayLogo: raw.teams?.away?.logo ?? "",
    kickoff: raw.fixture?.date ?? "",
    status,
    homeScore: raw.goals?.home ?? undefined,
    awayScore: raw.goals?.away ?? undefined,
    minute: raw.fixture?.status?.elapsed ? `${raw.fixture.status.elapsed}'` : undefined,
    venue: venueName ? (venueCity ? `${venueName}, ${venueCity}` : venueName) : undefined,
    referee: raw.fixture?.referee ?? undefined,
  };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const [live, todayList, tomorrowList] = await Promise.all([
    af<any[]>(`/fixtures?live=all`).catch(() => []),
    af<any[]>(`/fixtures?date=${isoDate(today)}`).catch(() => []),
    af<any[]>(`/fixtures?date=${isoDate(tomorrow)}`).catch(() => []),
  ]);
  const upcoming = [...todayList, ...tomorrowList]
    .map(normalize)
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return {
    live: live.map(normalize).slice(0, 40),
    upcoming: upcoming.slice(0, 40),
  };
});

export const getLiveFixtures = createServerFn({ method: "GET" }).handler(async () => {
  const raw = await af<any[]>(`/fixtures?live=all`);
  return raw.map(normalize);
});

export const getScheduleFeed = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  const dates = [0, 1, 2, 3].map((d) => isoDate(new Date(now.getTime() + d * 86400000)));
  const results = await Promise.all(
    dates.map((d) => af<any[]>(`/fixtures?date=${d}`).catch(() => [])),
  );
  return results
    .flat()
    .map(normalize)
    .filter((m) => m.status !== "finished")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
});

export type FixtureEvent = {
  minute: number;
  extra?: number;
  team: "home" | "away";
  type: string;
  detail: string;
  player: string;
  assist?: string;
};

export type LineupPlayer = { name: string; number: number; pos: string };
export type Lineup = {
  team: string;
  teamLogo: string;
  formation: string;
  coach: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type FixtureDetail = Fixture & {
  events: FixtureEvent[];
  lineups: Lineup[];
  statistics: Array<{ team: string; stats: Array<{ type: string; value: string | number | null }> }>;
};

export const getFixtureDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<FixtureDetail | null> => {
    const [fixtures, events, lineups, statistics] = await Promise.all([
      af<any[]>(`/fixtures?id=${data.id}`),
      af<any[]>(`/fixtures/events?fixture=${data.id}`).catch(() => []),
      af<any[]>(`/fixtures/lineups?fixture=${data.id}`).catch(() => []),
      af<any[]>(`/fixtures/statistics?fixture=${data.id}`).catch(() => []),
    ]);
    if (!fixtures.length) return null;
    const raw = fixtures[0];
    const base = normalize(raw);
    const homeId = raw.teams?.home?.id;

    const mapPlayer = (s: any): LineupPlayer => ({
      name: s.player?.name ?? "",
      number: s.player?.number ?? 0,
      pos: s.player?.pos ?? "",
    });

    return {
      ...base,
      events: (events ?? []).map((e: any) => ({
        minute: e.time?.elapsed ?? 0,
        extra: e.time?.extra ?? undefined,
        team: e.team?.id === homeId ? "home" : "away",
        type: e.type ?? "",
        detail: e.detail ?? "",
        player: e.player?.name ?? "",
        assist: e.assist?.name ?? undefined,
      })),
      lineups: (lineups ?? []).map((l: any) => ({
        team: l.team?.name ?? "",
        teamLogo: l.team?.logo ?? "",
        formation: l.formation ?? "",
        coach: l.coach?.name ?? "",
        startXI: (l.startXI ?? []).map(mapPlayer),
        substitutes: (l.substitutes ?? []).map(mapPlayer),
      })),
      statistics: (statistics ?? []).map((s: any) => ({
        team: s.team?.name ?? "",
        stats: (s.statistics ?? []).map((st: any) => ({ type: st.type, value: st.value })),
      })),
    };
  });
