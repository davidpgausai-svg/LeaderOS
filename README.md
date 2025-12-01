# StrategicFlow

A comprehensive strategic planning platform for organizational management and execution.

## Features

- **Strategy Management** - Organize strategies, projects, and actions hierarchically
- **Role-Based Access** - Administrator, Co-Lead, View, and SME roles
- **Progress Tracking** - Automatic progress calculation with rollups
- **Change Management** - Built-in Change Continuum Framework
- **Risk Tracking** - Barriers and dependencies visualization
- **Meeting Notes** - Create and export report-out notes as PDF
- **AI Assistant** - Context-aware strategic guidance
- **Templates** - SWOT, PESTLE, Porter's Five Forces, and more

---

## Quick Deploy

Deploy your own StrategicFlow instance in 90 seconds:

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?spec=c3BlYzoKICBuYW1lOiBzdHJhdGVnaWNmbG93CiAgc2VydmljZXM6CiAgICAtIG5hbWU6IGFwaQogICAgICBpbWFnZToKICAgICAgICByZWdpc3RyeV90eXBlOiBET0NLRVJfSFVCCiAgICAgICAgcmVnaXN0cnk6IGRhdmlkcGdhdXNhaS1zdmcKICAgICAgICByZXBvc2l0b3J5OiBzdHJhdGVnaWNmbG93CiAgICAgICAgdGFnOiBsYXRlc3QKICAgICAgaHR0cF9wb3J0OiA1MDAwCiAgICAgIGluc3RhbmNlX2NvdW50OiAxCiAgICAgIGluc3RhbmNlX3NpemVfc2x1ZzogYmFzaWMteHhzCiAgICAgIHJvdXRlczoKICAgICAgICAtIHBhdGg6IC8KICAgICAgZW52czoKICAgICAgICAtIGtleTogSldUX1NFQ1JFVAogICAgICAgICAgc2NvcGU6IFJVTl9USU1FCiAgICAgICAgICB0eXBlOiBTRUNSRVQKICAgICAgICAtIGtleTogSU5JVElBTF9SRUdJU1RSQVRJT05fVE9LRU4KICAgICAgICAgIHNjb3BlOiBSVU5fVElNRQogICAgICAgICAgdHlwZTogU0VDUkVUCiAgICAgICAgLSBrZXk6IE5PREVfRU5WCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiBwcm9kdWN0aW9uCiAgICAgICAgLSBrZXk6IERBVEFfRElSCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiAvZGF0YQogICAgICB2b2x1bWVzOgogICAgICAgIC0gbmFtZTogc3FsaXRlLWRhdGEKICAgICAgICAgIG1vdW50X3BhdGg6IC9kYXRhCiAgICAgICAgICBzaXplX2dpYjogMQo=)

**It's this easy:**
1. Click the button above
2. Set `JWT_SECRET` (any random text)
3. Set `INITIAL_REGISTRATION_TOKEN` (your registration password)
4. Click "Create Resources"
5. Done!

**Then register at:**
```
https://your-app.ondigitalocean.app/register/YOUR_TOKEN
```

The first user becomes Administrator with full control.

---

## Self-Hosting

```bash
docker run -d \
  --name strategicflow \
  -p 5000:5000 \
  -v strategicflow-data:/data \
  -e JWT_SECRET="your-secret" \
  -e INITIAL_REGISTRATION_TOKEN="your-token" \
  davidpgausai-svg/strategicflow:latest
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | SQLite (persistent) |
| Auth | JWT email/password |

---

## Development

```bash
npm install
npm run dev
```

---

## License

Proprietary - All rights reserved.
