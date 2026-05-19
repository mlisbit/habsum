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

The webapp runs on `http://localhost:3000` and proxies `/api/*` to the server on port `3001`.
