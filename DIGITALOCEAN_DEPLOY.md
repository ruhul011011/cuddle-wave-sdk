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
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
curl -I http://127.0.0.1:3000
```

You should see `HTTP/1.1 200 OK` or a redirect/status response from the app.

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
pm2 restart worldcuptv --update-env
pm2 save
```

## Useful checks

```bash
pm2 status
pm2 logs worldcuptv --lines 80 --nostream
sudo nginx -t
sudo tail -80 /var/log/nginx/error.log
curl -I http://127.0.0.1:3000
```

If nginx shows `502 Bad Gateway`, the Node app is not running or nginx is pointing to the wrong port.