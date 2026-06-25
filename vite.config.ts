// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {} as Record<string, string>;

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

function exposeSelfHostedPublicEnv() {
  const env = { ...parseEnvFile(path.join(process.cwd(), ".env")), ...process.env };
  const aliases: Record<string, string> = {
    VITE_SUPABASE_URL: "SUPABASE_URL",
    VITE_SUPABASE_PUBLISHABLE_KEY: "SUPABASE_PUBLISHABLE_KEY",
    VITE_SUPABASE_PROJECT_ID: "SUPABASE_PROJECT_ID",
  };

  for (const [publicName, serverName] of Object.entries(aliases)) {
    const value = process.env[publicName] || env[publicName] || env[serverName];
    if (value) process.env[publicName] = value;
  }
}

exposeSelfHostedPublicEnv();

export default defineConfig({
  // Outside Lovable, build a normal Node server so a VPS/DigitalOcean droplet
  // can run it with `npm start`/PM2. Lovable-hosted builds still force their
  // own server target automatically.
  nitro: {
    preset: "node-server",
    output: { dir: ".output" },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
