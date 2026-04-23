FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci
RUN npm --workspace src/apps/webapp run build

FROM nginx:1.27-alpine

COPY src/apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/src/apps/webapp/build/client /usr/share/nginx/html

EXPOSE 3000
