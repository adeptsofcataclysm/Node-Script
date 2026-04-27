# Local development (Linux)

This repo is a **pnpm workspace**. You can run everything on a normal Linux machine without Replit.

## Prereqs

- **Node.js**: use a current LTS (recommended: **22.x**)
- **pnpm** (repo `preinstall` blocks `npm`/`yarn` installs at the workspace root)

## Install

```bash
pnpm install
```

## Run the API (Socket.io + Express)

The API listens on **`PORT`**, defaulting to **`3000`** if unset.

```bash
pnpm --filter @workspace/api-server run dev
```

Equivalent:

```bash
pnpm --filter @workspace/api-server run build
PORT=3000 pnpm --filter @workspace/api-server start
```

## Run a Vite frontend

Example (pick the package you want):

```bash
pnpm --filter @workspace/adepts-game-3 dev
```

### Dev proxy (important)

In dev, Vite proxies:

- `/socket.io` → `${VITE_DEV_API_TARGET}` (default `http://127.0.0.1:3000`)
- `/api` → `${VITE_DEV_API_TARGET}`

So the browser can keep using same-origin Socket.io URLs like `io("/quiz", { path: "/socket.io" })` while the API runs on another port.

Override the API target if needed:

```bash
VITE_DEV_API_TARGET=http://127.0.0.1:8080 pnpm --filter @workspace/roulette-game dev
```

## Build everything (CI-style)

```bash
pnpm run build
```

## What’s in this workspace (high level)

- `artifacts/api-server` — Express + Socket.io backend (`/socket.io`, `/api/...`)
- `artifacts/roulette-game` — React + Vite client for the wheel + roulette flows
- `artifacts/adepts-game*` — React + Vite quiz clients
- `artifacts/mockup-sandbox` — UI sandbox / mockups
