# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains two games:
1. **Колесо Адептов** (Fortune Wheel) — the main app at `/` and `/watch`, with live broadcasting via WebSocket
2. **Multiplayer Russian Roulette** — legacy game, accessible at `/game` (host) and `/spectate` (spectator)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Real-time**: Socket.io (server) + socket.io-client (frontend)
- **Database**: PostgreSQL + Drizzle ORM (provisioned, not used for this game)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Framer Motion, shadcn/ui

## Artifacts

- `artifacts/roulette-game` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express + Socket.io backend (preview path: `/api`, `/socket.io`)

## Game Architecture

### Fortune Wheel (Колесо Адептов) — main feature

#### Server (`artifacts/api-server/src/wheel.ts`)
- Socket.io namespace: `/wheel` (path `/socket.io`)
- Host connects without query params; viewers connect with `?viewer=1`
- Server picks random segment on spin, broadcasts rotation + result to all
- Events emitted: `wheelSync`, `wheelSpinStart`, `wheelResult`
- Events from host: `wheelSpin`

#### Client (`artifacts/roulette-game/src/`)
- `pages/HostPage.tsx` — host at `/`, shows mallet, can trigger spin
- `pages/ViewerPage.tsx` — viewer at `/watch`, read-only
- `components/FortuneWheel.tsx` — SVG wheel with 11 colored segments, CSS-transition spin
- `components/Mallet.tsx` — animated 3D mallet trigger
- `components/StarField.tsx` — stable background star field (useMemo)
- `hooks/useWheelSocket.ts` — unified socket hook for both host and viewer

### Russian Roulette — legacy

#### Server (`artifacts/api-server/src/game.ts`)
- Manages game state in memory (single room, 5 players max)
- Socket events: `assignedIndex`, `updatePlayers`, `sync`, `startSpin`, `stopSpin`, `shotResult`, `nextTurn`, `rematch`, `roomFull`, etc.

#### Client routes: `/game` (host), `/spectate` (spectator)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/roulette-game run dev` — run frontend locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
