# Exorcise AI — Deployment Guide (Ubuntu Server 24)

## Prerequisites

- Ubuntu Server 24.04 LTS
- Root or sudo access
- Domain name pointed to server IP (for SSL)

---

## 1. Install Node.js 20

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v  # Should show v20.x
```

## 2. Install PostgreSQL 16

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create DB and user
sudo -u postgres psql <<EOF
CREATE USER exorcise WITH PASSWORD 'your-strong-password-here';
CREATE DATABASE exorcise_ai OWNER exorcise;
GRANT ALL PRIVILEGES ON DATABASE exorcise_ai TO exorcise;
EOF
```

## 3. Clone & Install

```bash
cd /opt
git clone https://github.com/your-org/exorcise-ai.git
cd exorcise-ai
npm install
```

## 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all required values:
- `DATABASE_URL=postgresql://exorcise:your-strong-password-here@localhost:5432/exorcise_ai`
- `BETTER_AUTH_SECRET` — generate with: `openssl rand -base64 32`
- `TOTP_ENCRYPTION_KEY` — generate with: `openssl rand -base64 24 | head -c 32`
- `ADMIN_SYNC_SECRET` — generate with: `openssl rand -hex 16`
- Set your Google Sheets credentials, SMTP settings, etc.

## 5. Database Migration

```bash
npx prisma migrate deploy
```

## 6. Seed Admin User

```bash
npx ts-node scripts/seed-admin.ts
```

## 7. Build for Production

```bash
npm run build
```

## 8. PM2 Setup

```bash
npm install -g pm2
pm2 start npm --name "exorcise-ai" -- start
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

## 9. Nginx Reverse Proxy

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/exorcise-ai
```

Paste this config:

```nginx
server {
    listen 80;
    server_name exorcise.ai www.exorcise.ai;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/exorcise-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d exorcise.ai -d www.exorcise.ai
```

## 10. Cron Job for Sheet Sync (Optional)

```bash
crontab -e
```

Add:
```
0 */6 * * * curl -s -X POST -H "x-sync-secret: YOUR_ADMIN_SYNC_SECRET" https://exorcise.ai/api/admin/sync-sheets > /dev/null
```

---

## Useful Commands

```bash
# Check status
pm2 status
pm2 logs exorcise-ai

# Restart
pm2 restart exorcise-ai

# Update
cd /opt/exorcise-ai
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart exorcise-ai
```

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong BETTER_AUTH_SECRET
- [ ] Set strong TOTP_ENCRYPTION_KEY
- [ ] Enable UFW firewall: `sudo ufw allow 22,80,443/tcp && sudo ufw enable`
- [ ] Disable root SSH login
- [ ] Set up automatic security updates
- [ ] Configure email for transactional messages
- [ ] Test Google Sheets sync
