import { type Server, type Socket } from "socket.io";
import { logger } from "./lib/logger";

const MAX_PLAYERS = 5;

interface SlotInfo {
  socketId: string | null;
  name: string | null;
  isOnline: boolean;
}

interface GameState {
  bulletPos: number;
  currentPos: number;
  slots: (SlotInfo | null)[];
  turn: number;
  isSpinning: boolean;
  gameOver: boolean;
  roundCount: number;
}

function createFreshState(): GameState {
  return {
    bulletPos: -1,
    currentPos: 0,
    slots: Array(MAX_PLAYERS).fill(null),
    turn: 0,
    isSpinning: false,
    gameOver: false,
    roundCount: 0,
  };
}

function filledSlotCount(state: GameState): number {
  return state.slots.filter((s) => s !== null).length;
}

function buildPlayerNames(state: GameState): Record<string, string> {
  const result: Record<string, string> = {};
  state.slots.forEach((slot, i) => {
    if (slot?.name) result[String(i)] = slot.name;
  });
  return result;
}

function buildOnlineStatus(state: GameState): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  state.slots.forEach((slot, i) => {
    if (slot !== null) result[String(i)] = slot.isOnline;
  });
  return result;
}

function allSlotsReady(state: GameState): boolean {
  return state.slots.every((s) => s !== null && s.name !== null);
}

function onlineIndices(state: GameState): number[] {
  return state.slots
    .map((s, i) => (s?.isOnline ? i : -1))
    .filter((i) => i >= 0);
}

function nextOnlineTurn(state: GameState, from: number): number {
  for (let i = 1; i <= MAX_PLAYERS; i++) {
    const idx = (from + i) % MAX_PLAYERS;
    if (state.slots[idx]?.isOnline) return idx;
  }
  return from;
}

export function setupGame(io: Server) {
  let gameState: GameState = createFreshState();

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Player connected");

    const freeIdx = gameState.slots.findIndex((s) => s === null);
    const hasOfflineSlots = gameState.slots.some((s) => s !== null && !s.isOnline);

    // Block only when all 5 slots are online simultaneously
    if (freeIdx === -1 && !hasOfflineSlots) {
      socket.emit("roomFull");
      socket.disconnect(true);
      return;
    }

    // assignedIndex = -1 means "pending" — game in progress, waiting to match offline slot
    let assignedIndex = freeIdx;

    if (freeIdx !== -1) {
      // Normal new slot
      gameState.slots[assignedIndex] = { socketId: socket.id, name: null, isOnline: true };
      socket.emit("assignedIndex", assignedIndex);
      io.emit("updatePlayers", {
        count: filledSlotCount(gameState),
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
      socket.emit("sync", {
        bulletPos: gameState.bulletPos,
        currentPos: gameState.currentPos,
        turn: gameState.turn,
        isSpinning: gameState.isSpinning,
        gameOver: gameState.gameOver,
        playerCount: filledSlotCount(gameState),
        roundCount: gameState.roundCount,
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
    } else {
      // Pending: game running, only reconnect by matching name allowed
      socket.emit("gameInProgress", {
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
    }

    socket.on("setName", (name: string) => {
      const safeName = String(name).slice(0, 20).trim();
      if (!safeName) return;

      if (assignedIndex === -1) {
        // Pending player — must match an offline slot exactly
        const matchIdx = gameState.slots.findIndex(
          (s) => s !== null && !s.isOnline && s.name === safeName
        );
        if (matchIdx === -1) {
          socket.emit("slotReserved");
          return;
        }
        assignedIndex = matchIdx;
        gameState.slots[matchIdx] = { socketId: socket.id, name: safeName, isOnline: true };
        socket.emit("assignedIndex", matchIdx);
        socket.emit("sync", {
          bulletPos: gameState.bulletPos,
          currentPos: gameState.currentPos,
          turn: gameState.turn,
          isSpinning: gameState.isSpinning,
          gameOver: gameState.gameOver,
          playerCount: filledSlotCount(gameState),
          roundCount: gameState.roundCount,
          playerNames: buildPlayerNames(gameState),
          onlineStatus: buildOnlineStatus(gameState),
        });
        io.emit("playerOnline", { playerIndex: matchIdx });
        io.emit("updatePlayers", {
          count: filledSlotCount(gameState),
          playerNames: buildPlayerNames(gameState),
          onlineStatus: buildOnlineStatus(gameState),
        });
        return;
      }

      // Normal new slot — also check if name matches an offline slot
      const offlineMatchIdx = gameState.slots.findIndex(
        (s, i) =>
          s !== null &&
          !s.isOnline &&
          s.name === safeName &&
          i !== assignedIndex
      );

      if (offlineMatchIdx !== -1) {
        gameState.slots[assignedIndex] = null;
        assignedIndex = offlineMatchIdx;
        gameState.slots[offlineMatchIdx] = { socketId: socket.id, name: safeName, isOnline: true };
        socket.emit("assignedIndex", offlineMatchIdx);
        io.emit("playerOnline", { playerIndex: offlineMatchIdx });
      } else {
        const existing = gameState.slots[assignedIndex];
        if (existing) {
          gameState.slots[assignedIndex] = { ...existing, name: safeName };
        }
      }

      io.emit("updatePlayers", {
        count: filledSlotCount(gameState),
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
    });

    socket.on("spin", () => {
      const slot = gameState.slots[gameState.turn];
      if (!slot || slot.socketId !== socket.id) return;
      if (gameState.isSpinning) return;
      if (!allSlotsReady(gameState)) return;
      if (gameState.gameOver) return;

      gameState.isSpinning = true;
      gameState.bulletPos = Math.floor(Math.random() * 6);
      gameState.currentPos = 0;
      gameState.roundCount += 1;

      io.emit("startSpin");

      setTimeout(() => {
        gameState.isSpinning = false;
        io.emit("stopSpin", { roundCount: gameState.roundCount });
      }, 1700);
    });

    socket.on("shoot", () => {
      const slot = gameState.slots[gameState.turn];
      if (!slot || slot.socketId !== socket.id) return;
      if (gameState.isSpinning) return;
      if (gameState.bulletPos === -1) return;
      if (gameState.gameOver) return;

      const isBang = gameState.currentPos === gameState.bulletPos;
      const shooterIndex = gameState.turn;

      if (isBang) {
        gameState.gameOver = true;
        gameState.bulletPos = -1;
        io.emit("shotResult", { isBang: true, playerIndex: shooterIndex, pos: gameState.currentPos });
      } else {
        gameState.currentPos = (gameState.currentPos + 1) % 6;
        gameState.turn = nextOnlineTurn(gameState, gameState.turn);
        io.emit("shotResult", { isBang: false, playerIndex: shooterIndex, pos: gameState.currentPos });
        io.emit("nextTurn", { turn: gameState.turn });
      }
    });

    socket.on("rematch", () => {
      if (!gameState.gameOver) return;
      const savedSlots = gameState.slots.map((s) => (s ? { ...s } : null));
      gameState = createFreshState();
      gameState.slots = savedSlots;
      io.emit("rematch", {
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
        turn: gameState.turn,
      });
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Player disconnected");

      if (assignedIndex === -1) return; // pending player, nothing to clean up

      const slot = gameState.slots[assignedIndex];
      if (!slot) return;

      if (slot.name) {
        // Named player — keep slot as offline
        gameState.slots[assignedIndex] = { ...slot, socketId: null, isOnline: false };

        if (gameState.turn === assignedIndex && !gameState.gameOver) {
          const online = onlineIndices(gameState);
          if (online.length > 0) {
            gameState.turn = nextOnlineTurn(gameState, assignedIndex);
            io.emit("nextTurn", { turn: gameState.turn });
          }
        }

        io.emit("updatePlayers", {
          count: filledSlotCount(gameState),
          playerNames: buildPlayerNames(gameState),
          onlineStatus: buildOnlineStatus(gameState),
        });
        io.emit("playerOffline", { playerIndex: assignedIndex });
      } else {
        // Unnamed player — free the slot
        gameState.slots[assignedIndex] = null;
        io.emit("updatePlayers", {
          count: filledSlotCount(gameState),
          playerNames: buildPlayerNames(gameState),
          onlineStatus: buildOnlineStatus(gameState),
        });
      }
    });
  });
}
