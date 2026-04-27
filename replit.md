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

## Run the unified game UI (recommended)

All wheel, roulette, admin, and three quiz boards live in one Vite app:

```bash
pnpm --filter @workspace/game-client dev
```

Legacy split packages (`roulette-game`, `adepts-game`, `adepts-game-2`, `adepts-game-3`) still build for compatibility; prefer `game-client` for new work.

### Dev proxy (important)

In dev, Vite proxies:

- `/socket.io` → `${VITE_DEV_API_TARGET}` (default `http://127.0.0.1:3000`)
- `/api` → `${VITE_DEV_API_TARGET}`

So the browser can keep using same-origin Socket.io URLs like `io("/quiz", { path: "/socket.io" })` while the API runs on another port.

Override the API target if needed:

```bash
VITE_DEV_API_TARGET=http://127.0.0.1:8080 pnpm --filter @workspace/roulette-game dev
```

## One process: API + static UI (optional)

After `pnpm run build`, you can set `WEB_STATIC_ROOT` to the built client’s `dist/public` so the API also serves the JS/CSS (and the root `index.html`). In production, for **direct URL reloads** on routes like `/admin` or `/adepts-game`, use a reverse proxy (e.g. `try_files` to `index.html`) or the Vite dev server; a blind SPA catch-all in Express can interfere with Socket.io on the same port.

```bash
# Linux / macOS — from repo root, after build:
export WEB_STATIC_ROOT="$PWD/artifacts/game-client/dist/public"
pnpm --filter @workspace/api-server start
```

## Build everything (CI-style)

```bash
pnpm run build
```

## What’s in this workspace (high level)

- `artifacts/api-server` — Express + Socket.io backend (`/socket.io`, `/api/...`); optional `WEB_STATIC_ROOT` to serve a built SPA
- `artifacts/game-client` — **unified** React + Vite app (wheel, `/admin`, all adepts phases, quiz boards 1–3)
- `artifacts/roulette-game` / `artifacts/adepts-game*` — legacy standalone clients (kept for compatibility)
- `artifacts/mockup-sandbox` — UI sandbox / mockups
