# StrategicFlow Deployment Guide

This guide covers deploying StrategicFlow to DigitalOcean App Platform.

## Prerequisites

- A DigitalOcean account
- A GitHub repository with the StrategicFlow code
- A secure JWT secret (generate with: `openssl rand -base64 32`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT authentication (min 32 characters recommended) |
| `INITIAL_REGISTRATION_TOKEN` | Recommended | Initial registration token for automated deployments (min 16 characters). If not set, a random token is generated on first startup. |
| `NODE_ENV` | No | Set to `production` (default in deployment) |
| `DATA_DIR` | No | SQLite database directory (default: `/data`) |

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

#### Using the App Spec File

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create App on DigitalOcean**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Select your GitHub repository
   - DigitalOcean will detect the `.do/app.yaml` file automatically

3. **Configure Secrets**
   - Set `JWT_SECRET` to a secure random string
   - Update `INITIAL_REGISTRATION_TOKEN` to your desired registration token
   - This token will be used in your registration URL: `https://your-app.ondigitalocean.app/register/YOUR_TOKEN`

4. **Deploy**
   - Click "Create Resources"
   - Wait for the build and deployment to complete

#### Manual Configuration

If not using the app spec file:

1. Create a new App from your GitHub repo
2. Select "Dockerfile" as the build method
3. Set the HTTP port to `5000`
4. Add environment variables:
   - `JWT_SECRET` (secret)
   - `INITIAL_REGISTRATION_TOKEN` (encrypted or plain)
   - `NODE_ENV=production`
   - `DATA_DIR=/data`
5. Add a volume:
   - Name: `sqlite-data`
   - Mount Path: `/data`
   - Size: 1 GiB (or larger for production)

### Option 2: Docker (Self-Hosted)

1. **Build the image**
   ```bash
   docker build -t strategicflow .
   ```

2. **Run with Docker**
   ```bash
   docker run -d \
     --name strategicflow \
     -p 5000:5000 \
     -v strategicflow-data:/data \
     -e JWT_SECRET="your-secure-jwt-secret-here" \
     -e INITIAL_REGISTRATION_TOKEN="your-registration-token" \
     strategicflow
   ```

3. **Run with Docker Compose**
   
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "5000:5000"
       volumes:
         - strategicflow-data:/data
       environment:
         - JWT_SECRET=your-secure-jwt-secret-here
         - INITIAL_REGISTRATION_TOKEN=your-registration-token
         - NODE_ENV=production
         - DATA_DIR=/data
       restart: unless-stopped

   volumes:
     strategicflow-data:
   ```

   Then run:
   ```bash
   docker-compose up -d
   ```

## Post-Deployment Setup

### First User Registration

1. **Access the registration page**
   ```
   https://your-domain.com/register/YOUR_REGISTRATION_TOKEN
   ```

2. **Create the first account**
   - The first user automatically becomes an **Administrator**
   - Subsequent users receive the **Co-Lead** role

3. **Rotate the registration token (recommended)**
   - Log in as Administrator
   - Go to Settings > Security
   - Click "Rotate Token" to generate a new registration token
   - Share the new registration URL with additional users

### For Automated Deployments

If you're automating customer deployments:

1. Set a consistent `INITIAL_REGISTRATION_TOKEN` in your deployment template
2. Your automation emails can include:
   - Login URL: `https://customer-app.domain.com/`
   - Registration URL: `https://customer-app.domain.com/register/YOUR_KNOWN_TOKEN`
3. After first login, customers can rotate their token from Settings > Security

## Troubleshooting

### App won't start
- Check that `JWT_SECRET` is set
- Verify the `/data` volume is mounted correctly
- Check logs for SQLite database errors

### Registration link doesn't work
- Verify the token matches `INITIAL_REGISTRATION_TOKEN` or check Settings > Security for the current token
- Ensure the URL format is `/register/TOKEN` (not `/register?token=`)

### Database errors after restart
- Ensure the volume is persistent (not ephemeral)
- On DigitalOcean, verify the volume is attached to the service

## Architecture Summary

- **Frontend**: React + Vite (served from Express)
- **Backend**: Express.js REST API
- **Database**: SQLite (file-based, stored in `/data`)
- **Authentication**: JWT with email/password
- **Port**: 5000

## Security Recommendations

1. Use a strong `JWT_SECRET` (32+ characters)
2. Rotate the registration token after initial setup
3. Use HTTPS in production (handled by DigitalOcean App Platform)
4. Regular backups of the `/data` volume
