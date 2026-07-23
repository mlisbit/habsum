## Overview

This document collects notes that used to live in the root `README.md`.

### Config

Each user is a YAML file under:

- `${HABSUM_CONFIG_DIR}/users/*.yaml`

Example:

```yaml
# data/users/mac.yaml
habits:
  push ups:
    type: summation
    goal: 100
```

The SQLite DB lives at:

- `${HABSUM_CONFIG_DIR}/habsum.db`

### API

- `GET  /users` → `{ users: string[] }`
- `GET  /users/:user/habits` → `{ user, habits: [{ name, type, details: { goal, total } }] }`
- `PATCH /users/:user/habits` body `{ habit, total, action: "add" | "set" }`

### Webapp flow (high level)

1. Visit `/` – if a user cookie is set, redirects to that user's habits page.
2. Otherwise `/users` shows all YAML files and lets you pick one.
3. The selection is persisted as the `habsum_user` cookie.
4. On `/users/:user/habits`, tap `+` to increment by 1 or edit the number and press Enter/blur to set an absolute value.
