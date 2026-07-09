// Startup diagnostic: verifies the runtime Supabase env matches the expected
// project ref. Logs a single loud warning block if anything is off so
// self-hosted deploys catch mis-wired .env files immediately.

const EXPECTED_PROJECT_REF = "whxchritocpwpphodvsi";
const EXPECTED_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;

let checked = false;

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return typeof v === "string" && v.length > 0 ? v.trim() : undefined;
}

function mask(value: string | undefined): string {
  if (!value) return "(unset)";
  if (value.length <= 12) return "***";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function extractRefFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1];
}

export function verifySupabaseEnv(): void {
  if (checked) return;
  checked = true;

  const pairs: Array<[string, string | undefined, string]> = [
    ["SUPABASE_URL", readEnv("SUPABASE_URL"), EXPECTED_URL],
    ["VITE_SUPABASE_URL", readEnv("VITE_SUPABASE_URL"), EXPECTED_URL],
    ["SUPABASE_PROJECT_ID", readEnv("SUPABASE_PROJECT_ID"), EXPECTED_PROJECT_REF],
    ["VITE_SUPABASE_PROJECT_ID", readEnv("VITE_SUPABASE_PROJECT_ID"), EXPECTED_PROJECT_REF],
  ];

  const problems: string[] = [];

  for (const [name, actual, expected] of pairs) {
    if (!actual) {
      problems.push(`  - ${name} is not set (expected "${expected}")`);
      continue;
    }
    if (name.endsWith("URL")) {
      const ref = extractRefFromUrl(actual);
      if (ref !== EXPECTED_PROJECT_REF) {
        problems.push(
          `  - ${name}="${actual}" points to project "${ref ?? "unknown"}", expected "${EXPECTED_PROJECT_REF}"`,
        );
      }
    } else if (actual !== expected) {
      problems.push(`  - ${name}="${actual}", expected "${expected}"`);
    }
  }

  const anonKey = readEnv("SUPABASE_PUBLISHABLE_KEY");
  const viteAnonKey = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!anonKey) {
    problems.push("  - SUPABASE_PUBLISHABLE_KEY is not set");
  }
  if (!viteAnonKey) {
    problems.push("  - VITE_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  if (anonKey && viteAnonKey && anonKey !== viteAnonKey) {
    problems.push(
      `  - SUPABASE_PUBLISHABLE_KEY (${mask(anonKey)}) does not match VITE_SUPABASE_PUBLISHABLE_KEY (${mask(viteAnonKey)}) — client and server would talk to different auth contexts`,
    );
  }

  // Sanity-check the anon JWT payload's project ref if the key is a JWT.
  for (const [name, key] of [
    ["SUPABASE_PUBLISHABLE_KEY", anonKey],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", viteAnonKey],
  ] as const) {
    if (!key) continue;
    const parts = key.split(".");
    if (parts.length !== 3) continue; // new opaque sb_publishable_ keys — skip
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
      if (payload?.ref && payload.ref !== EXPECTED_PROJECT_REF) {
        problems.push(
          `  - ${name} is a JWT for project "${payload.ref}", expected "${EXPECTED_PROJECT_REF}"`,
        );
      }
    } catch {
      // ignore parse errors
    }
  }

  if (problems.length === 0) {
    console.log(
      `[env-check] Supabase env OK — project ref "${EXPECTED_PROJECT_REF}"`,
    );
    return;
  }

  console.warn(
    [
      "",
      "============================================================",
      "[env-check] Supabase environment mismatch detected",
      `Expected project ref: ${EXPECTED_PROJECT_REF}`,
      `Expected URL:         ${EXPECTED_URL}`,
      "",
      ...problems,
      "",
      "Fix .env on this host so every SUPABASE_* and VITE_SUPABASE_* value",
      "targets the same project, then rebuild and restart (e.g.",
      "`bun run build && pm2 restart <app> --update-env`). Otherwise the",
      "client and server auth against different projects and admin/role",
      "checks silently return false.",
      "============================================================",
      "",
    ].join("\n"),
  );
}
