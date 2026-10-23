---
title: Quick start
description: Install Habsum with Docker Compose and create your first administrator account.
---

This guide walks you through a simple installation using [Docker & Docker Compose](https://docs.docker.com/compose/install/).

### Step 1 — Download the Compose file

Create a directory for your installation and move into it:

```sh
mkdir ./habsum
cd ./habsum
```

Download `compose.yml`:

```sh
wget -O compose.yml https://raw.githubusercontent.com/mlisbit/habsum/main/docker/compose.yml
```

You can also [open the Compose file in your browser](https://raw.githubusercontent.com/mlisbit/habsum/main/docker/compose.yml) and save it as `compose.yml` in the directory you created.

### Step 2 — Populate the env variables

```sh

# Full list of environment variables can be found in /development/environment-variables.md

# Whether or not to allow first time visitors of the page to create an admin.
HABSUM_INITIAL_WEB_SIGNUP=true

# path to db
HABSUM_DB=./config/habsum.db
```

### Step 3 — Start the containers

From the directory containing `compose.yml`, run:

```sh
docker compose up -d
```

Docker downloads the images and starts both containers in the background. The first startup can take a few moments while the downloads finish.

## Try the web app

Open `http://<machine-ip-address>:23123` in your browser, replacing `<machine-ip-address>` with the address of the machine running Docker. If Docker is running on your current machine, open [http://localhost:23123](http://localhost:23123).
