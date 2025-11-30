# StrategicFlow

A comprehensive strategic planning platform for organizational management and execution.

## Features

- **Hierarchical Strategy Management**: Organize strategies, projects, and actions in a clear hierarchy
- **Role-Based Access Control**: Administrator, Co-Lead, View, and SME roles with strategy-based permissions
- **Progress Tracking**: Automatic progress calculation with cascading rollups
- **Change Continuum Framework**: 9 mandatory fields for comprehensive change management
- **Barriers & Dependencies**: Track risks, obstacles, and relationships between items
- **Meeting Notes**: Create and export report-out notes with PDF generation
- **AI Assistant**: Context-aware chat assistant for strategic guidance
- **Templates**: Built-in strategic planning templates (SWOT, PESTLE, Porter's Five Forces, etc.)

## Quick Deploy

Deploy your own instance of StrategicFlow to DigitalOcean with one click:

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/davidpgausai-svg/strategicflow)

> **Setup Instructions:**
> 1. Click the button above
> 2. Set `JWT_SECRET` to a secure random string
> 3. Optionally set `INITIAL_REGISTRATION_TOKEN` for your registration URL
> 4. Click "Create Resources"
> 5. Your app will be live in ~90 seconds!

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Getting Started After Deployment

1. **Register the first user**
   - Go to `https://your-app.ondigitalocean.app/register/YOUR_TOKEN`
   - The first user automatically becomes an Administrator

2. **Create strategies and invite team members**
   - Go to Settings > Security to view/rotate your registration token
   - Share the registration URL with team members

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: SQLite (persistent volume)
- **Authentication**: JWT with email/password

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT authentication |
| `INITIAL_REGISTRATION_TOKEN` | Recommended | Registration token for predictable URLs |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## License

Proprietary - All rights reserved.
