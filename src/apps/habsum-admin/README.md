# Habsum Admin

`habsum-admin` is a Bun command-line utility for inspecting a Habsum installation. It opens the
application database in read-only mode.

From the repository root, list every account and its derived product entitlements without using
`bun run`:

```bash
./habsum-admin list-users
```

The root command uses `./config` by default. Set `HABSUM_CONFIG_DIR` to inspect a different Habsum
data directory:

```bash
HABSUM_CONFIG_DIR=/data ./habsum-admin list-users
```

The package also exposes a `habsum-admin` binary. Link it once to use the command without the `./`
prefix:

```bash
cd src/apps/habsum-admin
bun link
```

You can then run it from anywhere with an explicit Habsum data directory:

```bash
HABSUM_CONFIG_DIR=/data habsum-admin list-users
```

## Reset a password

Pass the account username to the `reset-password` command:

```bash
./habsum-admin reset-password alice
```

The command securely prompts for a new password. Entering a password updates the account directly.
Leaving the prompt blank creates and prints a password-reset link that expires after 15 minutes.
`HABSUM_WEBAPP_URL` controls the link's base URL and defaults to `http://localhost:3000`.
