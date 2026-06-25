import { createServerFn } from "@tanstack/react-start";

const BASE = "https://v3.football.api-sports.io";

// Simple in-memory TTL cache, shared across requests in the same worker.
// Massively cuts upstream calls (api-football is slow, ~1-3s per /fixtures?date=).
type CacheEntry = { value: unknown; expires: number };
const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<unknown>>();

async function af<T>(path: string, ttlMs = 30_000): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured");
  const now = Date.now();
  const hit = _cache.get(path);
  if (hit && hit.expires > now) return hit.value as T;
  const pending = _inflight.get(path);
  if (pending) return pending as Promise<T>;
  const p = (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": key } });
      if (!res.ok) throw new Error(`api-football error ${res.status}`);
      const json = (await res.json()) as { response: T; errors?: unknown };
      // api-football returns 200 with an `errors` object on rate limit / auth
      // failure and an empty `response`. Don't cache those as "no data" —
      // surface as an error so callers can retry instead of showing "not found".
      const errs = json.errors;
      const hasErrors =
        errs && typeof errs === "object" && !Array.isArray(errs) && Object.keys(errs as object).length > 0;
      if (hasErrors) {
        const msg = Object.values(errs as Record<string, string>)[0] ?? "api-football error";
        throw new Error(String(msg));
      }
      _cache.set(path, { value: json.response, expires: Date.now() + ttlMs });
      return json.response;
    } finally {
      _inflight.delete(path);
    }
  })();
  _inflight.set(path, p);
  return p;
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

const WORLD_CUP_2026_FALLBACK: Array<{
  id: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
}> = [
  { id: "1489369", kickoff: "2026-06-11T19:00:00+00:00", homeTeam: "Mexico", awayTeam: "South Africa", venue: "Estadio Banorte" },
  { id: "1538999", kickoff: "2026-06-12T02:00:00+00:00", homeTeam: "South Korea", awayTeam: "Czechia", venue: "Estadio Akron" },
  { id: "1539000", kickoff: "2026-06-12T19:00:00+00:00", homeTeam: "Canada", awayTeam: "Bosnia & Herzegovina", venue: "BMO Field" },
  { id: "1489370", kickoff: "2026-06-13T01:00:00+00:00", homeTeam: "USA", awayTeam: "Paraguay", venue: "SoFi Stadium" },
  { id: "1489373", kickoff: "2026-06-13T19:00:00+00:00", homeTeam: "Qatar", awayTeam: "Switzerland", venue: "Levi's Stadium" },
  { id: "1489371", kickoff: "2026-06-13T22:00:00+00:00", homeTeam: "Brazil", awayTeam: "Morocco", venue: "MetLife Stadium" },
  { id: "1489372", kickoff: "2026-06-14T01:00:00+00:00", homeTeam: "Haiti", awayTeam: "Scotland", venue: "Gillette Stadium" },
  { id: "1539001", kickoff: "2026-06-14T04:00:00+00:00", homeTeam: "Australia", awayTeam: "Türkiye", venue: "BC Place" },
  { id: "1489374", kickoff: "2026-06-14T17:00:00+00:00", homeTeam: "Germany", awayTeam: "Curaçao", venue: "NRG Stadium" },
  { id: "1489376", kickoff: "2026-06-14T20:00:00+00:00", homeTeam: "Netherlands", awayTeam: "Japan", venue: "AT&T Stadium" },
  { id: "1489375", kickoff: "2026-06-14T23:00:00+00:00", homeTeam: "Ivory Coast", awayTeam: "Ecuador", venue: "Lincoln Financial Field" },
  { id: "1539002", kickoff: "2026-06-15T02:00:00+00:00", homeTeam: "Sweden", awayTeam: "Tunisia", venue: "Estadio BBVA" },
  { id: "1489380", kickoff: "2026-06-15T16:00:00+00:00", homeTeam: "Spain", awayTeam: "Cape Verde Islands", venue: "Mercedes-Benz Stadium" },
  { id: "1489377", kickoff: "2026-06-15T19:00:00+00:00", homeTeam: "Belgium", awayTeam: "Egypt", venue: "Lumen Field" },
  { id: "1489379", kickoff: "2026-06-15T22:00:00+00:00", homeTeam: "Saudi Arabia", awayTeam: "Uruguay", venue: "Hard Rock Stadium" },
  { id: "1489378", kickoff: "2026-06-16T01:00:00+00:00", homeTeam: "Iran", awayTeam: "New Zealand", venue: "SoFi Stadium" },
  { id: "1489383", kickoff: "2026-06-16T19:00:00+00:00", homeTeam: "France", awayTeam: "Senegal", venue: "MetLife Stadium" },
  { id: "1539016", kickoff: "2026-06-16T22:00:00+00:00", homeTeam: "Iraq", awayTeam: "Norway", venue: "Gillette Stadium" },
  { id: "1489381", kickoff: "2026-06-17T01:00:00+00:00", homeTeam: "Argentina", awayTeam: "Algeria", venue: "Arrowhead Stadium" },
  { id: "1489382", kickoff: "2026-06-17T04:00:00+00:00", homeTeam: "Austria", awayTeam: "Jordan", venue: "Levi's Stadium" },
  { id: "1539003", kickoff: "2026-06-17T17:00:00+00:00", homeTeam: "Portugal", awayTeam: "Congo DR", venue: "NRG Stadium" },
  { id: "1489384", kickoff: "2026-06-17T20:00:00+00:00", homeTeam: "England", awayTeam: "Croatia", venue: "AT&T Stadium" },
  { id: "1489385", kickoff: "2026-06-17T23:00:00+00:00", homeTeam: "Ghana", awayTeam: "Panama", venue: "BMO Field" },
  { id: "1489386", kickoff: "2026-06-18T02:00:00+00:00", homeTeam: "Uzbekistan", awayTeam: "Colombia", venue: "Estadio Banorte" },
  { id: "1539004", kickoff: "2026-06-18T16:00:00+00:00", homeTeam: "Czechia", awayTeam: "South Africa", venue: "Mercedes-Benz Stadium" },
  { id: "1539005", kickoff: "2026-06-18T19:00:00+00:00", homeTeam: "Switzerland", awayTeam: "Bosnia & Herzegovina", venue: "SoFi Stadium" },
  { id: "1489387", kickoff: "2026-06-18T22:00:00+00:00", homeTeam: "Canada", awayTeam: "Qatar", venue: "BC Place" },
  { id: "1489388", kickoff: "2026-06-19T01:00:00+00:00", homeTeam: "Mexico", awayTeam: "South Korea", venue: "Estadio Akron" },
  { id: "1489391", kickoff: "2026-06-19T19:00:00+00:00", homeTeam: "USA", awayTeam: "Australia", venue: "Lumen Field" },
  { id: "1489390", kickoff: "2026-06-19T22:00:00+00:00", homeTeam: "Scotland", awayTeam: "Morocco", venue: "Gillette Stadium" },
  { id: "1489389", kickoff: "2026-06-20T00:30:00+00:00", homeTeam: "Brazil", awayTeam: "Haiti", venue: "Lincoln Financial Field" },
  { id: "1539006", kickoff: "2026-06-20T03:00:00+00:00", homeTeam: "Türkiye", awayTeam: "Paraguay", venue: "Levi's Stadium" },
  { id: "1539007", kickoff: "2026-06-20T17:00:00+00:00", homeTeam: "Netherlands", awayTeam: "Sweden", venue: "NRG Stadium" },
  { id: "1489393", kickoff: "2026-06-20T20:00:00+00:00", homeTeam: "Germany", awayTeam: "Ivory Coast", venue: "BMO Field" },
  { id: "1489392", kickoff: "2026-06-21T00:00:00+00:00", homeTeam: "Ecuador", awayTeam: "Curaçao", venue: "Arrowhead Stadium" },
  { id: "1489394", kickoff: "2026-06-21T04:00:00+00:00", homeTeam: "Tunisia", awayTeam: "Japan", venue: "Estadio BBVA" },
  { id: "1489397", kickoff: "2026-06-21T16:00:00+00:00", homeTeam: "Spain", awayTeam: "Saudi Arabia", venue: "Mercedes-Benz Stadium" },
  { id: "1489395", kickoff: "2026-06-21T19:00:00+00:00", homeTeam: "Belgium", awayTeam: "Iran", venue: "SoFi Stadium" },
  { id: "1489398", kickoff: "2026-06-21T22:00:00+00:00", homeTeam: "Uruguay", awayTeam: "Cape Verde Islands", venue: "Hard Rock Stadium" },
  { id: "1489396", kickoff: "2026-06-22T01:00:00+00:00", homeTeam: "New Zealand", awayTeam: "Egypt", venue: "BC Place" },
  { id: "1489399", kickoff: "2026-06-22T17:00:00+00:00", homeTeam: "Argentina", awayTeam: "Austria", venue: "AT&T Stadium" },
  { id: "1539017", kickoff: "2026-06-22T21:00:00+00:00", homeTeam: "France", awayTeam: "Iraq", venue: "Lincoln Financial Field" },
  { id: "1489401", kickoff: "2026-06-23T00:00:00+00:00", homeTeam: "Norway", awayTeam: "Senegal", venue: "MetLife Stadium" },
  { id: "1489400", kickoff: "2026-06-23T03:00:00+00:00", homeTeam: "Jordan", awayTeam: "Algeria", venue: "Levi's Stadium" },
  { id: "1489404", kickoff: "2026-06-23T17:00:00+00:00", homeTeam: "Portugal", awayTeam: "Uzbekistan", venue: "NRG Stadium" },
  { id: "1489402", kickoff: "2026-06-23T20:00:00+00:00", homeTeam: "England", awayTeam: "Ghana", venue: "Gillette Stadium" },
  { id: "1489403", kickoff: "2026-06-23T23:00:00+00:00", homeTeam: "Panama", awayTeam: "Croatia", venue: "BMO Field" },
  { id: "1539008", kickoff: "2026-06-24T02:00:00+00:00", homeTeam: "Colombia", awayTeam: "Congo DR", venue: "Estadio Akron" },
  { id: "1489408", kickoff: "2026-06-24T19:00:00+00:00", homeTeam: "Switzerland", awayTeam: "Canada", venue: "BC Place" },
  { id: "1539009", kickoff: "2026-06-24T19:00:00+00:00", homeTeam: "Bosnia & Herzegovina", awayTeam: "Qatar", venue: "Lumen Field" },
  { id: "1489405", kickoff: "2026-06-24T22:00:00+00:00", homeTeam: "Morocco", awayTeam: "Haiti", venue: "Mercedes-Benz Stadium" },
  { id: "1489406", kickoff: "2026-06-24T22:00:00+00:00", homeTeam: "Scotland", awayTeam: "Brazil", venue: "Hard Rock Stadium" },
  { id: "1539010", kickoff: "2026-06-25T01:00:00+00:00", homeTeam: "Czechia", awayTeam: "Mexico", venue: "Estadio Banorte" },
  { id: "1489407", kickoff: "2026-06-25T01:00:00+00:00", homeTeam: "South Africa", awayTeam: "South Korea", venue: "Estadio BBVA" },
  { id: "1489410", kickoff: "2026-06-25T20:00:00+00:00", homeTeam: "Ecuador", awayTeam: "Germany", venue: "MetLife Stadium" },
  { id: "1489409", kickoff: "2026-06-25T20:00:00+00:00", homeTeam: "Curaçao", awayTeam: "Ivory Coast", venue: "Lincoln Financial Field" },
  { id: "1539011", kickoff: "2026-06-25T23:00:00+00:00", homeTeam: "Japan", awayTeam: "Sweden", venue: "AT&T Stadium" },
  { id: "1489412", kickoff: "2026-06-25T23:00:00+00:00", homeTeam: "Tunisia", awayTeam: "Netherlands", venue: "Arrowhead Stadium" },
  { id: "1539012", kickoff: "2026-06-26T02:00:00+00:00", homeTeam: "Türkiye", awayTeam: "USA", venue: "SoFi Stadium" },
  { id: "1489411", kickoff: "2026-06-26T02:00:00+00:00", homeTeam: "Paraguay", awayTeam: "Australia", venue: "Levi's Stadium" },
  { id: "1539074", kickoff: "2026-06-26T19:00:00+00:00", homeTeam: "Senegal", awayTeam: "Iraq", venue: "BMO Field" },
  { id: "1489416", kickoff: "2026-06-26T19:00:00+00:00", homeTeam: "Norway", awayTeam: "France", venue: "Gillette Stadium" },
  { id: "1489417", kickoff: "2026-06-27T00:00:00+00:00", homeTeam: "Uruguay", awayTeam: "Spain", venue: "Estadio Akron" },
  { id: "1489413", kickoff: "2026-06-27T00:00:00+00:00", homeTeam: "Cape Verde Islands", awayTeam: "Saudi Arabia", venue: "NRG Stadium" },
  { id: "1489414", kickoff: "2026-06-27T03:00:00+00:00", homeTeam: "Egypt", awayTeam: "Iran", venue: "Lumen Field" },
  { id: "1489415", kickoff: "2026-06-27T03:00:00+00:00", homeTeam: "New Zealand", awayTeam: "Belgium", venue: "BC Place" },
  { id: "1489420", kickoff: "2026-06-27T21:00:00+00:00", homeTeam: "Croatia", awayTeam: "Ghana", venue: "Lincoln Financial Field" },
  { id: "1489422", kickoff: "2026-06-27T21:00:00+00:00", homeTeam: "Panama", awayTeam: "England", venue: "MetLife Stadium" },
  { id: "1489419", kickoff: "2026-06-27T23:30:00+00:00", homeTeam: "Colombia", awayTeam: "Portugal", venue: "Hard Rock Stadium" },
  { id: "1539013", kickoff: "2026-06-27T23:30:00+00:00", homeTeam: "Congo DR", awayTeam: "Uzbekistan", venue: "Mercedes-Benz Stadium" },
  { id: "1489418", kickoff: "2026-06-28T02:00:00+00:00", homeTeam: "Algeria", awayTeam: "Austria", venue: "Arrowhead Stadium" },
  { id: "1489421", kickoff: "2026-06-28T02:00:00+00:00", homeTeam: "Jordan", awayTeam: "Argentina", venue: "AT&T Stadium" },
  { id: "1561329", kickoff: "2026-06-28T19:00:00+00:00", homeTeam: "South Africa", awayTeam: "Canada", venue: "SoFi Stadium" },
];

export function worldCupFallbackFixtures(date?: string): Fixture[] {
  const rows = date
    ? WORLD_CUP_2026_FALLBACK.filter((match) => match.kickoff.slice(0, 10) === date)
    : WORLD_CUP_2026_FALLBACK;
  return rows.map((match) => ({
    id: match.id,
    league: "World Cup",
    leagueLogo: "",
    leagueCountry: "World",
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeLogo: "",
    awayLogo: "",
    kickoff: match.kickoff,
    status: "upcoming",
    venue: match.venue,
  }));
}

function streamFixtureIsVisible(match: Fixture, now = Date.now()) {
  if (match.status !== "finished") return true;
  const kickoffMs = Date.parse(match.kickoff);
  return Number.isFinite(kickoffMs) && kickoffMs > now;
}

async function listActiveStreamFixtureIds(): Promise<number[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("match_streams")
    .select("fixture_id")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row) => Number(row.fixture_id)).filter(Number.isFinite)));
}

async function fetchFixturesByIds(ids: number[]): Promise<Fixture[]> {
  const uniqueIds = Array.from(new Set((ids ?? []).filter((n) => Number.isFinite(n))));
  if (!uniqueIds.length) return [];
  const results = await Promise.all(
    chunk(uniqueIds, 20).map((batch) =>
      af<any[]>(`/fixtures?ids=${batch.join("-")}`).catch(() => []),
    ),
  );
  return results.flat().map(normalize);
}

async function loadStreamedFixtures(): Promise<Fixture[]> {
  const ids = await listActiveStreamFixtureIds();
  if (!ids.length) return [];
  return (await fetchFixturesByIds(ids))
    .filter((match) => streamFixtureIsVisible(match))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  // Live updates every 30s, fixture lists every 5m — drops upstream load dramatically.
  const [live, todayList, tomorrowList, streamed] = await Promise.all([
    af<any[]>(`/fixtures?live=all`, 30_000).catch(() => []),
    af<any[]>(`/fixtures?date=${isoDate(today)}`, 300_000).catch(() => []),
    af<any[]>(`/fixtures?date=${isoDate(tomorrow)}`, 300_000).catch(() => []),
    loadStreamedFixtures().catch(() => []),
  ]);
  // Keep only fixtures from popular leagues — payload shrinks ~10x.
  const popularSet = new Set(POPULAR_LEAGUES.map((l) => l.id));
  const inPopular = (r: any) => popularSet.has(r.league?.id);
  const upcoming = [...todayList, ...tomorrowList]
    .filter(inPopular)
    .map(normalize)
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return {
    live: live.filter(inPopular).map(normalize).slice(0, 30),
    upcoming: upcoming.slice(0, 30),
    streamed,
  };
});

export const getLiveFixtures = createServerFn({ method: "GET" }).handler(async () => {
  const raw = await af<any[]>(`/fixtures?live=all`, 30_000);
  return raw.map(normalize);
});


export const getFixturesByIds = createServerFn({ method: "GET" })
  .inputValidator((d: { ids: number[] }) => d)
  .handler(async ({ data }) => {
    return fetchFixturesByIds(data.ids ?? []);
  });

export const getStreamedFixtures = createServerFn({ method: "GET" }).handler(async () => {
  return loadStreamedFixtures();
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

export const POPULAR_LEAGUES: Array<{ id: number; name: string; country?: string }> = [
  { id: 1, name: "World Cup" },
  { id: 4, name: "Euro Championship" },
  { id: 9, name: "Copa America" },
  { id: 2, name: "UEFA Champions League" },
  { id: 3, name: "UEFA Europa League" },
  { id: 848, name: "UEFA Conference League" },
  { id: 5, name: "UEFA Nations League" },
  { id: 39, name: "Premier League", country: "England" },
  { id: 40, name: "Championship", country: "England" },
  { id: 45, name: "FA Cup", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 88, name: "Eredivisie", country: "Netherlands" },
  { id: 94, name: "Primeira Liga", country: "Portugal" },
  { id: 203, name: "Süper Lig", country: "Turkey" },
  { id: 253, name: "MLS", country: "USA" },
  { id: 307, name: "Saudi Pro League", country: "Saudi Arabia" },
  { id: 71, name: "Brasileirão Série A", country: "Brazil" },
  { id: 128, name: "Liga Profesional", country: "Argentina" },
  { id: 188, name: "A-League", country: "Australia" },
  { id: 98, name: "J1 League", country: "Japan" },
];

export const listPopularLeagues = createServerFn({ method: "GET" }).handler(async () => {
  return POPULAR_LEAGUES;
});

export type LeagueOption = { id: number; name: string; country?: string; logo?: string };

export const listAvailableLeagues = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.API_FOOTBALL_KEY;
  const fallback: LeagueOption[] = POPULAR_LEAGUES.map((l) => ({
    id: l.id,
    name: l.name,
    country: l.country,
  }));
  if (!key) {
    console.error("[listAvailableLeagues] API_FOOTBALL_KEY missing, using fallback");
    return fallback;
  }
  try {
    const res = await fetch(`${BASE}/leagues`, { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error("[listAvailableLeagues] http error", res.status);
      return fallback;
    }
    const json = (await res.json()) as { response?: any[]; errors?: unknown };
    const arr = Array.isArray(json.response) ? json.response : [];
    if (!arr.length) {
      console.error("[listAvailableLeagues] empty response; errors=", JSON.stringify(json.errors));
      return fallback;
    }
    const items: LeagueOption[] = arr
      .map((r: any): LeagueOption => ({
        id: r.league?.id,
        name: r.league?.name ?? "",
        country: r.country?.name ?? undefined,
        logo: r.league?.logo ?? undefined,
      }))
      .filter((l) => l.id && l.name);
    const seen = new Set<number>();
    const unique = items.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
    unique.sort((a, b) => a.name.localeCompare(b.name));
    return unique.length ? unique : fallback;
  } catch (e) {
    console.error("[listAvailableLeagues] fetch failed", e);
    return fallback;
  }
});

export const getFixturesByLeagueDate = createServerFn({ method: "GET" })
  .inputValidator((d: { leagueId: number; date: string }) => d)
  .handler(async ({ data }) => {
    // Try a few seasons since World Cup / cup competitions may run across years
    const year = Number(data.date.slice(0, 4));
    const seasons = [year, year - 1, year + 1];
    let raw: any[] = [];
    for (const season of seasons) {
      const list = await af<any[]>(
        `/fixtures?league=${data.leagueId}&season=${season}&date=${data.date}`,
      ).catch((e) => { console.error("[getFixturesByLeagueDate] season fetch failed", season, e); return []; });
      if (list.length) { raw = list; break; }
    }
    // Fallback 1: any fixture that day filtered by league id (catches season mismatches)
    if (!raw.length) {
      const all = await af<any[]>(`/fixtures?date=${data.date}`).catch(() => []);
      raw = all.filter((r) => r.league?.id === data.leagueId);
    }
    // Fallback 2: pull entire league/season and filter to a ±3 day window so
    // the admin always has something to pick from even if the exact-date
    // upstream query is empty (common for cup competitions).
    if (!raw.length) {
      const target = Date.parse(data.date + "T12:00:00Z");
      const windowMs = 3 * 24 * 60 * 60 * 1000;
      for (const season of seasons) {
        const list = await af<any[]>(
          `/fixtures?league=${data.leagueId}&season=${season}`,
        ).catch(() => []);
        const near = list.filter((r) => {
          const t = Date.parse(r.fixture?.date ?? "");
          return Number.isFinite(t) && Math.abs(t - target) <= windowMs;
        });
        if (near.length) { raw = near; break; }
      }
    }
    const normalized = raw.map(normalize).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    if (normalized.length) return normalized;

    // If the upstream API key is missing/rate-limited on a self-hosted server,
    // keep the admin usable for World Cup 2026 with real fixture IDs and dates.
    if (data.leagueId === 1) return worldCupFallbackFixtures(data.date);

    return [];
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
