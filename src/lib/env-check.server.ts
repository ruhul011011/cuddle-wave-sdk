// Startup diagnostic: verifies the runtime Supabase env matches the expected
// project ref. Logs a single loud warning block if anything is off so
// self-hosted deploys catch mis-wired .env files immediately.

import { getServerEnv } from "./env.server";

const EXPECTED_PROJECT_REF = "whxchritocpwpphodvsi";
const EXPECTED_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;

let checked = false;

function readEnv(key: string): string | undefined {
  const v = getServerEnv(key);
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

function extractRefFromPublishableKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const parts = key.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return typeof payload?.ref === "string" ? payload.ref : undefined;
  } catch {
    return undefined;
  }
}

export type SupabaseEnvDiagnostic = {
  ok: boolean;
  expectedProjectRef: string;
  expectedUrl: string;
  checks: Array<{
    name: string;
    ok: boolean;
    expected: string;
    actual: string;
    actualProjectRef?: string;
  }>;
  problems: string[];
};

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostic {
  const pairs: Array<[string, string | undefined, string]> = [
    ["SUPABASE_URL", readEnv("SUPABASE_URL"), EXPECTED_URL],
    ["VITE_SUPABASE_URL", readEnv("VITE_SUPABASE_URL"), EXPECTED_URL],
    ["SUPABASE_PROJECT_ID", readEnv("SUPABASE_PROJECT_ID"), EXPECTED_PROJECT_REF],
    ["VITE_SUPABASE_PROJECT_ID", readEnv("VITE_SUPABASE_PROJECT_ID"), EXPECTED_PROJECT_REF],
  ];

  const checks: SupabaseEnvDiagnostic["checks"] = [];
  const problems: string[] = [];

  for (const [name, actual, expected] of pairs) {
    const actualProjectRef = name.endsWith("URL") ? extractRefFromUrl(actual) : undefined;
    const ok = name.endsWith("URL")
      ? actualProjectRef === EXPECTED_PROJECT_REF
      : actual === expected;

    checks.push({
      name,
      ok: Boolean(actual && ok),
      expected,
      actual: actual || "(unset)",
      ...(actualProjectRef ? { actualProjectRef } : {}),
    });

    if (!actual) {
      problems.push(`  - ${name} is not set (expected "${expected}")`);
    } else if (name.endsWith("URL") && actualProjectRef !== EXPECTED_PROJECT_REF) {
      problems.push(
        `  - ${name}="${actual}" points to project "${actualProjectRef ?? "unknown"}", expected "${EXPECTED_PROJECT_REF}"`,
      );
    } else if (!name.endsWith("URL") && actual !== expected) {
      problems.push(`  - ${name}="${actual}", expected "${expected}"`);
    }
  }

  const anonKey = readEnv("SUPABASE_PUBLISHABLE_KEY");
  const viteAnonKey = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  const anonRef = extractRefFromPublishableKey(anonKey);
  const viteAnonRef = extractRefFromPublishableKey(viteAnonKey);

  for (const [name, key, ref] of [
    ["SUPABASE_PUBLISHABLE_KEY", anonKey, anonRef],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", viteAnonKey, viteAnonRef],
  ] as const) {
    const ok = Boolean(key) && (!ref || ref === EXPECTED_PROJECT_REF);
    checks.push({
      name,
      ok,
      expected: `publishable key for ${EXPECTED_PROJECT_REF}`,
      actual: key ? mask(key) : "(unset)",
      ...(ref ? { actualProjectRef: ref } : {}),
    });
    if (!key) {
      problems.push(`  - ${name} is not set`);
    } else if (ref && ref !== EXPECTED_PROJECT_REF) {
      problems.push(`  - ${name} is a JWT for project "${ref}", expected "${EXPECTED_PROJECT_REF}"`);
    }
  }

  if (anonKey && viteAnonKey && anonKey !== viteAnonKey) {
    problems.push(
      `  - SUPABASE_PUBLISHABLE_KEY (${mask(anonKey)}) does not match VITE_SUPABASE_PUBLISHABLE_KEY (${mask(viteAnonKey)}) — client and server would talk to different auth contexts`,
    );
  }

  return {
    ok: problems.length === 0,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    expectedUrl: EXPECTED_URL,
    checks,
    problems,
  };
}

export function verifySupabaseEnv(): void {
  if (checked) return;
  checked = true;

  const { problems } = getSupabaseEnvDiagnostics();

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
