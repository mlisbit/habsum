# Fly.io Deployment Notes

## Overview

Habsum is deployed as two separate Fly.io applications:

- `habsum-api`
  - Express API
  - SQLite database
  - Persistent Fly volume mounted at `/app/src/apps/server/config`

- `habsum-web`
  - Static React Router SPA served through Nginx
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
SQLite database (`/app/src/apps/server/config/habsum.db`)
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
/app/src/apps/server/config
```

This stores:

- SQLite DB

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

## Bootstrap the first admin (new install)

Run once after deploying to a fresh volume. The script exits without changes if an admin already exists.

Locally:

```bash
npm run init-admin
```

On Fly (interactive SSH):

```bash
fly ssh console --app habsum-api
cd /app/src/apps/server && npm run init-admin
```

This creates the initial admin account with an empty habit config and prints a generated login password.

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
