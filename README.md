# StrategyPlan

A comprehensive strategic planning platform for organizational management and execution.

## Features

- **Strategy Management** - Organize strategies, projects, and actions hierarchically
- **Role-Based Access** - Administrator, Co-Lead, View, and SME roles
- **Progress Tracking** - Automatic progress calculation with rollups
- **Change Management** - Built-in Change Continuum Framework
- **Risk Tracking** - Barriers and dependencies visualization
- **Decision Log** - RACI-based governance decision tracking
- **ERP Workstreams** - Workstream × phase matrix with RAG status and gate reviews
- **AI Assistant** - Context-aware strategic guidance
- **Templates** - SWOT, PESTLE, Porter's Five Forces, and more

---

## Deploy Your Own Instance

### What You Need
- A GitHub account (free)
- A Railway account — sign up at https://railway.app (usage-based, typically ~$5/month)
- 5 minutes

### One-Click Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/TEMPLATE_ID_GOES_HERE)

### Manual Deploy
1. Fork this repo
2. Sign up at https://railway.app
3. New Project → Deploy from GitHub Repo → select your fork
4. Railway will auto-detect the Dockerfile and build
5. Go to your service → Settings → add a Volume with mount path `/app/data`
6. Add these environment variables in the Variables tab:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Any random string — generate one at https://generate-secret.vercel.app |
| `RESEND_API_KEY` | Yes | For email (2FA, password resets) — free at https://resend.com |
| `OPENAI_API_KEY` | No | Only needed for AI Change Continuum generation |
| `GOOGLE_AI_API_KEY` | No | Alternative AI provider |

7. Wait for deploy to finish (~2-3 min)
8. Click the generated URL to access your instance
9. Get your registration token: Go to your service → click **Shell** tab → run:
   ```
   sqlite3 /app/data/leaderos.db "SELECT registration_token FROM organizations LIMIT 1;"
   ```
10. Use that token to register your first account (this becomes the Administrator)

### Your Data
Each deployment is a completely separate instance. Your data is private to your Railway project. Railway volumes persist across deploys and restarts.

---

## Self-Hosting with Docker

```bash
docker run -d \
  --name strategyplan \
  -p 5000:5000 \
  -v strategyplan-data:/app/data \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV=production \
  strategyplan
```

Build locally:
```bash
docker build -t strategyplan .
docker run -p 5000:5000 -v strategyplan-data:/app/data -e JWT_SECRET=test-secret -e NODE_ENV=production strategyplan
```

Verify:
- `curl http://localhost:5000/api/health` returns `{"status":"ok",...}`
- The frontend loads at `http://localhost:5000`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | SQLite (persistent) |
| Auth | JWT email/password with 2FA |

---

## Development

```bash
npm install
npm run dev
```

---

## License

Proprietary - All rights reserved.
