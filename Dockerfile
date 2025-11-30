FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATA_DIR=/data
# INITIAL_REGISTRATION_TOKEN - Set this to a secure token (min 16 chars) for predictable registration URLs
# JWT_SECRET - Required for authentication (set via deployment platform)

EXPOSE 5000

CMD ["npm", "start"]
