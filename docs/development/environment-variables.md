---
title: Environment Variables
description: Environment Variables overview
---

### Server Container

| Name                        | Description                                                                                                                                                                                                                                                                                      | Default              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `HABSUM_INITIAL_WEB_SIGNUP` | When you initially start the application with an empty database, the initial person to visit the application can create an admin account                                                                                                                                                         | `false`              |
| `HABSUM_DB`                 | Path to sqlite db, if it doesnt exist, a new one will be created for you                                                                                                                                                                                                                         | `./config/habsum.db` |
| `HABSUM_ENABLE_DEMO`        | When true, the application is in "demo" mode. Admins will be able to create demo accounts, and provide login credentials to anyone who visits the page. Demo users will be able to interact with the application but in a limited capacity; no changing username/email, no creating habits, etc. | `false`              |
| `HABSUM_DEV_VERSION_OFFSET` | When true, version checks will increase the currently released version to +1, this will show the "update available" link in the footer.                                                                                                                                                          | `false`              |
| `HABSUM_WEBAPP_URL`         | Browser-facing URL for password-reset emails, account invitations, and admin-generated reset links.                                                                                                                                                                                              |                      |
| `HABSUM_DEBUG`              | Set to `TRACE` for in depth logs. Password outputs will be obfuscated                                                                                                                                                                                                                            |                      |
| `HABSUM_LOG_FORMAT`         | Set to `pretty` for formatted JSON of debug logs                                                                                                                                                                                                                                                 |                      |

### Web

| Name                | Description | Default |
| ------------------- | ----------- | ------- |
| `HABSUM_SERVER_URL` | server url  |         |
