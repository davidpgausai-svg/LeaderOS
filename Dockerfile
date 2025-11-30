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

EXPOSE 5000

CMD ["npm", "start"]
