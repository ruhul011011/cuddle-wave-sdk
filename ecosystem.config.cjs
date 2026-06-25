module.exports = {
  apps: [
    {
      name: "worldcuptv",
      script: ".output/server/index.mjs",
      cwd: "/var/www/worldcuptv",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOST: "127.0.0.1",
      },
      max_memory_restart: "512M",
      exp_backoff_restart_delay: 1000,
    },
  ],
};