# StrategicFlow - Campfire-Style Strategic Planning Platform

## Overview

StrategicFlow is a minimal, Campfire-style self-hosted SaaS application for strategic planning and project management. It provides a hierarchical system for managing strategies, projects, and actions with JWT-based authentication. Built with simplicity in mind - no frontend frameworks, just server-rendered HTML pages.

## Architecture

### Technology Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (better-sqlite3) - file-based, no external dependencies
- **Authentication**: JWT tokens (email + password)
- **Frontend**: Server-rendered HTML pages - no React, no SPA

### File Structure
```
/
├── src/
│   ├── server.ts          # Main Express entry point
│   ├── db/
│   │   └── index.ts       # SQLite database + schema initialization
│   ├── auth/
│   │   ├── register.ts    # User registration endpoint
│   │   ├── login.ts       # User login endpoint (returns JWT)
│   │   └── withAuth.ts    # JWT verification middleware
│   ├── api/
│   │   ├── strategies.ts  # Strategies CRUD API
│   │   ├── projects.ts    # Projects CRUD API
│   │   └── actions.ts     # Actions CRUD API
│   └── pages/
│       ├── login.html     # Login page
│       ├── register.html  # Registration page
│       └── dashboard.html # Main dashboard (requires auth)
├── public/
│   └── css/
│       └── style.css      # Application styles
├── data/                  # SQLite database directory (auto-created)
├── .do/
│   └── app.yaml          # DigitalOcean App Platform config
├── Dockerfile            # Docker configuration (Node 18 Alpine)
└── README.md
```

### Database Schema
SQLite database at `/data/StrategicFlow.sqlite` with tables:
- **users**: id, email, password_hash, role, createdAt
- **strategies**: id, name, description, status, createdAt
- **projects**: id, strategy_id, name, status, createdAt
- **actions**: id, project_id, description, status, createdAt
- **audit_logs**: id, user_id, action, detail, createdAt

### Authentication Flow
1. User registers with email/password → password hashed with bcrypt
2. User logs in → receives JWT token (7-day expiry)
3. JWT stored in localStorage on client
4. Authenticated API calls include `Authorization: Bearer <token>` header
5. `withAuth` middleware verifies JWT on protected routes

### API Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and receive JWT
- `GET/POST/PUT/DELETE /api/strategies` - Strategies CRUD
- `GET/POST/PUT/DELETE /api/projects` - Projects CRUD
- `GET/POST/PUT/DELETE /api/actions` - Actions CRUD

## Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret for JWT signing | Yes (production) |
| `PORT` | Server port (default: 5000) | No |
| `DB_PATH` | SQLite file path | No |

## Development

```bash
# Run development server
npx tsx src/server.ts

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

### Docker
```bash
docker build -t strategicflow .
docker run -p 3000:3000 -v data:/data -e JWT_SECRET=secret strategicflow
```

### DigitalOcean App Platform
The `.do/app.yaml` configures:
- Build: `npm install && npm run build`
- Run: `npm start`
- Persistent volume at `/data` for SQLite
- Environment variable: `JWT_SECRET`

## Design Principles
- **Minimal**: Like Once.com's Campfire - small codebase, minimal dependencies
- **Simple**: Server-rendered HTML, no frontend framework
- **Portable**: SQLite database, single container, easy deployment
- **Self-hosted**: One-time purchase model, runs anywhere
