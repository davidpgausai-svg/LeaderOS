# Build stage
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATA_DIR=/data
# INITIAL_REGISTRATION_TOKEN - Set to a secure token (min 16 chars) for predictable registration URLs
# JWT_SECRET - Required for authentication (set via deployment platform)

EXPOSE 5000

CMD ["npm", "start"]
