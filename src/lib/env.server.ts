import fs from "node:fs";
import path from "node:path";

let cachedFileEnv: Record<string, string> | undefined;

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
    cachedFileEnv = {
      ...parseEnvFile(path.join(process.cwd(), ".env")),
      ...parseEnvFile(path.join(process.cwd(), ".env.local")),
    };
  }
  return cachedFileEnv;
}

export function getServerEnv(name: string): string | undefined {
  const runtimeValue = process.env[name]?.trim();
  if (runtimeValue) return runtimeValue;
  return getFileEnv()[name]?.trim() || undefined;
}

export function hasServerEnv(name: string): boolean {
  return Boolean(getServerEnv(name));
}