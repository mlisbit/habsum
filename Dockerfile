FROM oven/bun:1 AS bun-runtime

FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci

COPY scripts/generate-third-party-notices.mjs ./scripts/

# Include the full install: the server ships it, and the webapp bundles workspace dependencies.
RUN npm run licenses:generate

# The admin CLI uses Bun's SQLite API and the container's HABSUM_DB setting.
FROM dependencies AS admin-tools

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

RUN ln -s /app/node_modules/.bin/habsum-admin /usr/local/bin/habsum-admin \
    && habsum-admin --help

# Shared environment for the development containers.
FROM admin-tools AS development

ENV NODE_ENV=development

# Compose supplies the startup command for each app.

# Standalone API image for publishing.
FROM admin-tools AS server

ENV PORT=3001
EXPOSE 3001

WORKDIR /app/src/apps/server

# Workspace packages export TypeScript sources.
CMD ["node", "--import", "tsx", "src/index.ts"]

FROM dependencies AS webapp-build

RUN npm --workspace src/apps/webapp run build

# Static homepage image for production hosting.
FROM dependencies AS homepage-build

COPY public/homepage ./public/homepage
COPY docs ./docs

RUN npm run build:homepage

FROM nginx:alpine AS homepage

COPY --from=homepage-build /app/src/apps/homepage/dist /usr/share/nginx/html
COPY --from=dependencies /app/THIRD_PARTY_NOTICES.md /app/THIRD_PARTY_NOTICES.md

EXPOSE 80

# Standalone webapp image for publishing.
FROM node:20-bookworm-slim AS webapp

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci --omit=dev --ignore-scripts --workspace @habsum/webapp

COPY --from=webapp-build /app/src/apps/webapp/build ./src/apps/webapp/build
COPY --from=dependencies /app/THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md

EXPOSE 3000

CMD ["npm", "--workspace", "src/apps/webapp", "run", "start"]
