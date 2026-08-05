FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci
RUN npm --workspace src/apps/webapp run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci --omit=dev --ignore-scripts --workspace @habsum/webapp

COPY --from=build /app/src/apps/webapp/build ./src/apps/webapp/build

EXPOSE 3000

CMD ["npm", "--workspace", "@habsum/webapp", "run", "start"]
