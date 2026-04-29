# Самый душный 3.0

Приложение для развлечения Адептов!

## Local Dev Setup

### Prereqs

- **Node.js**: use a current LTS (recommended: **22.x**)
- **pnpm**: npm install -g pnpm
- Your favourite IDE

### Install

```bash
pnpm install
```

### Run the API

The API listens on **`PORT`**, defaulting to **`3000`** if unset.

```bash
pnpm --filter @workspace/api-server run dev
```

Equivalent:

```bash
pnpm --filter @workspace/api-server run build
PORT=3000 pnpm --filter @workspace/api-server start
```

### Run frontend

Start Vite app:

```bash
pnpm --filter @workspace/game-client dev
```

## What’s in this workspace (high level)

- `artifacts/api-server` — Express + Socket.io backend (`/socket.io`, `/api/...`); optional `WEB_STATIC_ROOT` to serve a built SPA
- `artifacts/game-client` — React + Vite app (wheel, `/admin`, all adepts phases, quiz boards 1–3)
- `artifacts/mockup-sandbox` — UI sandbox / mockups

## Prod setup

Install `nginx` if not yet installed.

```bash
dnf install nginx
```

Create a user account for this app. Optional step, feel free to use existing account.
Generate SSH key for that user. Do not forget to add public key to authorised keys.

```bash
sudo useradd -r -d /var/www/game -s /sbin/nologin adept
```

Add nginx to the same group

```bash
sudo usermod -aG adept nginx
sudo chgrp -R nginx /var/www/game/artifacts/game-client/dist/public
sudo chmod -R g+rX  /var/www/game/artifacts/game-client/dist/public
```

Make sure that deploy user is an owner of deploy directory

```bash
sudo chown -R adept:nginx /var/www/game
```

Configure secrets used in GitHub action.

Required repository secrets:
   `DEPLOY_HOST`       — hostname or IP
   `DEPLOY_USER`       — SSH user
   `DEPLOY_SSH_KEY`    — private key (PEM), full multiline content
   `DEPLOY_PATH`       — absolute path on the server (e.g. /var/www/game)

 Optional:
   `DEPLOY_PORT`       — SSH port (default 22)
   `DEPLOY_COMMAND`    — command to run after rsync (e.g. sudo -n /usr/local/bin/restart-workspace.sh). If unset, only files are synced.

Run it once to rsync files to server. Then on server adjust `./deploy/systemd/*.service` with proper user, etc.
Adjust `./deploy/nginx/nginx-frontend-standalone.conf`

```bash
sudo install -m 755 -o root -g root deploy/restart-workspace.sh /usr/local/bin/restart-workspace.sh
sudo cp deploy/systemd/game-api.service /etc/systemd/system/
sudo cp deploy/systemd/game-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now game-api
sudo systemctl enable --now game-frontend
```

Add `/usr/local/bin/restart-workspace.sh` to sudoers for deploy user. Start services. Enjoy.

```text
adept ALL=(ALL) NOPASSWD: /usr/local/bin/restart-workspace.sh
```
