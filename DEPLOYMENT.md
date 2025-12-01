# StrategicFlow Deployment Guide

## 1-Click Deployment to DigitalOcean

Deploy StrategicFlow in 90 seconds - no GitHub or technical knowledge required!

### Deploy Now

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?spec=c3BlYzoKICBuYW1lOiBzdHJhdGVnaWNmbG93CiAgc2VydmljZXM6CiAgICAtIG5hbWU6IGFwaQogICAgICBpbWFnZToKICAgICAgICByZWdpc3RyeV90eXBlOiBET0NLRVJfSFVCCiAgICAgICAgcmVnaXN0cnk6IGRhdmlkcGdhdXNhaS1zdmcKICAgICAgICByZXBvc2l0b3J5OiBzdHJhdGVnaWNmbG93CiAgICAgICAgdGFnOiBsYXRlc3QKICAgICAgaHR0cF9wb3J0OiA1MDAwCiAgICAgIGluc3RhbmNlX2NvdW50OiAxCiAgICAgIGluc3RhbmNlX3NpemVfc2x1ZzogYmFzaWMteHhzCiAgICAgIHJvdXRlczoKICAgICAgICAtIHBhdGg6IC8KICAgICAgZW52czoKICAgICAgICAtIGtleTogSldUX1NFQ1JFVAogICAgICAgICAgc2NvcGU6IFJVTl9USU1FCiAgICAgICAgICB0eXBlOiBTRUNSRVQKICAgICAgICAtIGtleTogSU5JVElBTF9SRUdJU1RSQVRJT05fVE9LRU4KICAgICAgICAgIHNjb3BlOiBSVU5fVElNRQogICAgICAgICAgdHlwZTogU0VDUkVUCiAgICAgICAgLSBrZXk6IE5PREVfRU5WCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiBwcm9kdWN0aW9uCiAgICAgICAgLSBrZXk6IERBVEFfRElSCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiAvZGF0YQogICAgICB2b2x1bWVzOgogICAgICAgIC0gbmFtZTogc3FsaXRlLWRhdGEKICAgICAgICAgIG1vdW50X3BhdGg6IC9kYXRhCiAgICAgICAgICBzaXplX2dpYjogMQo=)

### What You Need to Do

1. **Click the Deploy button above**
2. **Log in to DigitalOcean** (or create a free account)
3. **Set your secrets** (DigitalOcean will prompt you):
   - `JWT_SECRET` - Any random text (keeps your app secure)
   - `INITIAL_REGISTRATION_TOKEN` - Your registration link password
4. **Click "Create Resources"**
5. **Wait ~90 seconds** - Your app is live!

### After Deployment

1. **Register your admin account:**
   ```
   https://your-app-name.ondigitalocean.app/register/YOUR_TOKEN
   ```
   Replace `YOUR_TOKEN` with the `INITIAL_REGISTRATION_TOKEN` you set

2. **First user becomes Administrator** - You'll have full control

3. **Share with your team** - They can register at the same URL

---

## For App Maintainers: Publishing Updates

If you're maintaining StrategicFlow, here's how to publish updates to Docker Hub:

### First-Time Setup

1. **Create a Docker Hub account** at https://hub.docker.com

2. **Create a public repository** named `strategicflow`

3. **Log in to Docker Hub:**
   ```bash
   docker login
   ```

4. **Build and push:**
   ```bash
   docker build -t davidpgausai-svg/strategicflow:latest .
   docker push davidpgausai-svg/strategicflow:latest
   ```

### Publishing Updates

When you make changes to StrategicFlow:

```bash
# Build new version
docker build -t davidpgausai-svg/strategicflow:latest .

# Push to Docker Hub
docker push davidpgausai-svg/strategicflow:latest
```

### Regenerating the Deploy Button

If you change the app configuration, regenerate the deploy URL:

1. Edit `.do/deploy.template.yaml` as needed
2. Generate new base64 spec:
   ```bash
   cat .do/deploy.template.yaml | base64 -w 0
   ```
3. Update the deploy button URL in README.md and DEPLOYMENT.md:
   ```
   https://cloud.digitalocean.com/apps/new?spec=YOUR_BASE64_OUTPUT
   ```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for authentication (any random text) |
| `INITIAL_REGISTRATION_TOKEN` | Recommended | Registration URL password |
| `NODE_ENV` | No | Auto-set to `production` |
| `DATA_DIR` | No | Database directory (default: `/data`) |

---

## Alternative: Self-Hosting with Docker

Run StrategicFlow on your own server:

### Using Docker

```bash
docker run -d \
  --name strategicflow \
  -p 5000:5000 \
  -v strategicflow-data:/data \
  -e JWT_SECRET="your-secure-secret-here" \
  -e INITIAL_REGISTRATION_TOKEN="your-registration-token" \
  davidpgausai-svg/strategicflow:latest
```

### Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    image: davidpgausai-svg/strategicflow:latest
    ports:
      - "5000:5000"
    volumes:
      - strategicflow-data:/data
    environment:
      - JWT_SECRET=your-secure-secret-here
      - INITIAL_REGISTRATION_TOKEN=your-registration-token
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  strategicflow-data:
```

Run:
```bash
docker-compose up -d
```

---

## Troubleshooting

### App won't start
- Check that `JWT_SECRET` is set in your environment variables
- Look at the app logs in DigitalOcean dashboard

### Registration link doesn't work
- Make sure the token in the URL matches your `INITIAL_REGISTRATION_TOKEN`
- URL format: `/register/YOUR_TOKEN` (not `/register?token=`)

### Data lost after restart
- Ensure the volume is properly mounted at `/data`
- On DigitalOcean, check that the volume appears in your app's Components

---

## Architecture

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Express.js REST API |
| Database | SQLite (persistent volume) |
| Authentication | JWT with email/password |
| Port | 5000 |

## Security Best Practices

1. Use a strong, random `JWT_SECRET`
2. Rotate the registration token after setup (Settings > Security)
3. HTTPS is automatic on DigitalOcean
4. Back up your data volume regularly
