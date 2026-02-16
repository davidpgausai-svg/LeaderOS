# LeaderOS Self-Hosted Deployment Guide

Complete deployment instructions for running LeaderOS on a self-hosted Ubuntu/Debian server (e.g., AWS EC2, Lightsail, DigitalOcean droplet). This guide is specific to this codebase — every path, command, and variable is pulled directly from the source.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Build & Start Commands](#build--start-commands)
5. [Database Setup](#database-setup)
6. [External Service Dependencies](#external-service-dependencies)
7. [Step-by-Step Server Setup](#step-by-step-server-setup)
8. [Reverse Proxy & HTTPS](#reverse-proxy--https)
9. [First Run & Registration](#first-run--registration)
10. [Backups](#backups)
11. [Updating](#updating)
12. [Automated Setup Script](#automated-setup-script)
13. [Quick Reference](#quick-reference)
14. [Cost Estimate](#cost-estimate)

---

## Architecture Overview

LeaderOS is a single-process Node.js application:

- **Frontend**: React 18 + Vite (compiled to static assets at build time)
- **Backend**: Express.js REST API serving both the API and the built frontend
- **Database**: SQLite via `better-sqlite3`, stored as a single file at `data/leaderos.db`
- **Port**: The server listens on port **5000** (configurable via `PORT` env var) — see `server/index.ts` line 310

No separate database server, no Redis, no message queue. One process, one file for all data.

---

## Prerequisites

- **Node.js 20.x** (LTS) — required for ES module support and native addon compilation
- **npm** (comes with Node.js)
- **Build tools** — `build-essential` and `python3` on Ubuntu (needed to compile `better-sqlite3` native bindings)
- **pm2** — process manager to keep the app running and auto-restart on crash
- **Caddy** or **nginx** — reverse proxy for HTTPS (Caddy recommended, auto-manages SSL certificates)

---

## Environment Variables

Every `process.env` reference in the codebase, organized by importance.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Set to `production` for production builds. Controls cookie security flags, CSP headers, logging level. | `production` |
| `JWT_SECRET` | Secret key for signing JWT authentication tokens. Must be a long random string. Generate with `openssl rand -hex 32`. | `a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1` |
| `APP_URL` | Full public URL of your deployment. Used in password reset emails, 2FA emails, and all transactional email links. **Must include protocol, no trailing slash.** | `https://leaderos.yourdomain.com` |

### Recommended

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key for Resend email service. Required for password reset emails, 2FA codes, notifications, and scheduled email reminders. Get one at [resend.com](https://resend.com). | `re_abc123def456` |
| `RESEND_FROM_EMAIL` | The "from" address for all outgoing emails. Must be a verified domain in your Resend account. | `noreply@yourdomain.com` |
| `SUPER_ADMIN_EMAILS` | Comma-separated list of email addresses that get Super Admin privileges (cross-organization access). Applied at startup via `server/pgStorage.ts` `setupSuperAdmin()`. | `admin@yourdomain.com,cto@yourdomain.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the Express server listens on. | `5000` |
| `DB_PATH` | Full path to the SQLite database file. The directory is auto-created if it doesn't exist. | `{cwd}/data/leaderos.db` |
| `STRIPE_SECRET_KEY` | Stripe secret API key for billing features. Only needed if you use the built-in billing/subscription system. | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side). Required alongside `STRIPE_SECRET_KEY`. | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint signing secret. Required if using Stripe billing — verifies webhook payloads in `server/webhookHandlers.ts`. | `whsec_...` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible API base URL for AI features (Change Continuum generation). | `https://api.openai.com/v1` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API key for the OpenAI-compatible service. | `sk-...` |
| `SYNCFUSION_LICENSE_KEY` | License key for Syncfusion components (used in reports/exports). App works without it but may show watermarks. | (your license key) |

### Legacy (not used with SQLite)

These exist in the codebase for backward compatibility but are not needed for SQLite deployments:

- `DATABASE_URL` — PostgreSQL connection string, referenced in `drizzle.config.ts` and `scripts/seed-migration-journal.ts`. Not used at runtime with SQLite.

### Replit-Specific (ignore for self-hosted)

These are used only when running on Replit and can be safely ignored for self-hosted deployments:

- `REPLIT_CONNECTORS_HOSTNAME` — Replit connector API for Resend/Stripe credentials
- `REPL_IDENTITY` / `WEB_REPL_RENEWAL` — Replit authentication tokens for connector API
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` — Replit domain detection (fallback for `APP_URL`)
- `REPLIT_DEPLOYMENT` — Replit deployment flag (used in Stripe connector)
- `REPL_ID` — Replit project ID (used for Replit OAuth)
- `SESSION_SECRET` / `ISSUER_URL` — Replit OAuth (not used in JWT auth mode)

---

## Build & Start Commands

From `package.json`:

```bash
# Development (with hot reload)
npm run dev
# Runs: NODE_ENV=development tsx server/index.ts

# Production build (compile TypeScript + bundle frontend)
npm run build
# Runs: vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Production start (run compiled output)
npm run start
# Runs: NODE_ENV=production node dist/index.js

# Type check only
npm run check
# Runs: tsc
```

**Build order for deployment:**
1. `npm install` — install all dependencies (including devDependencies for the build step)
2. `npm run build` — compiles frontend (Vite) and backend (esbuild) into `dist/`
3. `npm run start` — starts the production server from `dist/index.js`

The build output in `dist/` contains everything needed to run. The `public/` directory with compiled frontend assets is served by Express automatically.

---

## Database Setup

### How it works

- **Engine**: SQLite via `better-sqlite3` (native C addon, not pure JS)
- **Location**: Controlled by `DB_PATH` env var, defaults to `data/leaderos.db` relative to the working directory
- **Auto-creation**: Both `server/db.ts` and `server/migrate.ts` auto-create the `data/` directory if it doesn't exist
- **Migrations**: Run automatically on every server start via `runMigrations()` in `server/index.ts` — uses `CREATE TABLE IF NOT EXISTS` for all 33 tables, so it's safe to run repeatedly
- **WAL mode**: Enabled automatically for concurrent read performance (`server/db.ts` line 14)
- **Performance pragmas**: `busy_timeout = 5000`, `synchronous = NORMAL`, `cache_size = -20000` (20MB), `foreign_keys = ON`

### First run

On first start, the server:
1. Creates `data/leaderos.db` (if it doesn't exist)
2. Runs all CREATE TABLE statements (33 tables)
3. Calls `ensureDefaultOrganization()` which creates a "Default Organization" with a random registration token

**The registration token is NOT logged to the console.** To retrieve it, query the database:
```bash
sqlite3 data/leaderos.db "SELECT registration_token FROM organizations;"
```

### No manual migration steps required

Unlike PostgreSQL, there's no separate migration command. Just start the server and the database is ready.

---

## External Service Dependencies

### Resend (Email) — Recommended

**What it's used for**: Password reset emails, 2FA verification codes, notification emails, scheduled email reminders.

**How to set up**:
1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Add and verify your domain in the Resend dashboard
3. Create an API key
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` environment variables

The email service in `server/email.ts` checks for `RESEND_API_KEY` first (direct env var), and falls back to Replit's connector API if not set. For self-hosted deployments, just set the env vars — no code changes needed.

**Without Resend**: The app runs fine, but password resets, 2FA, and email notifications will fail with an error message.

### Stripe (Billing) — Optional

**What it's used for**: Subscription billing, payment processing, usage-based billing.

**How to set up**:
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard → Developers → API keys
3. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
4. Create a webhook endpoint pointing to `https://yourdomain.com/api/stripe/webhook`
5. Set `STRIPE_WEBHOOK_SECRET` from the webhook endpoint configuration

**Without Stripe**: Billing features are disabled. The app checks for Stripe keys at startup (`server/index.ts` line 248) and skips webhook registration if not configured.

### OpenAI (AI Features) — Optional

**What it's used for**: AI-powered Change Continuum field generation in strategies.

**How to set up**:
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`

**Without OpenAI**: AI generation buttons are hidden or fail gracefully. All other features work normally.

---

## Step-by-Step Server Setup

### 1. Launch an EC2 Instance (or equivalent)

- **AMI**: Ubuntu 24.04 LTS
- **Instance type**: `t3.small` (2 vCPU, 2GB RAM) — sufficient for 250+ users. `t3.micro` works for small teams.
- **Storage**: 20 GB gp3
- **Security group ports**:
  - SSH (22) — your IP only
  - HTTP (80) — anywhere
  - HTTPS (443) — anywhere

### 2. SSH In

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP
```

### 3. Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3
sudo npm install -g pm2
```

### 4. Clone the Repository

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/leaderos.git
cd leaderos
npm install
```

For private repos, use a GitHub personal access token:
```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/leaderos.git
```

### 5. Configure Environment

```bash
cat > .env << 'EOF'
NODE_ENV=production
APP_URL=https://yourdomain.com
JWT_SECRET=REPLACE_WITH_OUTPUT_OF_openssl_rand_-hex_32
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
SUPER_ADMIN_EMAILS=your@email.com
DB_PATH=/home/ubuntu/leaderos/data/leaderos.db
EOF
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

**Important**: Make sure `.env` is in your `.gitignore` (it should be already). Never commit secrets.

### 6. Build and Start

```bash
npm run build
```

**Important**: pm2 does not automatically load `.env` files. Use an ecosystem config file to inject env vars into the process:

```bash
# Create ecosystem.config.cjs (the deploy script does this automatically)
# Then start with:
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # run the command it outputs
```

If you prefer not to use the ecosystem config, you can source the `.env` file manually:
```bash
set -a; source .env; set +a
pm2 start dist/index.js --name "leaderos"
pm2 save
pm2 startup
```

### 7. Verify

```bash
pm2 status                    # should show "leaderos" as "online"
pm2 logs leaderos             # check for errors
curl http://localhost:5000    # should return HTML
```

---

## Reverse Proxy & HTTPS

### Using Caddy (recommended — auto-manages SSL)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Configure:
```bash
sudo tee /etc/caddy/Caddyfile << 'EOF'
yourdomain.com {
    reverse_proxy localhost:5000
}
EOF

sudo systemctl restart caddy
```

Replace `yourdomain.com` with your actual domain. Point your domain's DNS A record to the server's public IP. Caddy automatically obtains and renews Let's Encrypt SSL certificates.

**No domain yet?** For testing with just an IP:
```
:80 {
    reverse_proxy localhost:5000
}
```

---

## First Run & Registration

1. After starting the server, retrieve the registration token from the database:
   ```bash
   sqlite3 /home/ubuntu/leaderos/data/leaderos.db "SELECT name, registration_token FROM organizations;"
   ```
   The deploy script outputs this automatically at the end.

2. Navigate to: `https://yourdomain.com/register/YOUR_REGISTRATION_TOKEN`

3. The **first user** to register becomes the **Administrator** for that organization.

4. After registering, if your email is in `SUPER_ADMIN_EMAILS`, you'll also get Super Admin privileges on next server restart.

5. Share the registration URL with team members so they can create their own accounts.

---

## Backups

### Option A: Simple File Copy

SQLite is a single file. Back it up by copying:
```bash
# Manual backup
cp data/leaderos.db data/leaderos-backup-$(date +%Y%m%d-%H%M%S).db

# Cron job for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * cp /home/ubuntu/leaderos/data/leaderos.db /home/ubuntu/leaderos/data/backups/leaderos-\$(date +\%Y\%m\%d).db") | crontab -
mkdir -p data/backups
```

### Option B: EBS Snapshots (AWS)

Use AWS Data Lifecycle Manager to schedule daily snapshots of your instance's EBS volume.

### Option C: Litestream to S3 (Continuous Replication)

```bash
wget https://github.com/benbjohnson/litestream/releases/latest/download/litestream-linux-amd64.deb
sudo dpkg -i litestream-linux-amd64.deb
```

Configure `/etc/litestream.yml`:
```yaml
dbs:
  - path: /home/ubuntu/leaderos/data/leaderos.db
    replicas:
      - url: s3://your-backup-bucket/leaderos
        region: us-east-1
```

Litestream continuously streams WAL changes to S3. Recovery: download, point the app at the backup file, done.

---

## Updating

When you push new code to GitHub:

```bash
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP
cd /home/ubuntu/leaderos
git pull
npm install
npm run build
pm2 restart leaderos
```

### Optional: Auto-Deploy with GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to EC2
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/leaderos
            git pull origin main
            npm install
            npm run build
            pm2 restart leaderos
```

Add GitHub repo secrets (Settings → Secrets):
- `EC2_HOST`: Your instance's public IP
- `EC2_SSH_KEY`: Contents of your `.pem` file

---

## Automated Setup Script

A single script to set up everything on a fresh Ubuntu server:

```bash
# From your local machine, copy the script to the server:
scp -i your-key.pem scripts/deploy-setup.sh ubuntu@YOUR_INSTANCE_IP:~/

# SSH in and run it:
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP
chmod +x deploy-setup.sh
./deploy-setup.sh
```

See [`scripts/deploy-setup.sh`](scripts/deploy-setup.sh) for the full script.

---

## Quick Reference

| Task | Command |
|------|---------|
| Check app status | `pm2 status` |
| View logs | `pm2 logs leaderos` |
| View last 100 log lines | `pm2 logs leaderos --lines 100` |
| Restart app | `pm2 restart leaderos` |
| Stop app | `pm2 stop leaderos` |
| Check Caddy status | `sudo systemctl status caddy` |
| Pull latest code | `cd ~/leaderos && git pull` |
| Full redeploy | `git pull && npm install && npm run build && pm2 restart leaderos` |
| Backup DB | `cp data/leaderos.db data/leaderos-backup-$(date +%Y%m%d).db` |
| View registration token | `sqlite3 data/leaderos.db "SELECT registration_token FROM organizations;"` |
| Check disk space | `df -h` |
| Check memory | `free -m` |

---

## Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| EC2 t3.small (2 vCPU, 2GB) | ~$15 |
| EC2 t3.micro (free tier eligible) | $0 first year, ~$8 after |
| EBS 20GB gp3 | ~$1.60 |
| S3 backups (optional) | < $0.10 |
| Caddy + Let's Encrypt SSL | Free |
| Resend (100 emails/day free) | Free |
| **Total** | **$10–17/month** |

---

## Docker Deployment (Alternative)

A `Dockerfile` is included in the repo. To deploy with Docker:

```bash
docker build -t leaderos .
docker run -d \
  --name leaderos \
  -p 5000:5000 \
  -v leaderos-data:/data \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secret" \
  -e APP_URL="https://yourdomain.com" \
  -e RESEND_API_KEY="re_your_key" \
  -e RESEND_FROM_EMAIL="noreply@yourdomain.com" \
  -e SUPER_ADMIN_EMAILS="your@email.com" \
  -e DB_PATH="/data/leaderos.db" \
  leaderos
```

**Important**: Use a Docker volume (`-v leaderos-data:/data`) so your database survives container restarts.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `better-sqlite3` fails to compile | Install `build-essential` and `python3`: `sudo apt install -y build-essential python3` |
| Port 5000 already in use | Change `PORT` env var or kill the existing process: `lsof -i :5000` |
| Emails not sending | Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in your `.env` file and that pm2 is loading them (check with `pm2 env leaderos`) |
| pm2 not loading env vars | Use the ecosystem config: `pm2 start ecosystem.config.cjs`. Or source manually: `set -a; source .env; set +a; pm2 start dist/index.js --name leaderos` |
| Can't find registration token | Run: `sqlite3 data/leaderos.db "SELECT registration_token FROM organizations;"` |
| Database locked errors | Ensure only one instance of the app is running. WAL mode handles concurrent reads but only one writer at a time. |
| HTTPS not working | Ensure DNS A record points to server IP, ports 80/443 are open, and Caddy is running |
