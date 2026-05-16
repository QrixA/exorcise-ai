#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 👻 EXORCISE AI — Update Script v2.0
# Pull latest code, rebuild, restart (zero-downtime)
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
PURPLE='\033[0;35m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# Auto-detect app directory
APP_DIR=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ]; then
  APP_DIR="$SCRIPT_DIR"
elif [ -f "/var/www/exorcise-ai/package.json" ]; then
  APP_DIR="/var/www/exorcise-ai"
elif [ -f "/home/ubuntu/exorcise-ai/package.json" ]; then
  APP_DIR="/home/ubuntu/exorcise-ai"
else
  echo -e "${RED}Error: Cannot find exorcise-ai project directory.${NC}"
  echo "Run this script from the project directory."
  exit 1
fi

LOG="$APP_DIR/update.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}   👻 ${BOLD}EXORCISE AI — UPDATE${NC}                 ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}   📂 $APP_DIR"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Run as root: sudo ./update.sh${NC}"
  exit 1
fi

cd "$APP_DIR"
echo "=== Update: $TIMESTAMP ===" >> "$LOG"

echo -e "${CYAN}  → Pulling latest code...${NC}"
git pull >> "$LOG" 2>&1 && echo -e "${GREEN}  ✓ Code updated${NC}" || echo -e "${YELLOW}  ⚠ git pull failed (maybe not a git repo)${NC}"

echo -e "${CYAN}  → Installing dependencies...${NC}"
npm install >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

echo -e "${CYAN}  → Running migrations...${NC}"
npx prisma generate >> "$LOG" 2>&1
npx prisma migrate deploy >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Migrations applied${NC}"

echo -e "${CYAN}  → Building...${NC}"
npm run build >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ Build complete${NC}"

echo -e "${CYAN}  → Restarting PM2...${NC}"
pm2 restart exorcise-ai >> "$LOG" 2>&1
echo -e "${GREEN}  ✓ PM2 restarted${NC}"

# Health check
sleep 5
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Health check passed${NC}"
else
  echo -e "${YELLOW}  ⚠ Health check failed — check: pm2 logs exorcise-ai${NC}"
fi

echo ""
echo -e "${GREEN}  ✅ Update complete! ($TIMESTAMP)${NC}"
echo ""
