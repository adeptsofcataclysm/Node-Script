# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a multiplayer Russian Roulette game built with React + Vite frontend and an Express + Socket.io backend.

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

### Server (`artifacts/api-server/src/game.ts`)
- Manages game state in memory (single room, 2 players max)
- Socket events emitted by server: `assignedIndex`, `updatePlayers`, `sync`, `startSpin`, `stopSpin`, `shotResult`, `nextTurn`, `rematch`, `opponentLeft`, `roomFull`
- Socket events from client: `setName`, `spin`, `shoot`, `rematch`

### Client (`artifacts/roulette-game/src/`)
- `hooks/useGameSocket.ts` — all socket.io state management
- `components/Cylinder.tsx` — animated 6-chamber cylinder visual
- `components/PlayerCard.tsx` — player name + turn indicator
- `pages/GamePage.tsx` — main game UI (lobby → game → result)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/roulette-game run dev` — run frontend locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
