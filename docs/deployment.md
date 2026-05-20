# Fly.io Deployment Notes

## Overview

Habsum is deployed as two separate Fly.io applications:

- `habsum-api`
  - Express API
  - SQLite database
  - YAML config storage
  - Persistent Fly volume mounted at `/data`

- `habsum-web`
  - Static Remix SPA served through Nginx
  - Proxies `/api/*` requests to the API service over Fly private networking

Architecture:

```txt
Browser
↓
habsum-web.fly.dev
↓
Nginx
↓
habsum-api.flycast:3001
↓
Express API
↓
SQLite + YAML configs (/data)
```

---

# Deploying

Deploys are done directly from the local working tree using Fly.

This means:

- changes do NOT need to be committed
- Fly builds from the local filesystem
- GitHub Actions are not involved right now

## API deploy

```bash
fly deploy --config fly.api.toml --ha=false
```

## Web deploy

```bash
fly deploy --config fly.web.toml --ha=false
```

---

# Important Things Learned

## Express must bind to `0.0.0.0`

If the server only binds to `localhost`, Fly routing will fail.

Use:

```ts
app.listen(PORT, '0.0.0.0');
```

---

## Fly Volumes

The API uses a persistent Fly volume mounted at:

```txt
/data
```

This stores:

- SQLite DB
- YAML user configs

The volume persists across deploys/restarts.

---

## Internal Service Networking

Local Docker Compose uses:

```txt
http://server:3001
```

Fly production uses private Fly networking:

```txt
http://habsum-api.flycast:3001
```

The web app should never proxy to the public `fly.dev` URL.

---

## Nginx DNS Resolution Gotcha

Nginx tries to resolve upstream hosts at startup.

This caused crashes when using a static upstream hostname.

Fix:

- use an environment variable
- use `proxy_pass $variable`
- configure Fly internal resolver

Without this, the entire web app can fail to boot even if only the API is unavailable.

---

# Useful Commands

## View logs

```bash
fly logs --app habsum-api
fly logs --app habsum-web
```

## SSH into a machine

```bash
fly ssh console --app habsum-api
fly ssh console --app habsum-web
```

## Check status

```bash
fly status --app habsum-api
fly status --app habsum-web
```

## Test API

```bash
curl https://habsum-api.fly.dev/health
```

## Test web app

```bash
curl https://habsum-web.fly.dev
```

## Test web → API proxy

```bash
curl https://habsum-web.fly.dev/api/health
```

---

# Future Improvements

Potential future work:

- GitHub Actions deployments
- Tagged production releases
- CI build verification
- Automatic deploys on push
- Custom domain
- Backups for SQLite volume
- Postgres migration if SQLite limitations appear later
- Separate staging/prod environments
- Fly metrics/monitoring
- S3-compatible object storage for uploads
