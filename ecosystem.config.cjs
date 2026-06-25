const fs = require("node:fs");
const path = require("node:path");

const appDir = __dirname;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
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
      }

      env[key] = value;
      return env;
    }, {});
}

const productionEnv = {
  ...readEnvFile(path.join(appDir, ".env")),
  NODE_ENV: "production",
  PORT: "3000",
  HOST: "127.0.0.1",
};

module.exports = {
  apps: [
    {
      name: "worldcuptv",
      script: ".output/server/index.mjs",
      cwd: appDir,
      interpreter: "node",
      env: productionEnv,
      env_production: productionEnv,
      max_memory_restart: "512M",
      exp_backoff_restart_delay: 1000,
    },
  ],
};