FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache sqlite

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && apk add --no-cache python3 make g++ && npm rebuild better-sqlite3 && apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/leaderos.db

CMD ["npm", "start"]
