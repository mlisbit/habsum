---
title: Admin utility
description: Admin utility overview
---

Helpful utility for admins with the following commands:

- `habsum-admin add-admin [username]`
- `habsum-admin list-users`
- `habsum-admin reset-password [username]`
- `habsum-admin demo-data [username]` fills up the given users dashboard with fake data; you need to have the habits config configure tho.

If you choose to run via Docker, it's available to you on the `server` container service. Otherwise you can run it directly via `src/apps/habsum-admin` -- but you'll need to set a `HABSUM_DB` env variable pointing to the database.
