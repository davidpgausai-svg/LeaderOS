# StrategicFlow Deployment Guide

## For Customers: 1-Click Deployment

Deploy StrategicFlow in 90 seconds!

### Deploy Now

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?spec=c3BlYzoKICBuYW1lOiBzdHJhdGVnaWNmbG93CiAgc2VydmljZXM6CiAgICAtIG5hbWU6IGFwaQogICAgICBpbWFnZToKICAgICAgICByZWdpc3RyeV90eXBlOiBET0NLRVJfSFVCCiAgICAgICAgcmVnaXN0cnk6IGRhdmlkcGdhdXNhaS1zdmcKICAgICAgICByZXBvc2l0b3J5OiBzdHJhdGVnaWNmbG93CiAgICAgICAgdGFnOiBsYXRlc3QKICAgICAgaHR0cF9wb3J0OiA1MDAwCiAgICAgIGluc3RhbmNlX2NvdW50OiAxCiAgICAgIGluc3RhbmNlX3NpemVfc2x1ZzogYmFzaWMteHhzCiAgICAgIHJvdXRlczoKICAgICAgICAtIHBhdGg6IC8KICAgICAgZW52czoKICAgICAgICAtIGtleTogSldUX1NFQ1JFVAogICAgICAgICAgc2NvcGU6IFJVTl9USU1FCiAgICAgICAgICB0eXBlOiBTRUNSRVQKICAgICAgICAtIGtleTogSU5JVElBTF9SRUdJU1RSQVRJT05fVE9LRU4KICAgICAgICAgIHNjb3BlOiBSVU5fVElNRQogICAgICAgICAgdHlwZTogU0VDUkVUCiAgICAgICAgLSBrZXk6IE5PREVfRU5WCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiBwcm9kdWN0aW9uCiAgICAgICAgLSBrZXk6IERBVEFfRElSCiAgICAgICAgICBzY29wZTogUlVOX1RJTUUKICAgICAgICAgIHZhbHVlOiAvZGF0YQogICAgICB2b2x1bWVzOgogICAgICAgIC0gbmFtZTogc3FsaXRlLWRhdGEKICAgICAgICAgIG1vdW50X3BhdGg6IC9kYXRhCiAgICAgICAgICBzaXplX2dpYjogMQo=)

### Steps

1. **Click the Deploy button** - You'll go to DigitalOcean
2. **Choose "Container image"** tab at the top
3. **Fill in the container details:**
   - Registry provider: **Docker Hub**
   - Repository: `davidpgausai-svg/strategicflow`
   - Image tag: `latest`
   - Credentials: Leave blank (it's public)
4. **Click Next**
5. **Set your secrets** when prompted:
   - `JWT_SECRET` - Any random text (keeps your app secure)
   - `INITIAL_REGISTRATION_TOKEN` - Your registration link password
6. **Click "Create Resources"**
7. **Wait ~90 seconds** - Your app is live!

### After Deployment

1. **Register your admin account:**
   ```
   https://your-app-name.ondigitalocean.app/register/YOUR_TOKEN
   ```
   Replace `YOUR_TOKEN` with the `INITIAL_REGISTRATION_TOKEN` you set

2. **First user becomes Administrator** - You have full control

3. **Invite your team** - Share the registration URL with them

---

## For App Publishers: Initial Setup

**Important:** Before the deploy button works, you must push the Docker image to Docker Hub.

### Step 1: Create Docker Hub Account

1. Go to https://hub.docker.com and create a free account
2. Create a new repository named `strategicflow` (set to Public)

### Step 2: Build and Push the Image

Run these commands on your local machine:

```bash
# Clone the repository
git clone https://github.com/davidpgausai-svg/strategicflow.git
cd strategicflow

# Log in to Docker Hub
docker login

# Build the image
docker build -t davidpgausai-svg/strategicflow:latest .

# Push to Docker Hub
docker push davidpgausai-svg/strategicflow:latest
```

### Step 3: Test the Deploy Button

Once the image is on Docker Hub, click the deploy button above. It should:
1. Take you to DigitalOcean
2. Auto-select the container image source
3. Prompt for your secrets
4. Deploy successfully

---

## Publishing Updates

When you make changes to StrategicFlow:

```bash
# Build new version
docker build -t davidpgausai-svg/strategicflow:latest .

# Push to Docker Hub
docker push davidpgausai-svg/strategicflow:latest
```

Customers get updates when they redeploy their app.

---

## If the Deploy Button Shows Options

If DigitalOcean asks you to choose between:
- Git repository
- Container image  
- Templates

**Select "Container image"** - the app spec will auto-fill the rest.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for authentication |
| `INITIAL_REGISTRATION_TOKEN` | Recommended | Registration URL password |
| `NODE_ENV` | No | Auto-set to `production` |
| `DATA_DIR` | No | Database directory (default: `/data`) |

---

## Alternative: Manual Container Image Setup

If the deploy button doesn't work, set up manually:

1. Go to https://cloud.digitalocean.com/apps
2. Click **Create App**
3. Select **Container image**
4. Enter:
   - Registry: `Docker Hub`
   - Image: `davidpgausai-svg/strategicflow`
   - Tag: `latest`
5. Add environment variables:
   - `JWT_SECRET` (mark as secret)
   - `INITIAL_REGISTRATION_TOKEN` (mark as secret)
   - `NODE_ENV` = `production`
   - `DATA_DIR` = `/data`
6. Add a volume:
   - Mount path: `/data`
   - Size: 1 GB
7. Click **Create Resources**

---

## Self-Hosting with Docker

Run on your own server:

```bash
docker run -d \
  --name strategicflow \
  -p 5000:5000 \
  -v strategicflow-data:/data \
  -e JWT_SECRET="your-secure-secret-here" \
  -e INITIAL_REGISTRATION_TOKEN="your-registration-token" \
  davidpgausai-svg/strategicflow:latest
```

### Docker Compose

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

---

## Troubleshooting

### Deploy button shows source options
- Select **"Container image"** - the settings will auto-populate

### "Image not found" error
- The Docker image hasn't been pushed yet
- Run `docker push davidpgausai-svg/strategicflow:latest`

### App won't start
- Check that `JWT_SECRET` is set
- View logs in DigitalOcean dashboard

### Registration link doesn't work
- URL format must be `/register/YOUR_TOKEN`
- Token must match `INITIAL_REGISTRATION_TOKEN`

---

## Regenerating the Deploy Button

If you change `.do/deploy.template.yaml`:

```bash
cat .do/deploy.template.yaml | base64 -w 0
```

Then update the deploy button URLs with the new base64 string.
