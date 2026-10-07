## Overview

This document collects notes that used to live in the root `README.md`.

### Configuration and storage

Habit configuration is edited as YAML in the web app and stored alongside user accounts, settings,
and habit data in one SQLite database. The default location is:

- `./config/habsum.db`

Example:

```yaml
habits:
  push ups:
    type: summation
    goal: 100
```

### API

- `GET  /users` → `{ users: string[] }`
- `GET  /users/:user/habits` → `{ user, habits: [{ name, type, details: { goal, total } }] }`
- `PATCH /users/:user/habits` body `{ habit, total, action: "add" | "set" }`

### Webapp flow (high level)

1. Visit `/` – if a user cookie is set, redirects to that user's habits page.
2. Otherwise `/users` shows all users and lets you pick one.
3. The selection is persisted as the `habsum_user` cookie.
4. On `/users/:user/habits`, tap `+` to increment by 1 or edit the number and press Enter/blur to set an absolute value.
