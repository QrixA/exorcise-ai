#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# 👻 EXORCISE AI — Production Installer v1.0
# "Summon the answer. Banish the unknown."
# Target: Ubuntu Server 24.04 LTS (fresh install)
# ═══════════════════════════════════════════════════════════════

LOG_FILE="/var/log/exorcise-install.log"
APP_DIR="/var/www/exorcise-ai"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helper Functions ──

log() { echo -e "${CYAN}  → ${NC}$1"; }
ok()  { echo -e "${GREEN}  ✓ Done:${NC} $1"; }
fail() { echo -e "${RED}  ✗ FAILED:${NC} $1"; echo "  Check log: $LOG_FILE"; tail -20 "$LOG_FILE" 2>/dev/null; exit 1; }
warn() { echo -e "${YELLOW}  ⚠ WARNING:${NC} $1"; }
section() { echo -e "\n${PURPLE}${BOLD}── $1 ──${NC}\n"; }

run() {
  log "$1"
  eval "$2" >> "$LOG_FILE" 2>&1
  if [ $? -ne 0 ]; then
    fail "$1"
  fi
  ok "$1"
}

spinner() {
  local pid=$1; local delay=0.1; local spinstr='|/-\'
  while kill -0 "$pid" 2>/dev/null; do
    local temp=${spinstr#?}
    printf " [%c] " "$spinstr"
    spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

run_with_spinner() {
  log "$1"
  eval "$2" >> "$LOG_FILE" 2>&1 &
  local pid=$!
  spinner $pid
  wait $pid
  local status=$?
  if [ $status -ne 0 ]; then
    fail "$1"
  fi
  ok "$1"
}

# ── PHASE 0: Pre-flight Banner ──

phase_preflight() {
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${NC}          👻  ${BOLD}EXORCISE AI — INSTALLER v1.0${NC}           ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}        ${CYAN}\"Summon the answer. Banish the unknown.\"${NC}      ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}                                                      ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}   Ubuntu Server 24 LTS  •  Next.js  •  PostgreSQL   ${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""

  # Root check
  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root or with sudo.${NC}"
    exit 1
  fi

  # OS check
  if command -v lsb_release &>/dev/null; then
    OS_VER=$(lsb_release -rs 2>/dev/null || echo "unknown")
    if [[ "$OS_VER" != "24."* ]]; then
      warn "Expected Ubuntu 24.x, detected: $OS_VER. Proceeding anyway."
    fi
  else
    warn "Cannot detect OS version. Proceeding anyway."
  fi

  # Internet check
  if ! ping -c1 -W3 google.com &>/dev/null; then
    echo -e "${RED}Error: No internet connectivity detected. Exiting.${NC}"
    exit 1
  fi
  ok "Pre-flight checks passed"
}

# ── PHASE 1: Interactive Prompts ──

phase_prompts() {
  section "📝 CONFIGURATION"

  # 1. Domain
  while true; do
    read -rp "$(echo -e "${CYAN}Enter your domain (e.g. exorcise.ai): ${NC}")" DOMAIN
    DOMAIN=$(echo "$DOMAIN" | sed 's|https\?://||;s|/$||')
    [ -n "$DOMAIN" ] && break
    warn "Domain cannot be empty."
  done

  # 2. SSL Email
  while true; do
    read -rp "$(echo -e "${CYAN}Email for SSL certificate (Let's Encrypt): ${NC}")" SSL_EMAIL
    [[ "$SSL_EMAIL" == *"@"*"."* ]] && break
    warn "Please enter a valid email address."
  done

  # 3. GitHub Repo
  while true; do
    read -rp "$(echo -e "${CYAN}GitHub repo URL (e.g. https://github.com/user/exorcise-ai): ${NC}")" REPO_URL
    [[ "$REPO_URL" == https://github.com/* ]] && break
    warn "URL must start with https://github.com/"
  done

  # 4. Branch
  read -rp "$(echo -e "${CYAN}Branch to deploy (default: main): ${NC}")" GIT_BRANCH
  GIT_BRANCH=${GIT_BRANCH:-main}

  # 5. Admin email
  while true; do
    read -rp "$(echo -e "${CYAN}Admin account email: ${NC}")" ADMIN_EMAIL
    [[ "$ADMIN_EMAIL" == *"@"* ]] && break
    warn "Please enter a valid email."
  done

  # 6. Admin password
  while true; do
    read -rsp "$(echo -e "${CYAN}Admin password (min 12 chars, hidden): ${NC}")" ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
      warn "Password must be at least 12 characters."
      continue
    fi
    read -rsp "$(echo -e "${CYAN}Confirm admin password: ${NC}")" ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" ]; then
      break
    fi
    warn "Passwords do not match."
  done

  # 7. Resend API Key
  read -rp "$(echo -e "${CYAN}Resend API Key (press Enter to skip): ${NC}")" RESEND_API_KEY
  RESEND_API_KEY=${RESEND_API_KEY:-}

  # 8. Google Sheet ID
  read -rp "$(echo -e "${CYAN}Google Sheet ID (press Enter to skip): ${NC}")" GOOGLE_SHEET_ID
  GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID:-}

  # 9. Google SA JSON
  read -rp "$(echo -e "${CYAN}Path to Google service account JSON file (press Enter to skip): ${NC}")" GOOGLE_SA_PATH
  GOOGLE_SA_JSON=""
  if [ -n "$GOOGLE_SA_PATH" ]; then
    if [ -f "$GOOGLE_SA_PATH" ]; then
      if python3 -c "import json; json.load(open('$GOOGLE_SA_PATH'))" 2>/dev/null; then
        GOOGLE_SA_JSON=$(cat "$GOOGLE_SA_PATH" | tr -d '\n')
        ok "Service account JSON validated"
      else
        warn "File is not valid JSON. Skipping."
      fi
    else
      warn "File not found: $GOOGLE_SA_PATH. Skipping."
    fi
  fi

  # Summary
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}INSTALLATION SUMMARY${NC}                                ${PURPLE}║${NC}"
  echo -e "${PURPLE}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${PURPLE}║${NC}  Domain:      ${CYAN}$DOMAIN${NC}"
  echo -e "${PURPLE}║${NC}  SSL Email:   ${CYAN}$SSL_EMAIL${NC}"
  echo -e "${PURPLE}║${NC}  Repo:        ${CYAN}$REPO_URL${NC}"
  echo -e "${PURPLE}║${NC}  Branch:      ${CYAN}$GIT_BRANCH${NC}"
  echo -e "${PURPLE}║${NC}  Admin:       ${CYAN}$ADMIN_EMAIL${NC}"
  echo -e "${PURPLE}║${NC}  Resend:      ${CYAN}${RESEND_API_KEY:-(skipped)}${NC}"
  echo -e "${PURPLE}║${NC}  Sheet ID:    ${CYAN}${GOOGLE_SHEET_ID:-(skipped)}${NC}"
  echo -e "${PURPLE}║${NC}  SA JSON:     ${CYAN}${GOOGLE_SA_JSON:+(provided)}${GOOGLE_SA_JSON:-(skipped)}${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""

  read -rp "$(echo -e "${BOLD}Proceed with installation? (y/N): ${NC}")" CONFIRM
  if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi

  mkdir -p "$(dirname "$LOG_FILE")"
  echo "=== Exorcise AI Install Log — $(date) ===" > "$LOG_FILE"
}

# ── PHASE 2: System Update ──

phase_system_update() {
  section "📦 SYSTEM UPDATE & DEPENDENCIES"
  run_with_spinner "Updating system packages" "apt-get update -y && apt-get upgrade -y"
  run_with_spinner "Installing dependencies" "apt-get install -y curl git wget unzip build-essential ca-certificates gnupg lsb-release software-properties-common openssl ufw fail2ban"
}

# ── PHASE 3: Node.js ──

phase_nodejs() {
  section "🟢 NODE.JS"
  if command -v node &>/dev/null; then
    log "Node.js already installed: $(node -v)"
  else
    run "Installing nvm" "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    run "Installing Node.js 20" "nvm install 20 && nvm alias default 20 && nvm use 20"
  fi
  # Ensure nvm is loaded
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  run "Installing global packages" "npm install -g pm2 prisma typescript ts-node"
}

# ── PHASE 4: PostgreSQL ──

phase_postgresql() {
  section "🐘 POSTGRESQL"

  DB_NAME="exorcise_ai"
  DB_USER="exorcise_user"
  DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

  if command -v psql &>/dev/null; then
    log "PostgreSQL already installed"
  else
    run "Adding PostgreSQL repo" "sh -c 'echo \"deb http://apt.postgresql.org/pub/repos/apt \$(lsb_release -cs)-pgdg main\" > /etc/apt/sources.list.d/pgdg.list' && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -"
    run_with_spinner "Installing PostgreSQL 16" "apt-get update -y && apt-get install -y postgresql-16 postgresql-client-16"
    run "Enabling PostgreSQL" "systemctl enable postgresql && systemctl start postgresql"
  fi

  log "Creating database and user"
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >> "$LOG_FILE" 2>&1 || true
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >> "$LOG_FILE" 2>&1 || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >> "$LOG_FILE" 2>&1 || true
  ok "Database configured: $DB_NAME"
}

# ── PHASE 5: Nginx ──

phase_nginx() {
  section "🌐 NGINX"
  if command -v nginx &>/dev/null; then
    log "Nginx already installed"
  else
    run_with_spinner "Installing Nginx" "apt-get install -y nginx"
    run "Enabling Nginx" "systemctl enable nginx && systemctl start nginx"
  fi

  cat > /etc/nginx/sites-available/exorcise-ai << NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

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
NGINX_EOF

  ln -sf /etc/nginx/sites-available/exorcise-ai /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  run "Testing Nginx config" "nginx -t"
  run "Reloading Nginx" "systemctl reload nginx"
}

# ── PHASE 6: Clone Repo ──

phase_clone_repo() {
  section "📂 CLONE REPOSITORY"
  if [ -d "$APP_DIR" ]; then
    local backup="${APP_DIR}.bak.$(date +%s)"
    warn "Existing app found. Backing up to $backup"
    mv "$APP_DIR" "$backup"
  fi
  run "Cloning repository" "git clone --branch $GIT_BRANCH $REPO_URL $APP_DIR"
}

# ── PHASE 7: Generate .env ──

phase_generate_env() {
  section "🔑 GENERATING SECRETS & .ENV"

  BETTER_AUTH_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)
  TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
  ADMIN_SYNC_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

  cat > "$APP_DIR/.env" << ENV_EOF
# App
NEXT_PUBLIC_APP_URL=https://$DOMAIN
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

# Email (Resend)
RESEND_API_KEY=$RESEND_API_KEY

# SMTP fallback
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
ENV_EOF

  chmod 600 "$APP_DIR/.env"
  chown root:root "$APP_DIR/.env"
  ok "Environment file created"
}

# ── PHASE 8: Build ──

phase_build() {
  section "🔨 INSTALL & BUILD"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  cd "$APP_DIR"
  run_with_spinner "Installing npm dependencies" "npm install --production=false"
  run "Generating Prisma client" "npx prisma generate"
  run "Running database migrations" "npx prisma migrate deploy"
  run_with_spinner "Building Next.js application" "npm run build"
}

# ── PHASE 9: Seed Admin ──

phase_seed_admin() {
  section "👤 SEED ADMIN ACCOUNT"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd "$APP_DIR"
  run "Seeding admin user" "npx ts-node scripts/seed-admin.ts"
}

# ── PHASE 10: PM2 ──

phase_pm2() {
  section "🚀 PM2 PROCESS MANAGER"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  cat > "$APP_DIR/ecosystem.config.js" << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'exorcise-ai',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/exorcise-ai',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: '/var/log/exorcise-ai/error.log',
    out_file: '/var/log/exorcise-ai/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10
  }]
}
PM2_EOF

  mkdir -p /var/log/exorcise-ai
  cd "$APP_DIR"

  # Stop existing if running
  pm2 delete exorcise-ai >> "$LOG_FILE" 2>&1 || true
  run "Starting application with PM2" "pm2 start ecosystem.config.js"
  run "Saving PM2 process list" "pm2 save"

  log "Setting up PM2 startup"
  pm2 startup systemd -u root --hp /root >> "$LOG_FILE" 2>&1 || true
  ok "PM2 startup configured"

  # Health check
  sleep 5
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    ok "Health check passed — app is running"
  else
    warn "Health check failed — app may still be starting. Check: pm2 logs exorcise-ai"
  fi
}

# ── PHASE 11: Firewall ──

phase_firewall() {
  section "🔥 FIREWALL (UFW)"
  ufw --force reset >> "$LOG_FILE" 2>&1
  ufw default deny incoming >> "$LOG_FILE" 2>&1
  ufw default allow outgoing >> "$LOG_FILE" 2>&1
  ufw allow ssh >> "$LOG_FILE" 2>&1
  ufw allow 80/tcp >> "$LOG_FILE" 2>&1
  ufw allow 443/tcp >> "$LOG_FILE" 2>&1
  ufw --force enable >> "$LOG_FILE" 2>&1
  ok "Firewall configured (SSH, HTTP, HTTPS allowed)"
}

# ── PHASE 12: SSL ──

phase_ssl() {
  section "🔒 SSL CERTIFICATE (Let's Encrypt)"

  if ! command -v certbot &>/dev/null; then
    run_with_spinner "Installing Certbot" "apt-get install -y certbot python3-certbot-nginx"
  fi

  log "Requesting SSL certificate for $DOMAIN"
  if certbot --nginx --non-interactive --agree-tos --email "$SSL_EMAIL" --domains "$DOMAIN" --redirect >> "$LOG_FILE" 2>&1; then
    ok "SSL certificate installed"
    systemctl enable certbot.timer >> "$LOG_FILE" 2>&1 || true
    systemctl start certbot.timer >> "$LOG_FILE" 2>&1 || true
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | crontab -
    ok "Auto-renewal configured"
  else
    warn "SSL certificate failed. Your DNS may not be pointing to this server yet."
    SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo -e "  ${CYAN}Server IP: $SERVER_IP${NC}"
    echo -e "  ${CYAN}Point your DNS A record for $DOMAIN to $SERVER_IP${NC}"
    echo -e "  ${CYAN}Then run: certbot --nginx -d $DOMAIN${NC}"
  fi
}

# ── PHASE 13: Security Headers ──

phase_security_headers() {
  section "🛡️ NGINX SECURITY HEADERS"

  # Check if SSL block exists and add headers
  local NGINX_CONF="/etc/nginx/sites-available/exorcise-ai"
  if grep -q "443" "$NGINX_CONF" 2>/dev/null; then
    # Add security headers to the SSL server block
    sed -i '/proxy_read_timeout 86400;/a\
\
        add_header X-Frame-Options "SAMEORIGIN" always;\
        add_header X-Content-Type-Options "nosniff" always;\
        add_header X-XSS-Protection "1; mode=block" always;\
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;\
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' "$NGINX_CONF" 2>/dev/null || true
  fi

  # Add gzip and client_max_body_size to http context
  if ! grep -q "client_max_body_size" /etc/nginx/nginx.conf 2>/dev/null; then
    sed -i '/http {/a\
    client_max_body_size 10M;\
    gzip on;\
    gzip_vary on;\
    gzip_proxied any;\
    gzip_comp_level 6;\
    gzip_types text/plain text/css application/json application/javascript text/xml;' /etc/nginx/nginx.conf 2>/dev/null || true
  fi

  if nginx -t >> "$LOG_FILE" 2>&1; then
    systemctl reload nginx >> "$LOG_FILE" 2>&1
    ok "Security headers applied"
  else
    warn "Nginx config test failed after adding headers. Skipping reload."
  fi
}

# ── PHASE 14: Install Report ──

phase_report() {
  section "📄 SAVING INSTALL REPORT"

  cat > /root/exorcise-ai-install-report.txt << REPORT_EOF
═══════════════════════════════════════════════════
  👻 EXORCISE AI — Installation Report
  Generated: $(date)
═══════════════════════════════════════════════════

🌐 DEPLOYMENT
   URL:              https://$DOMAIN
   Admin Panel:      https://$DOMAIN/admin
   App Directory:    $APP_DIR
   Log Directory:    /var/log/exorcise-ai/
   Install Log:      $LOG_FILE

🗄️ DATABASE
   Name:             $DB_NAME
   User:             $DB_USER
   Password:         $DB_PASSWORD
   Connection:       postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

🔑 SECRETS (KEEP SAFE — DELETE THIS FILE AFTER SAVING)
   BETTER_AUTH_SECRET:   $BETTER_AUTH_SECRET
   TOTP_ENCRYPTION_KEY:  $TOTP_ENCRYPTION_KEY
   ADMIN_SYNC_SECRET:    $ADMIN_SYNC_SECRET

👤 ADMIN
   Email:            $ADMIN_EMAIL

📋 USEFUL COMMANDS
   pm2 status                          # Check app status
   pm2 logs exorcise-ai                # View logs
   pm2 restart exorcise-ai             # Restart app
   pm2 reload exorcise-ai              # Zero-downtime reload
   systemctl status nginx              # Nginx status
   certbot renew --dry-run             # Test SSL renewal
   sudo -u postgres psql               # Database shell
   cd $APP_DIR && npx prisma studio    # Database GUI

═══════════════════════════════════════════════════
REPORT_EOF

  chmod 600 /root/exorcise-ai-install-report.txt
  ok "Report saved to /root/exorcise-ai-install-report.txt"
}

# ── PHASE 15: Final Banner ──

phase_final_banner() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   👻  ${BOLD}EXORCISE AI — INSTALLATION COMPLETE!${NC}          ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   🌐 Live URL:    ${CYAN}https://$DOMAIN${NC}"
  echo -e "${GREEN}║${NC}   🏛️  Admin:      ${CYAN}https://$DOMAIN/admin${NC}"
  echo -e "${GREEN}║${NC}   📄 Report:      ${CYAN}/root/exorcise-ai-install-report.txt${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   ${YELLOW}⚠ Save your secrets and delete the report file!${NC}   ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}   ${PURPLE}\"Summon the answer. Banish the unknown.\"${NC}           ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                      ${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── MAIN ──

main() {
  phase_preflight
  phase_prompts
  phase_system_update
  phase_nodejs
  phase_postgresql
  phase_nginx
  phase_clone_repo
  phase_generate_env
  phase_build
  phase_seed_admin
  phase_pm2
  phase_firewall
  phase_ssl
  phase_security_headers
  phase_report
  phase_final_banner
}

main "$@"
