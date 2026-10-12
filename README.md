# Habsum

<p align="center">
  <img src="public/readme/icon.svg" alt="habsum icon" width="96" />
</p>

A self-hosted YAML configurable habit tracking dashboard.

## Features

- **YAML-configured habits**: easily configure a user's habit configuration as YAML in the web app.
- **SQLite persistence**: users, configuration, settings, and habit data share one database.
- **Dashboard UI**: pick a user and update habit totals from the browser.
- **Widgets**: habits can be rendered as either a counter (summation) or a quick-action button.
- **Docker-friendly**: run the server in a container with a bind-mounted data directory.

## Example configuration

<img src="public/readme/sample-metrics.png" alt="Sample metrics" width="300" />

```yaml
habits:
  push ups:
    type: summation
    goal: 100
    data_visualization:
      bargraph:
        period: 1w
    insights:
      - average

  soda consumption:
    type: single_select
    options: [none, light, moderate]

  pull ups:
    type: summation
```

Open `http://localhost:8882`.

## Development database path

Development uses `./config/habsum.db` by default. Set the `HABSUM_DB` environment variable to use a different SQLite file. Habsum creates the parent directory and database when needed.

Initial administrator signup through `/welcome` requires an empty users table and `HABSUM_INITIAL_WEB_SIGNUP=true`. The flag defaults to disabled when unset; `compose.dev.yaml` enables it for development. The API rejects initial web signup when the flag is disabled, and the server logs the effective signup state at startup. When enabled for an empty database, `/auth/status` returns `{ "redirectPath": "/welcome" }`; otherwise it returns `{ "redirectPath": null }`.

For Docker development, configure `HABSUM_DB` directly in the server’s `environment` section in `compose.dev.yaml`, then run:

```bash
docker compose -f compose.dev.yaml up --build
```

Open `http://localhost:3000`. See [development setup](docs/development.md) for details.

Authentication capabilities are returned by `/auth/status` in a `features` object:
`accountSignup` reflects the administrator's User registration setting, and
`forgotPassword` is available only when a complete email provider configuration
is saved. The former `/feature-flags` API has been removed; existing registration
preferences are migrated automatically. Registration settings are managed through
`/administrator/registration-settings` (administrator access required).
