# Habsum Admin

`habsum-admin` is a Bun command-line utility for inspecting a Habsum installation
creating administrator accounts and resetting account passwords. Listing accounts opens the database read-only;
creating an administrator or resetting a password opens it read-write.

## Docker

The development and server images include Bun and expose `habsum-admin` on PATH.
No repository-root wrapper or manual linking is needed inside the container.

From the repository root:

```bash
docker compose -f compose.dev.yaml exec server habsum-admin list-users
docker compose -f compose.dev.yaml exec server habsum-admin reset-password alice
```

Or with an existing server container's name:

```bash
docker exec <server-container> habsum-admin list-users
docker exec -it <server-container> habsum-admin reset-password alice
```

The CLI inherits `HABSUM_DB` from the server container's environment. In development,
Compose sets it to `/app/config/habsum2.db`, which is the same database the API uses.
The command does not create a missing database; start the API first to initialize it.

Rebuild the image and recreate the container after changing the Dockerfile.

## Local usage

With Bun installed and workspace dependencies installed, run the package binary
from the repository root with an explicit database path:

```bash
HABSUM_DB=./config/habsum.db npm exec -- habsum-admin list-users
HABSUM_DB=./config/habsum.db npm exec -- habsum-admin reset-password alice
```

To expose `habsum-admin` on your Mac's PATH, link the package once:

```bash
cd src/apps/habsum-admin
bun link
```

You can then run it from anywhere:

```bash
HABSUM_DB=/data/habsum.db habsum-admin list-users
```

## Reset a password

The username is optional: `habsum-admin reset-password` prompts for it first.
The `reset-password` command securely prompts for a new password. Entering a
password updates the account directly. Leaving the prompt blank creates and prints
a password-reset link that expires after 15 minutes. `HABSUM_WEBAPP_URL` controls
the link's base URL and defaults to `http://localhost:3000`.

## Add an administrator

```bash
docker compose -f compose.dev.yaml exec server habsum-admin add-admin alice
```

The username is optional: `habsum-admin add-admin` prompts for it first.
The command prompts for a password and creates a new administrator with an empty
habit configuration. Existing usernames and reserved names are rejected; it does
not promote existing accounts. The web signup flag does not restrict this command.
The database must already have been initialized by the server.

## Source layout

`src/cli.ts` dispatches arguments to `src/commands`. Shared helpers live in
`src/utils`, with tests alongside the modules they cover.
