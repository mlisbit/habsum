# Habsum

A self-hosted, highly configurable habit tracking dashboard.

<table align="center">
  <tr>
    <td width="50%">
      <img src="public/readme/app-screenshot.png" alt="App screenshot" width="100%" />
    </td>
    <td width="50%">
      <img src="public/readme/example-config.png" alt="Example config screenshot" width="100%" />
    </td>
  </tr>
</table>

## Features

- **Self hostable**.
- **GUI editor for habits**. Or modify the YAML file directly.
- **Dark & Light modes**. And mobile-web friendly.
- **Multiple user support**.
- **Various types of habit "types", data visualizations & "insights"**. Pick and choose how you want to view/record your habits.

## Quick start with Docker

```yaml
services:
  server:
    image: ghcr.io/mlisbit/habsum/habsum-server:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: '3001'
      HABSUM_DB: /app/config/habsum.db
      HABSUM_INITIAL_WEB_SIGNUP: 'true'
    volumes:
      - habsum-data:/app/config

  web:
    image: ghcr.io/mlisbit/habsum/habsum-webapp:latest
    restart: unless-stopped
    ports:
      - '23123:3000'
    environment:
      NODE_ENV: production
      PORT: '3000'
      HABSUM_SERVER_URL: http://server:3001
    depends_on:
      - server

volumes:
  habsum-data:
```

## Development

`docker compose -f compose.dev.yaml up --build`

More docs available in [`/docs/development.md`](/docs/development.md)
