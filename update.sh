#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# 👻 EXORCISE AI — Update Script v1.0
# Pull latest code, rebuild, and restart with zero downtime
# ═══════════════════════════════════════════════════════════════

APP_DIR="/var/www/exorcise-ai"
LOG="/var/log/exorcise-ai/update.log"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
PURPLE='\033[0;35m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}   👻 ${BOLD}EXORCISE AI — UPDATE${NC}                 ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Run as root or with sudo.${NC}"
  exit 1
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$APP_DIR"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== Update: $TIMESTAMP ===" >> "$LOG"

echo -e "${CYAN}  → Pulling latest code...${NC}"
git pull >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Code updated${NC}"

echo -e "${CYAN}  → Installing dependencies...${NC}"
npm install --production=false >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

echo -e "${CYAN}  → Running database migrations...${NC}"
npx prisma generate >> "$LOG" 2>&1
npx prisma migrate deploy >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Migrations applied${NC}"

echo -e "${CYAN}  → Building application...${NC}"
npm run build >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Build complete${NC}"

echo -e "${CYAN}  → Reloading PM2 (zero-downtime)...${NC}"
pm2 reload exorcise-ai >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ PM2 reloaded${NC}"

echo -e "${CYAN}  → Reloading Nginx...${NC}"
nginx -t >> "$LOG" 2>&1 && systemctl reload nginx >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Nginx reloaded${NC}"

# Health check
sleep 3
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Health check passed${NC}"
else
  echo -e "${YELLOW}  ⚠ Health check failed — check pm2 logs${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}   ✅ ${BOLD}Update complete!${NC}                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}   📅 $TIMESTAMP"
echo -e "${GREEN}║${NC}   📄 Log: $LOG"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
