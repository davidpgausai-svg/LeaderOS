FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src/ ./src/
COPY public/ ./public/

RUN npx tsc

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
