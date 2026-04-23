## Development

### Local (no Docker)

Requirements:
- Node >= 20
- npm

Install:

```bash
npm install
```

### Runtime data directory

The server stores all runtime state under a single user-controlled directory:

- **SQLite DB**: `<HABSUM_CONFIG_DIR>/habsum.db`
- **User configs**: `<HABSUM_CONFIG_DIR>/users/*.yaml`

Set `HABSUM_CONFIG_DIR` to point at that directory when starting the server.

Example (repo root):

```bash
mkdir -p data/users
cp src/apps/server/src/utils/sample-config.yaml data/users/mac.yaml

HABSUM_CONFIG_DIR="$(pwd)/data" npm run dev:server
```

### Run both apps

```bash
HABSUM_CONFIG_DIR="$(pwd)/data" npm run dev
```

The webapp runs on `http://localhost:3000` and proxies `/api/*` to the server.

