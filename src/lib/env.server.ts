import fs from "node:fs";
import path from "node:path";

let cachedFileEnv: Record<string, string> | undefined;

const FILE_ENV_PREFERRED_KEYS = new Set([
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
]);

const PUBLIC_ENV_ALIASES: Record<string, keyof ImportMetaEnv> = {
  SUPABASE_URL: "VITE_SUPABASE_URL",
  SUPABASE_PUBLISHABLE_KEY: "VITE_SUPABASE_PUBLISHABLE_KEY",
  SUPABASE_PROJECT_ID: "VITE_SUPABASE_PROJECT_ID",
  VITE_SUPABASE_URL: "VITE_SUPABASE_URL",
  VITE_SUPABASE_PUBLISHABLE_KEY: "VITE_SUPABASE_PUBLISHABLE_KEY",
  VITE_SUPABASE_PROJECT_ID: "VITE_SUPABASE_PROJECT_ID",
};

function candidateEnvDirs(): string[] {
  const dirs = new Set<string>();
  const addWithParents = (start?: string) => {
    if (!start) return;
    let dir = path.resolve(start);
    for (let i = 0; i < 5; i += 1) {
      dirs.add(dir);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  };

  addWithParents(process.cwd());
  addWithParents(process.argv[1] ? path.dirname(process.argv[1]) : undefined);
  return [...dirs];
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "").trim();
      }

      env[key] = value;
      return env;
    }, {});
}

function getFileEnv(): Record<string, string> {
  if (!cachedFileEnv) {
    cachedFileEnv = candidateEnvDirs().reduce<Record<string, string>>((env, dir) => ({
      ...env,
      ...parseEnvFile(path.join(dir, ".env")),
      ...parseEnvFile(path.join(dir, ".env.local")),
    }), {});
  }
  return cachedFileEnv;
}

export function getServerEnv(name: string): string | undefined {
  const fileValue = getFileEnv()[name]?.trim();
  if (FILE_ENV_PREFERRED_KEYS.has(name) && fileValue) return fileValue;

  const buildTimePublicKey = PUBLIC_ENV_ALIASES[name];
  const buildTimePublicValue = buildTimePublicKey ? import.meta.env[buildTimePublicKey]?.trim() : undefined;
  if (FILE_ENV_PREFERRED_KEYS.has(name) && buildTimePublicValue) return buildTimePublicValue;

  if (
    name === "SUPABASE_SERVICE_ROLE_KEY" &&
    !fileValue &&
    process.env.SUPABASE_URL?.trim() &&
    ((getFileEnv().SUPABASE_URL?.trim() && getFileEnv().SUPABASE_URL?.trim() !== process.env.SUPABASE_URL?.trim()) ||
      (import.meta.env.VITE_SUPABASE_URL?.trim() &&
        import.meta.env.VITE_SUPABASE_URL?.trim() !== process.env.SUPABASE_URL?.trim()))
  ) {
    // If a remix intentionally points at another backend via .env, do not use
    // this project's managed service-role key against the wrong backend.
    return undefined;
  }

  const runtimeValue = process.env[name]?.trim();
  if (runtimeValue) return runtimeValue;
  return fileValue || undefined;
}

export function hasServerEnv(name: string): boolean {
  return Boolean(getServerEnv(name));
}