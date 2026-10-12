## Development

### Local (no Docker)

Requirements:

- Node >= 20
- npm

Install:

```bash
npm install
```

This runs `prepare`, which builds custom lint tooling (Stylelint plugins under `src/packages/stylelint`, `eslint-plugin-habsum` under `src/packages/eslint`). If you change `.mts` sources in those packages, rebuild before running lint.

### Lint tooling

**Build** (from repo root):

| Command                           | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run stylelint-plugins:build` | Compile `@habsum/stylelint-plugins` (`src/packages/stylelint/src` → `dist/`) |
| `npm run stylelint-plugins:watch` | Same, in watch mode                                                          |
| `npm run eslint-plugins:build`    | Compile `eslint-plugin-habsum` (`src/packages/eslint` TypeScript → `dist/`)  |
| `npm run eslint-plugins:watch`    | Same, in watch mode                                                          |

You can also build the Stylelint workspace directly: `npm run build --workspace @habsum/stylelint-plugins`.

**Run lint**:

| Command                | What it checks                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `npm run lint`         | Webapp ESLint (TS/TSX + exclusive BEM rule) and Stylelint on styles                         |
| `npm run lint:js`      | Webapp only: runs `eslint .` in `@habsum/webapp` (same config as above)                     |
| `npm run lint:css`     | Stylelint on `src/**/*.{css,scss}` (runs `stylelint-plugins:build` first via `prelint:css`) |
| `npm run lint:css:fix` | Same with `--fix`                                                                           |

Configuration: [`.stylelintrc.json`](../.stylelintrc.json) (repo root), [`src/apps/webapp/eslint.config.mjs`](../src/apps/webapp/eslint.config.mjs).

### Runtime database

The server stores all runtime state in one SQLite database. By default it uses:

- `./config/habsum.db`

Start the development server from the repository root with:

```bash
npm run dev:server
```

To override the SQLite file location, set the `HABSUM_DB` environment variable.
Missing parent directories and the database are created automatically. Relative paths
resolve from the directory where npm was launched.

```bash
HABSUM_DB=./config/custom.db npm run dev:server
```

### Run both apps

```bash
npm run dev
```

The webapp runs on `http://localhost:3000` and proxies `/api/*` to the server on port `3001`.

### Docker development

Build and start the development containers:

```bash
docker compose -f compose.dev.yaml up --build
```

The webapp runs on `http://localhost:3000`; the API is available on port `3001`.
Both apps watch the bind-mounted `src` directory. Dependencies are installed in the
shared `development` target in the root `Dockerfile`. Compose supplies each app's
development command. Workspace dependency directories use container volumes so
Mac-installed dependencies are not loaded inside Linux containers.

After changing package manifests or the lockfile, rebuild and refresh those volumes:

```bash
docker compose -f compose.dev.yaml up --build --renew-anon-volumes
```

Development settings are defined directly in `compose.dev.yaml`. In the server's
`environment` section, `HABSUM_DB` is set to `/app/config/habsum.db`.
`HABSUM_WEBAPP_URL` is set to `http://localhost:3000`. This browser-facing URL is
used for password-reset emails, account invitations, and admin-generated reset links.

To use a different database, change `HABSUM_DB` to another container path under
`/app/config`, such as `/app/config/custom.db`. That directory is mounted from the
host's `./config` directory so the database persists when containers are recreated.

### Admin commands in Docker

The development image includes Bun and the `habsum-admin` command. Run it inside
the server container to use the `HABSUM_DB` value configured in Compose:

```bash
docker compose -f compose.dev.yaml exec server habsum-admin list-users
docker compose -f compose.dev.yaml exec server habsum-admin reset-password alice
```

Compose provides an interactive terminal for the password prompt. After changing
the Dockerfile, rebuild the image and recreate the container before using the command.
