#!/bin/bash
set -euo pipefail

REPO_URL=""
DOMAIN=""
APP_DIR="/home/ubuntu/leaderos"
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""
SUPER_ADMIN_EMAILS=""

print_usage() {
  echo "LeaderOS Deployment Setup Script"
  echo ""
  echo "Usage: $0 --repo <github-repo-url> [options]"
  echo ""
  echo "Required:"
  echo "  --repo URL          GitHub repository URL (HTTPS or token URL for private repos)"
  echo ""
  echo "Optional:"
  echo "  --domain DOMAIN     Domain name for HTTPS (e.g., leaderos.example.com)"
  echo "  --dir PATH          Install directory (default: /home/ubuntu/leaderos)"
  echo "  --resend-key KEY    Resend API key for email features"
  echo "  --from-email EMAIL  From email address for outgoing emails"
  echo "  --admin-emails LIST Comma-separated super admin emails"
  echo "  --help              Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --repo https://github.com/user/leaderos.git"
  echo "  $0 --repo https://github.com/user/leaderos.git --domain app.example.com"
  echo "  $0 --repo https://TOKEN@github.com/user/leaderos.git --domain app.example.com --resend-key re_abc123"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo) REPO_URL="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --dir) APP_DIR="$2"; shift 2 ;;
    --resend-key) RESEND_API_KEY="$2"; shift 2 ;;
    --from-email) RESEND_FROM_EMAIL="$2"; shift 2 ;;
    --admin-emails) SUPER_ADMIN_EMAILS="$2"; shift 2 ;;
    --help) print_usage; exit 0 ;;
    *) echo "Unknown option: $1"; print_usage; exit 1 ;;
  esac
done

if [ -z "$REPO_URL" ]; then
  echo "Error: --repo is required"
  echo ""
  print_usage
  exit 1
fi

echo "============================================"
echo "  LeaderOS Deployment Setup"
echo "============================================"
echo ""
echo "Repository: $REPO_URL"
echo "Install to: $APP_DIR"
echo "Domain:     ${DOMAIN:-'(none - HTTP only)'}"
echo ""

echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "[2/7] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null || [[ ! "$(node --version)" == v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
sudo apt install -y build-essential python3 sqlite3
echo "  Node.js $(node --version)"
echo "  npm $(npm --version)"

echo "[3/7] Installing pm2..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi
echo "  pm2 $(pm2 --version)"

echo "[4/7] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "  Directory $APP_DIR already exists, pulling latest..."
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[5/7] Installing dependencies and building..."
npm install
npm run build

echo "[6/7] Configuring environment..."

if [ -n "$DOMAIN" ]; then
  APP_URL_VALUE="https://$DOMAIN"
else
  APP_URL_VALUE="http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost'):5000"
fi

if [ -f "$APP_DIR/.env" ]; then
  echo "  Existing .env found — preserving it (JWT_SECRET and other secrets unchanged)"
  echo "  To regenerate, delete .env and re-run this script"
else
  JWT_SECRET=$(openssl rand -hex 32)

  cat > "$APP_DIR/.env" << ENVFILE
NODE_ENV=production
APP_URL=$APP_URL_VALUE
JWT_SECRET=$JWT_SECRET
DB_PATH=$APP_DIR/data/leaderos.db
PORT=5000
ENVFILE

  if [ -n "$RESEND_API_KEY" ]; then
    echo "RESEND_API_KEY=$RESEND_API_KEY" >> "$APP_DIR/.env"
  fi

  if [ -n "$RESEND_FROM_EMAIL" ]; then
    echo "RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL" >> "$APP_DIR/.env"
  fi

  if [ -n "$SUPER_ADMIN_EMAILS" ]; then
    echo "SUPER_ADMIN_EMAILS=$SUPER_ADMIN_EMAILS" >> "$APP_DIR/.env"
  fi

  chmod 600 "$APP_DIR/.env"
  echo "  .env file created at $APP_DIR/.env"
  echo "  JWT_SECRET generated (saved to .env)"
fi

cat > "$APP_DIR/ecosystem.config.cjs" << 'ECOSYSTEM'
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          env[key] = value;
        }
      }
    }
  }
  return env;
}

module.exports = {
  apps: [{
    name: 'leaderos',
    script: 'dist/index.js',
    env: loadEnvFile(),
    node_args: '--experimental-specifier-resolution=node',
    watch: false,
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
  }]
};
ECOSYSTEM

echo "  pm2 ecosystem config created"

echo "[7/7] Starting application with pm2..."
cd "$APP_DIR"

pm2 delete leaderos 2>/dev/null || true
pm2 start ecosystem.config.cjs

pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "============================================"
echo "  Application started!"
echo "============================================"
echo ""

sleep 3

if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"; then
  echo "  Health check: PASSED (HTTP 200 on port 5000)"
else
  echo "  Health check: App may still be starting. Check with: pm2 logs leaderos"
fi

echo ""

if [ -n "$DOMAIN" ]; then
  echo "Setting up Caddy reverse proxy for $DOMAIN..."

  if ! command -v caddy &> /dev/null; then
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install -y caddy
  fi

  sudo tee /etc/caddy/Caddyfile > /dev/null << CADDYFILE
$DOMAIN {
    reverse_proxy localhost:5000
}
CADDYFILE

  sudo systemctl restart caddy
  echo "  Caddy configured for $DOMAIN with automatic HTTPS"
  echo ""
fi

REG_TOKEN=$(sqlite3 "$APP_DIR/data/leaderos.db" "SELECT registration_token FROM organizations LIMIT 1;" 2>/dev/null || echo "")

echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  App URL:     ${APP_URL_VALUE}"
echo "  App Port:    5000"
echo "  DB Path:     $APP_DIR/data/leaderos.db"
echo "  Logs:        pm2 logs leaderos"
echo ""

if [ -n "$REG_TOKEN" ]; then
  echo "  Registration URL:"
  echo "  ${APP_URL_VALUE}/register/${REG_TOKEN}"
  echo ""
  echo "  Open this URL to create your admin account."
  echo "  The first user to register becomes the Administrator."
else
  echo "  Check pm2 logs for the registration token:"
  echo "  pm2 logs leaderos --lines 50"
  echo "  Or query the database:"
  echo "  sqlite3 $APP_DIR/data/leaderos.db \"SELECT registration_token FROM organizations;\""
fi

echo ""
echo "  Quick commands:"
echo "    pm2 status              - check app status"
echo "    pm2 logs leaderos       - view logs"
echo "    pm2 restart leaderos    - restart app"
echo ""
echo "  To redeploy after code changes:"
echo "    cd $APP_DIR && git pull && npm install && npm run build && pm2 restart leaderos"
echo ""
