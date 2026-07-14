# ETeams — Production Deployment

Guide for deploying to a single VPS (Hetzner CX21 / DigitalOcean $12 droplet). Handles up to ~1000 users comfortably.

## Prerequisites

- Ubuntu 22.04 LTS VPS with sudo access
- Domain name pointing to the VPS IP (e.g. `eteams.edara.com.eg`)
- Basic firewall (ports 22, 80, 443 open)

## 1 — Install dependencies

```bash
# Update
sudo apt update && sudo apt upgrade -y

# Node.js 20 (from NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Nginx + Certbot (for SSL)
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2 (process manager)
sudo npm install -g pm2
```

## 2 — Create database

```bash
sudo mysql

CREATE DATABASE eteams CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eteams'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON eteams.* TO 'eteams'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3 — Deploy backend

```bash
# Create user + directory
sudo useradd -m -s /bin/bash eteams
sudo mkdir -p /var/www/eteams && sudo chown eteams:eteams /var/www/eteams

# As eteams user
sudo -u eteams bash
cd /var/www/eteams

# Copy your project here (via git clone / scp / rsync)
# Assuming you scp'd the eteams/ folder:

cd backend
npm ci --production
cp .env.example .env
# Edit .env:
#   NODE_ENV=production
#   DB_HOST=127.0.0.1  DB_USER=eteams  DB_PASSWORD=strong-password-here
#   DB_NAME=eteams
#   JWT_SECRET=$(openssl rand -hex 48)
#   CORS_ORIGIN=https://eteams.edara.com.eg
nano .env

# Run migrations + seed
npm run migrate
npm run seed  # Only for first run! Otherwise your users would be wiped.

# Start with PM2
pm2 start src/server.js --name eteams-backend
pm2 save
pm2 startup   # Follow the printed instructions for boot persistence
```

## 4 — Build & deploy web

```bash
cd /var/www/eteams/web
npm ci
cp .env.example .env
# Edit .env:
#   VITE_API_URL=https://eteams.edara.com.eg
#   VITE_SOCKET_URL=https://eteams.edara.com.eg
nano .env

npm run build
# Output goes to dist/
```

## 5 — Nginx config

```bash
sudo nano /etc/nginx/sites-available/eteams
```

Paste:

```nginx
upstream eteams_backend {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    server_name eteams.edara.com.eg;
    client_max_body_size 25M;

    # Serve React SPA
    root /var/www/eteams/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://eteams_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads (static files served by backend)
    location /uploads/ {
        proxy_pass http://eteams_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Socket.io (WebSocket)
    location /socket.io/ {
        proxy_pass http://eteams_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }

    listen 80;
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/eteams /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6 — SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d eteams.edara.com.eg
# Follow the prompts. Certbot will auto-modify your Nginx config for SSL.
# Auto-renewal is enabled by default (systemd timer).
```

## 7 — Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 8 — Health check

```bash
curl https://eteams.edara.com.eg/api/health
# → {"ok":true,"service":"eteams-backend"}
```

Open `https://eteams.edara.com.eg` in a browser and sign in.

## 9 — Mobile app config

Update `mobile/.env`:
```
API_URL=https://eteams.edara.com.eg
SOCKET_URL=https://eteams.edara.com.eg
```

Then:
```bash
cd mobile
flutter build apk --release
flutter build ios --release  # macOS only
```

Deploy APK internally / submit to TestFlight for iOS.

## Backups

**Daily MySQL dump to S3:**

```bash
sudo nano /usr/local/bin/eteams-backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%F)
mysqldump -u eteams -p'strong-password-here' eteams | gzip > /tmp/eteams-$DATE.sql.gz
aws s3 cp /tmp/eteams-$DATE.sql.gz s3://edara-backups/eteams/
rm /tmp/eteams-$DATE.sql.gz
```

```bash
sudo chmod +x /usr/local/bin/eteams-backup.sh
sudo crontab -e
# Add:
0 3 * * * /usr/local/bin/eteams-backup.sh
```

## Monitoring

- `pm2 monit` — live process view
- `pm2 logs eteams-backend` — tail logs
- `sudo tail -f /var/log/nginx/access.log` — HTTP logs
- Set up UptimeRobot / BetterUptime pinging `/api/health` every minute.

## Updates / deploys

```bash
sudo -u eteams bash
cd /var/www/eteams
git pull  # or rsync new files

cd backend
npm ci --production
npm run migrate  # if new migrations
pm2 restart eteams-backend

cd ../web
npm ci
npm run build
# Nginx serves the new dist/ automatically
```

## Scaling checklist (when you outgrow the single box)

1. Move MySQL to managed DB (DigitalOcean Managed MySQL / RDS)
2. Move uploads to S3-compatible storage (`storage_key` field ready in schema)
3. Add Redis for Socket.io multi-node adapter — see [socket.io docs](https://socket.io/docs/v4/redis-adapter/)
4. Add second backend node behind Nginx upstream
5. Add CDN (Cloudflare / CloudFront) in front for static assets
