import { createServerFn } from "@tanstack/react-start";
import type { KeyMatch } from "./world-cup";

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null; city: string | null };
    status: { short: string };
  };
  league: { round: string };
  teams: {
    home: { name: string };
    away: { name: string };
  };
};

function stageFromRound(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter") && !r.includes("3rd") && !r.includes("third")) return "Final";
  if (r.includes("3rd") || r.includes("third")) return "Third-place";
  if (r.includes("semi")) return "Semi-final";
  if (r.includes("quarter")) return "Quarter-final";
  if (r.includes("16")) return "Round of 16";
  if (r.includes("32")) return "Round of 32";
  if (r.includes("group")) return "Group Stage";
  return round;
}

function pickMarquee(all: KeyMatch[]): KeyMatch[] {
  const priority = ["Opening Match", "Final", "Third-place", "Semi-final", "Quarter-final", "Round of 16", "Round of 32", "Group Stage"];
  const sorted = [...all].sort((a, b) => {
    const ai = priority.indexOf(a.stage);
    const bi = priority.indexOf(b.stage);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  // Take a balanced subset: openers + headline knockouts (up to 8)
  const seen = new Set<string>();
  const out: KeyMatch[] = [];
  for (const m of sorted) {
    const k = `${m.stage}|${m.match}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
    if (out.length >= 8) break;
  }
  return out;
}

export const getWorldCupFixtures = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ matches: KeyMatch[]; source: "api" | "fallback"; updatedAt: string }> => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      return { matches: [], source: "fallback", updatedAt: new Date().toISOString() };
    }
    try {
      const res = await fetch(
        "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
        { headers: { "x-apisports-key": apiKey } },
      );
      if (!res.ok) {
        return { matches: [], source: "fallback", updatedAt: new Date().toISOString() };
      }
      const json = (await res.json()) as { response?: ApiFixture[] };
      const fixtures = json.response ?? [];
      const mapped: KeyMatch[] = fixtures.map((f) => {
        const d = new Date(f.fixture.date);
        const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const kickoff = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const venue = [f.fixture.venue.name, f.fixture.venue.city].filter(Boolean).join(", ") || "TBD";
        let stage = stageFromRound(f.league.round);
        // Detect opening match: earliest group-stage fixture
        return {
          date,
          kickoff,
          stage,
          match: `${f.teams.home.name} vs ${f.teams.away.name}`,
          venue,
        };
      });
      // Sort by date asc, then flag the earliest as Opening Match
      mapped.sort((a, b) => +new Date(a.date) - +new Date(b.date));
      if (mapped.length > 0 && mapped[0].stage === "Group Stage") {
        mapped[0] = { ...mapped[0], stage: "Opening Match" };
      }
      return {
        matches: pickMarquee(mapped),
        source: "api",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return { matches: [], source: "fallback", updatedAt: new Date().toISOString() };
    }
  },
);
