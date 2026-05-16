#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 👻 EXORCISE AI — Production Installer v2.0
# "Summon the answer. Banish the unknown."
# Target: Ubuntu Server 24.04 LTS
# ═══════════════════════════════════════════════════════════════

LOG_FILE="/var/log/exorcise-install.log"
APP_DIR=""
DOMAIN=""
SSL_EMAIL=""
REPO_URL=""
GIT_BRANCH="main"
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
RESEND_API_KEY=""
GOOGLE_SHEET_ID=""
GOOGLE_SA_JSON=""
DB_NAME="exorcise_ai"
DB_USER="exorcise_user"
DB_PASSWORD=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${CYAN}  → ${NC}$1"; }
ok()      { echo -e "${GREEN}  ✓${NC} $1"; }
fail()    { echo -e "${RED}  ✗ FAILED:${NC} $1"; echo "  Check log: $LOG_FILE"; exit 1; }
warn()    { echo -e "${YELLOW}  ⚠${NC} $1"; }
section() { echo -e "\n${PURPLE}${BOLD}── $1 ──${NC}\n"; }

# Safe command runner — logs output, doesn't die on failure
run_cmd() {
  local desc="$1"
  shift
  log "$desc"
  if "$@" >> "$LOG_FILE" 2>&1; then
    ok "$desc"
    return 0
  else
    fail "$desc"
    return 1
  fi
}

# ══════════════════════════════════════════════════════════════
# PHASE 0: Banner & Pre-flight
# ══════════════════════════════════════════════════════════════
phase_preflight() {
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${NC}          👻  ${BOLD}EXORCISE AI — INSTALLER v2.0${NC}           ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}        ${CYAN}\"Summon the answer. Banish the unknown.\"${NC}      ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}                                                      ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}   Ubuntu 24 LTS  •  Next.js 14  •  PostgreSQL 16     ${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Run this script as root (sudo ./installer.sh)${NC}"
    exit 1
  fi

  if ! ping -c1 -W3 google.com > /dev/null 2>&1; then
    echo -e "${RED}Error: No internet connectivity.${NC}"
    exit 1
  fi

  mkdir -p "$(dirname "$LOG_FILE")"
  echo "=== Exorcise AI Install — $(date) ===" > "$LOG_FILE"
  ok "Pre-flight checks passed"
}

# ══════════════════════════════════════════════════════════════
# PHASE 1: Interactive Prompts
# ══════════════════════════════════════════════════════════════
phase_prompts() {
  section "📝 CONFIGURATION"

  # Domain
  while true; do
    read -rp "$(echo -e "${CYAN}Domain (e.g. chat.claudie.id): ${NC}")" DOMAIN
    DOMAIN=$(echo "$DOMAIN" | sed 's|https\?://||;s|/$||')
    [ -n "$DOMAIN" ] && break
    warn "Domain cannot be empty."
  done

  # SSL Email
  while true; do
    read -rp "$(echo -e "${CYAN}Email for SSL (Let's Encrypt): ${NC}")" SSL_EMAIL
    [[ "$SSL_EMAIL" == *"@"*"."* ]] && break
    warn "Enter a valid email."
  done

  # Detect if we're already in a git repo with package.json
  local CURRENT_DIR
  CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  if [ -f "$CURRENT_DIR/package.json" ] && [ -d "$CURRENT_DIR/.git" ]; then
    echo ""
    echo -e "  ${GREEN}✓ Detected project in:${NC} $CURRENT_DIR"
    read -rp "$(echo -e "${CYAN}Use this directory? (Y/n): ${NC}")" USE_CURRENT
    if [[ "$USE_CURRENT" =~ ^[nN]$ ]]; then
      read -rp "$(echo -e "${CYAN}App directory (default: /var/www/exorcise-ai): ${NC}")" APP_DIR
      APP_DIR=${APP_DIR:-/var/www/exorcise-ai}
      # Need repo URL for cloning
      while true; do
        read -rp "$(echo -e "${CYAN}GitHub repo URL: ${NC}")" REPO_URL
        [ -n "$REPO_URL" ] && break
        warn "Repo URL required."
      done
      read -rp "$(echo -e "${CYAN}Branch (default: main): ${NC}")" GIT_BRANCH
      GIT_BRANCH=${GIT_BRANCH:-main}
    else
      APP_DIR="$CURRENT_DIR"
      REPO_URL="ALREADY_CLONED"
    fi
  else
    read -rp "$(echo -e "${CYAN}App directory (default: /var/www/exorcise-ai): ${NC}")" APP_DIR
    APP_DIR=${APP_DIR:-/var/www/exorcise-ai}
    while true; do
      read -rp "$(echo -e "${CYAN}GitHub repo URL: ${NC}")" REPO_URL
      [ -n "$REPO_URL" ] && break
      warn "Repo URL required."
    done
    read -rp "$(echo -e "${CYAN}Branch (default: main): ${NC}")" GIT_BRANCH
    GIT_BRANCH=${GIT_BRANCH:-main}
  fi

  # Admin
  while true; do
    read -rp "$(echo -e "${CYAN}Admin email: ${NC}")" ADMIN_EMAIL
    [[ "$ADMIN_EMAIL" == *"@"* ]] && break
    warn "Enter a valid email."
  done

  while true; do
    read -rsp "$(echo -e "${CYAN}Admin password (min 8 chars): ${NC}")" ADMIN_PASSWORD
    echo ""
    [ ${#ADMIN_PASSWORD} -ge 8 ] && break
    warn "Password too short."
  done

  # Optional
  read -rp "$(echo -e "${CYAN}Resend API Key (Enter to skip): ${NC}")" RESEND_API_KEY
  read -rp "$(echo -e "${CYAN}Google Sheet ID (Enter to skip): ${NC}")" GOOGLE_SHEET_ID
  read -rp "$(echo -e "${CYAN}Google SA JSON file path (Enter to skip): ${NC}")" GOOGLE_SA_PATH
  if [ -n "$GOOGLE_SA_PATH" ] && [ -f "$GOOGLE_SA_PATH" ]; then
    GOOGLE_SA_JSON=$(cat "$GOOGLE_SA_PATH" | tr -d '\n')
    ok "Service account JSON loaded"
  fi

  # Summary
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║  ${BOLD}INSTALLATION SUMMARY${NC}                                ${PURPLE}║${NC}"
  echo -e "${PURPLE}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${PURPLE}║${NC}  Domain:   ${CYAN}$DOMAIN${NC}"
  echo -e "${PURPLE}║${NC}  App Dir:  ${CYAN}$APP_DIR${NC}"
  echo -e "${PURPLE}║${NC}  Admin:    ${CYAN}$ADMIN_EMAIL${NC}"
  if [ "$REPO_URL" = "ALREADY_CLONED" ]; then
    echo -e "${PURPLE}║${NC}  Source:   ${GREEN}Already cloned (in-place)${NC}"
  else
    echo -e "${PURPLE}║${NC}  Repo:     ${CYAN}$REPO_URL ($GIT_BRANCH)${NC}"
  fi
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""

  read -rp "$(echo -e "${BOLD}Proceed? (y/N): ${NC}")" CONFIRM
  if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
}

# ══════════════════════════════════════════════════════════════
# PHASE 2: System Update
# ══════════════════════════════════════════════════════════════
phase_system() {
  section "📦 SYSTEM PACKAGES"
  log "Updating system..."
  apt-get update -y >> "$LOG_FILE" 2>&1
  apt-get upgrade -y >> "$LOG_FILE" 2>&1
  ok "System updated"

  log "Installing base dependencies..."
  apt-get install -y curl git wget unzip build-essential ca-certificates gnupg \
    lsb-release software-properties-common openssl ufw >> "$LOG_FILE" 2>&1
  ok "Dependencies installed"
}

# ══════════════════════════════════════════════════════════════
# PHASE 3: Node.js 20 (via NodeSource, NOT nvm)
# ══════════════════════════════════════════════════════════════
phase_nodejs() {
  section "🟢 NODE.JS 20"

  local CURRENT_NODE=""
  if command -v node &>/dev/null; then
    CURRENT_NODE=$(node -v 2>/dev/null | sed 's/v//')
    local MAJOR=${CURRENT_NODE%%.*}
    if [ "$MAJOR" -ge 20 ] 2>/dev/null; then
      ok "Node.js v$CURRENT_NODE already installed (>= v20)"
    else
      warn "Node.js v$CURRENT_NODE found but need v20+. Upgrading..."
      log "Adding NodeSource repository for Node 20..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1
      apt-get install -y nodejs >> "$LOG_FILE" 2>&1
      ok "Node.js upgraded to $(node -v)"
    fi
  else
    log "Installing Node.js 20 from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1
    apt-get install -y nodejs >> "$LOG_FILE" 2>&1
    ok "Node.js $(node -v) installed"
  fi

  # Verify
  log "Node: $(node -v), npm: $(npm -v)"

  # Install global packages
  log "Installing PM2 globally..."
  npm install -g pm2 >> "$LOG_FILE" 2>&1
  ok "PM2 $(pm2 -v 2>/dev/null || echo 'installed')"
}

# ══════════════════════════════════════════════════════════════
# PHASE 4: PostgreSQL
# ══════════════════════════════════════════════════════════════
phase_postgresql() {
  section "🐘 POSTGRESQL"

  DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

  if command -v psql &>/dev/null; then
    ok "PostgreSQL already installed"
  else
    log "Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib >> "$LOG_FILE" 2>&1
    systemctl enable postgresql >> "$LOG_FILE" 2>&1
    systemctl start postgresql >> "$LOG_FILE" 2>&1
    ok "PostgreSQL installed and started"
  fi

  # Create DB user and database (ignore errors if already exists)
  log "Creating database '$DB_NAME' and user '$DB_USER'..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >> "$LOG_FILE" 2>&1 || true
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >> "$LOG_FILE" 2>&1 || true
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >> "$LOG_FILE" 2>&1 || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >> "$LOG_FILE" 2>&1 || true
  ok "Database ready: $DB_NAME"
}

# ══════════════════════════════════════════════════════════════
# PHASE 5: Nginx
# ══════════════════════════════════════════════════════════════
phase_nginx() {
  section "🌐 NGINX"

  if ! command -v nginx &>/dev/null; then
    log "Installing Nginx..."
    apt-get install -y nginx >> "$LOG_FILE" 2>&1
    systemctl enable nginx >> "$LOG_FILE" 2>&1
    systemctl start nginx >> "$LOG_FILE" 2>&1
    ok "Nginx installed"
  else
    ok "Nginx already installed"
  fi

  log "Writing Nginx config for $DOMAIN..."
  cat > /etc/nginx/sites-available/exorcise-ai << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

  ln -sf /etc/nginx/sites-available/exorcise-ai /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t >> "$LOG_FILE" 2>&1; then
    systemctl reload nginx >> "$LOG_FILE" 2>&1
    ok "Nginx configured and reloaded"
  else
    warn "Nginx config test failed — check manually"
  fi
}

# ══════════════════════════════════════════════════════════════
# PHASE 6: Clone / Prepare App
# ══════════════════════════════════════════════════════════════
phase_app() {
  section "📂 APPLICATION"

  if [ "$REPO_URL" = "ALREADY_CLONED" ]; then
    ok "Using existing project at $APP_DIR"
  else
    if [ -d "$APP_DIR" ] && [ -f "$APP_DIR/package.json" ]; then
      warn "Directory exists. Pulling latest..."
      cd "$APP_DIR"
      git pull origin "$GIT_BRANCH" >> "$LOG_FILE" 2>&1 || true
      ok "Code updated"
    else
      log "Cloning repository..."
      git clone --branch "$GIT_BRANCH" "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1
      ok "Repository cloned to $APP_DIR"
    fi
  fi
}

# ══════════════════════════════════════════════════════════════
# PHASE 7: Generate .env
# ══════════════════════════════════════════════════════════════
phase_env() {
  section "🔑 ENVIRONMENT VARIABLES"

  local BETTER_AUTH_SECRET
  BETTER_AUTH_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)
  local TOTP_ENCRYPTION_KEY
  TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
  local ADMIN_SYNC_SECRET
  ADMIN_SYNC_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

  log "Generating .env with secure secrets..."

  cat > "$APP_DIR/.env" << ENVEOF
# ═══ Exorcise AI — Production Environment ═══
# Generated: $(date)

# App
NEXT_PUBLIC_APP_URL=https://$DOMAIN
NEXT_PUBLIC_APP_NAME="Exorcise AI"
NODE_ENV=production

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# BetterAuth
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=https://$DOMAIN

# Admin
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_SYNC_SECRET=$ADMIN_SYNC_SECRET

# Email
RESEND_API_KEY=$RESEND_API_KEY
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Exorcise AI <noreply@$DOMAIN>"

# TOTP
TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY
TOTP_ISSUER=Exorcise AI

# Google Sheets
GOOGLE_SHEET_ID=$GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON=$GOOGLE_SA_JSON
SHEET_SYNC_INTERVAL_HOURS=6
ENVEOF

  chmod 600 "$APP_DIR/.env"
  ok ".env created with auto-generated secrets"

  # Save secrets to report
  REPORT_SECRETS="BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY
ADMIN_SYNC_SECRET=$ADMIN_SYNC_SECRET
DB_PASSWORD=$DB_PASSWORD"
}

# ══════════════════════════════════════════════════════════════
# PHASE 8: Build App
# ══════════════════════════════════════════════════════════════
phase_build() {
  section "🔨 BUILD"

  cd "$APP_DIR"

  log "Installing npm dependencies..."
  npm install >> "$LOG_FILE" 2>&1
  ok "Dependencies installed"

  log "Generating Prisma client..."
  npx prisma generate >> "$LOG_FILE" 2>&1
  ok "Prisma client generated"

  log "Running database migrations..."
  npx prisma migrate deploy >> "$LOG_FILE" 2>&1
  ok "Migrations applied"

  log "Seeding admin user..."
  npx tsx scripts/seed-admin.ts >> "$LOG_FILE" 2>&1 || npx ts-node scripts/seed-admin.ts >> "$LOG_FILE" 2>&1 || {
    warn "Seed script failed — you can run it manually later"
  }
  ok "Admin user seeded"

  log "Building Next.js for production (this takes a minute)..."
  npm run build >> "$LOG_FILE" 2>&1
  ok "Production build complete"
}

# ══════════════════════════════════════════════════════════════
# PHASE 9: PM2
# ══════════════════════════════════════════════════════════════
phase_pm2() {
  section "🚀 PM2 PROCESS MANAGER"

  cd "$APP_DIR"

  # Create ecosystem file
  cat > "$APP_DIR/ecosystem.config.cjs" << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'exorcise-ai',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 10,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
PM2EOF

  mkdir -p /var/log/exorcise-ai

  # Stop existing
  pm2 delete exorcise-ai >> "$LOG_FILE" 2>&1 || true

  log "Starting app with PM2..."
  cd "$APP_DIR"
  pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1
  ok "PM2 started"

  pm2 save >> "$LOG_FILE" 2>&1
  pm2 startup systemd -u root --hp /root >> "$LOG_FILE" 2>&1 || true
  ok "PM2 startup configured"

  # Health check (wait for startup)
  log "Waiting for app to start..."
  sleep 8

  local RETRIES=0
  while [ $RETRIES -lt 5 ]; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
      ok "Health check PASSED — app is live!"
      return 0
    fi
    RETRIES=$((RETRIES + 1))
    sleep 3
  done
  warn "Health check failed. Check: pm2 logs exorcise-ai"
}

# ══════════════════════════════════════════════════════════════
# PHASE 10: Firewall
# ══════════════════════════════════════════════════════════════
phase_firewall() {
  section "🔥 FIREWALL"
  ufw --force reset >> "$LOG_FILE" 2>&1
  ufw default deny incoming >> "$LOG_FILE" 2>&1
  ufw default allow outgoing >> "$LOG_FILE" 2>&1
  ufw allow ssh >> "$LOG_FILE" 2>&1
  ufw allow 80/tcp >> "$LOG_FILE" 2>&1
  ufw allow 443/tcp >> "$LOG_FILE" 2>&1
  ufw --force enable >> "$LOG_FILE" 2>&1
  ok "UFW enabled (SSH, HTTP, HTTPS)"
}

# ══════════════════════════════════════════════════════════════
# PHASE 11: SSL
# ══════════════════════════════════════════════════════════════
phase_ssl() {
  section "🔒 SSL (Let's Encrypt)"

  if ! command -v certbot &>/dev/null; then
    log "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx >> "$LOG_FILE" 2>&1
    ok "Certbot installed"
  fi

  log "Requesting certificate for $DOMAIN..."
  if certbot --nginx --non-interactive --agree-tos --email "$SSL_EMAIL" \
     --domains "$DOMAIN" --redirect >> "$LOG_FILE" 2>&1; then
    ok "SSL certificate installed!"
    # Auto-renewal cron
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | crontab - 2>/dev/null
    ok "Auto-renewal configured"
  else
    warn "SSL failed — your DNS might not point to this server yet."
    local SERVER_IP
    SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo ""
    echo -e "  ${CYAN}Your server IP: $SERVER_IP${NC}"
    echo -e "  ${CYAN}Set DNS A record: $DOMAIN → $SERVER_IP${NC}"
    echo -e "  ${CYAN}Then run: sudo certbot --nginx -d $DOMAIN${NC}"
    echo ""
  fi
}

# ══════════════════════════════════════════════════════════════
# PHASE 12: Report
# ══════════════════════════════════════════════════════════════
phase_report() {
  section "📄 INSTALL REPORT"

  local REPORT="/root/exorcise-ai-credentials.txt"

  cat > "$REPORT" << REPORTEOF
═══════════════════════════════════════════════════════
  👻 EXORCISE AI — Installation Credentials
  Generated: $(date)
═══════════════════════════════════════════════════════

URL:           https://$DOMAIN
Admin Panel:   https://$DOMAIN/admin
App Directory: $APP_DIR

DATABASE:
  Name:     $DB_NAME
  User:     $DB_USER
  Password: $DB_PASSWORD
  URL:      postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

SECRETS:
$REPORT_SECRETS

ADMIN:
  Email:    $ADMIN_EMAIL

COMMANDS:
  pm2 status                    # App status
  pm2 logs exorcise-ai          # View logs
  pm2 restart exorcise-ai       # Restart
  sudo certbot --nginx -d $DOMAIN  # Setup SSL (if failed)
  cd $APP_DIR && npx prisma studio  # DB GUI

═══════════════════════════════════════════════════════
  ⚠ SAVE THESE CREDENTIALS AND DELETE THIS FILE!
  rm /root/exorcise-ai-credentials.txt
═══════════════════════════════════════════════════════
REPORTEOF

  chmod 600 "$REPORT"
  ok "Credentials saved to $REPORT"
}

# ══════════════════════════════════════════════════════════════
# DONE!
# ══════════════════════════════════════════════════════════════
phase_done() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   👻  ${BOLD}EXORCISE AI — INSTALLATION COMPLETE!${NC}          ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   🌐 ${CYAN}https://$DOMAIN${NC}"
  echo -e "${GREEN}║${NC}   🏛️  ${CYAN}https://$DOMAIN/admin${NC}"
  echo -e "${GREEN}║${NC}   📄 ${CYAN}/root/exorcise-ai-credentials.txt${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   ${YELLOW}⚠ Save credentials then delete the file!${NC}         ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
main() {
  phase_preflight
  phase_prompts
  phase_system
  phase_nodejs
  phase_postgresql
  phase_nginx
  phase_app
  phase_env
  phase_build
  phase_pm2
  phase_firewall
  phase_ssl
  phase_report
  phase_done
}

main "$@"
