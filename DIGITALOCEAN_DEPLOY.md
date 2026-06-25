# DigitalOcean deployment

This project is configured to build a stable Node server outside Lovable.

## 1) Server setup

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
sudo npm install -g pm2
```

## 2) Put the project on the droplet

```bash
sudo mkdir -p /var/www/worldcuptv
sudo chown -R $USER:$USER /var/www/worldcuptv
cd /var/www/worldcuptv
git clone YOUR_REPOSITORY_URL .
```

## 3) Add runtime environment variables

```bash
cp .env.selfhost.example .env
nano .env
```

Fill the values on the server only. Never paste private keys into chat or commit them.

## 4) Build and start

```bash
cd /var/www/worldcuptv
bun install
bun run build
pm2 delete worldcuptv 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/public/health
```

You should see `HTTP/1.1 200 OK` or a redirect/status response from the app. The health endpoint must return JSON with `ok: true`. Any `env` value showing `false` means that key is missing from `/var/www/worldcuptv/.env`.

## 5) Nginx reverse proxy

Create `/etc/nginx/sites-available/worldcuptv`:

```nginx
server {
    listen 80;
    server_name worldcuptv.to www.worldcuptv.to;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/worldcuptv /etc/nginx/sites-enabled/worldcuptv
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d worldcuptv.to -d www.worldcuptv.to
```

## Redeploy after changes

```bash
cd /var/www/worldcuptv
git pull
bun install
bun run build
pm2 restart worldcuptv --update-env || pm2 start ecosystem.config.cjs --env production
pm2 save
```

## Fix a 502 Bad Gateway immediately

`502 Bad Gateway` means nginx is online but the app server behind it is not listening on port `3000`.

Run this on the droplet:

```bash
cd /var/www/worldcuptv
git pull
bun install
bun run build
pm2 delete worldcuptv 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 status
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/public/health
sudo systemctl reload nginx
```

If `curl -I http://127.0.0.1:3000` still fails, check the real crash reason:

```bash
pm2 logs worldcuptv --lines 100 --nostream
```

## Fix the current screenshot state: PM2 online but `HTTP/1.1 500`

Your screenshot shows PM2 is online and listening on `127.0.0.1:3000`, so nginx is not the first problem. The app itself is returning `500`, usually because the droplet does not have the newest build or a required `.env` value is missing.

Run this exact recovery sequence:

```bash
cd /var/www/worldcuptv

# Make sure the droplet has the latest deployment fixes.
git pull

# Confirm the required env file exists.
ls -la .env
nano .env

# Rebuild with the updated config and restart PM2 cleanly.
bun install
bun run build
pm2 delete worldcuptv 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save

# Test the app before touching nginx.
curl http://127.0.0.1:3000/api/public/health
curl -I http://127.0.0.1:3000/
```

If `/api/public/health` shows any of these as `false`, add the missing value to `.env` and restart PM2:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
API_FOOTBALL_KEY=YOUR_API_FOOTBALL_KEY
STRIPE_SECRET_KEY=sk_test_or_sk_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STREAM_SIGNING_SECRET=make-a-long-random-string
```

Then:

```bash
git pull
bun run build
pm2 delete worldcuptv 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
curl http://127.0.0.1:3000/api/public/health
```

Only reload nginx after the local curl works:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If `sudo systemctl reload nginx` fails, run:

```bash
sudo nginx -t
sudo systemctl status nginx.service --no-pager
sudo journalctl -xeu nginx.service --no-pager | tail -80
```

Most nginx reload failures are caused by a typo in `/etc/nginx/sites-available/worldcuptv` or a duplicate `server_name` in another enabled nginx file.

## Useful checks

```bash
pm2 status
pm2 logs worldcuptv --lines 80 --nostream
sudo nginx -t
sudo tail -80 /var/log/nginx/error.log
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/public/health
```

If nginx shows `502 Bad Gateway`, the Node app is not running or nginx is pointing to the wrong port.