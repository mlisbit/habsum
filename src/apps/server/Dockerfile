FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci

ENV PORT=3001
EXPOSE 3001

WORKDIR /app/src/apps/server

# We use tsx at runtime because workspace packages export TypeScript sources.
CMD ["node", "--import", "tsx", "src/index.ts"]
