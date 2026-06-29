import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getWorldCup2026FallbackFixtures, getWorldCup2026FixtureById } from "@/lib/world-cup-2026-fixtures";

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

function streamFixtureIsVisible(match: Fixture, now = Date.now()) {
  if (match.status !== "finished") return true;
  const kickoffMs = Date.parse(match.kickoff);
  return Number.isFinite(kickoffMs) && kickoffMs > now;
}

async function listActiveStreamFixtureIds(): Promise<number[]> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) return [];

  // Public-safe summary table: exposes only active fixture IDs, never stream URLs.
  // This works on self-hosted VPS installs where the private service-role key is unavailable.
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("active_stream_fixtures")
    .select("fixture_id");
  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row) => Number(row.fixture_id)).filter(Number.isFinite)));
}

function syntheticStreamFixture(id: number): Fixture {
  return {
    id: String(id),
    league: "Live Stream",
    leagueLogo: "",
    leagueCountry: "World",
    homeTeam: "Live Match",
    awayTeam: `Fixture #${id}`,
    homeLogo: "",
    awayLogo: "",
    kickoff: new Date().toISOString(),
    status: "live",
    minute: "LIVE",
  };
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
  const fetched = await fetchFixturesByIds(ids).catch(() => [] as Fixture[]);
  const seen = new Set(fetched.map((f) => f.id));
  // Fallback: for any active stream whose fixture isn't returned by api-football
  // (e.g. future WC 2026 IDs the upstream hasn't published yet), build a Fixture
  // from the local World Cup 2026 dataset so admin-added streams still appear.
  const wcFallback = getWorldCup2026FallbackFixtures();
  const wcById = new Map(wcFallback.map((f) => [f.id, f]));
  const missing: Fixture[] = [];
  for (const id of ids) {
    const key = String(id);
    if (seen.has(key)) continue;
    const wc = wcById.get(key);
    missing.push(
      wc
        ? {
            id: key,
            league: wc.league,
            leagueLogo: wc.leagueLogo,
            leagueCountry: wc.leagueCountry,
            homeTeam: wc.homeTeam,
            awayTeam: wc.awayTeam,
            homeLogo: wc.homeLogo,
            awayLogo: wc.awayLogo,
            kickoff: wc.kickoff,
            status: wc.status,
            venue: wc.venue,
          }
        : syntheticStreamFixture(id),
    );
  }
  return [...fetched, ...missing]
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
    const ids = (data.ids ?? []).filter((n) => Number.isFinite(n));
    const fetched = await fetchFixturesByIds(ids).catch(() => [] as Fixture[]);
    const seen = new Set(fetched.map((f) => f.id));
    const wcFallback = getWorldCup2026FallbackFixtures();
    const wcById = new Map(wcFallback.map((f) => [f.id, f]));
    const missing: Fixture[] = [];
    for (const id of ids) {
      const key = String(id);
      if (seen.has(key)) continue;
      const wc = wcById.get(key);
      missing.push(
        wc
          ? {
              id: key,
              league: wc.league,
              leagueLogo: wc.leagueLogo,
              leagueCountry: wc.leagueCountry,
              homeTeam: wc.homeTeam,
              awayTeam: wc.awayTeam,
              homeLogo: wc.homeLogo,
              awayLogo: wc.awayLogo,
              kickoff: wc.kickoff,
              status: wc.status,
              venue: wc.venue,
            }
          : syntheticStreamFixture(id),
      );
    }
    return [...fetched, ...missing];
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
    if (data.leagueId === 1) {
      const exact = getWorldCup2026FallbackFixtures(data.date);
      if (exact.length) return exact;
      const nowIso = new Date().toISOString();
      return getWorldCup2026FallbackFixtures().filter((f) => f.kickoff >= nowIso);
    }

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

function worldCupFixtureDetail(id: string): FixtureDetail | null {
  const wc = getWorldCup2026FixtureById(id);
  if (!wc) return null;
  return {
    id: wc.id,
    league: wc.league,
    leagueLogo: wc.leagueLogo,
    leagueCountry: wc.leagueCountry,
    homeTeam: wc.homeTeam,
    awayTeam: wc.awayTeam,
    homeLogo: wc.homeLogo,
    awayLogo: wc.awayLogo,
    kickoff: wc.kickoff,
    status: wc.status,
    venue: wc.venue,
    events: [],
    lineups: [],
    statistics: [],
  };
}

export const getFixtureDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<FixtureDetail | null> => {
    const fallback = worldCupFixtureDetail(data.id);
    const [fixtures, events, lineups, statistics] = await Promise.all([
      af<any[]>(`/fixtures?id=${data.id}`).catch(() => []),
      af<any[]>(`/fixtures/events?fixture=${data.id}`).catch(() => []),
      af<any[]>(`/fixtures/lineups?fixture=${data.id}`).catch(() => []),
      af<any[]>(`/fixtures/statistics?fixture=${data.id}`).catch(() => []),
    ]);
    if (!fixtures.length) return fallback;
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
