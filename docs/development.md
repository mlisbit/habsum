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

To override the SQLite file location, pass a path to the server script. Missing parent directories
and the database itself are created automatically:

```bash
npm run dev:server -- --db="$(pwd)/data/custom.db"
```

For an isolated temporary database on macOS:

```bash
npm run dev:server -- --db="$(mktemp -d -t habsum)/habsum.db"
```

### Run both apps

```bash
npm run dev
```

To run both apps with a custom database:

```bash
npm run dev -- --db="$(pwd)/data/custom.db"
```

The webapp runs on `http://localhost:3000` and proxies `/api/*` to the server on port `3001`.
