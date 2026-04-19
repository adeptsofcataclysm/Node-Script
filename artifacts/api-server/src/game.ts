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
  eliminatedIndex: number | null;
  bannedNames: string[];
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
    eliminatedIndex: null,
    bannedNames: [],
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
  // Fallback: first non-null slot
  const first = state.slots.findIndex((s) => s !== null);
  return first >= 0 ? first : 0;
}

export function setupGame(io: Server) {
  let gameState: GameState = createFreshState();

  // Shared rematch logic — callable from both player and spectator sockets
  function doRematch() {
    if (!gameState.gameOver) return;

    const elimIdx = gameState.eliminatedIndex;

    if (elimIdx !== null) {
      const elimName = gameState.slots[elimIdx]?.name;
      if (elimName && !gameState.bannedNames.includes(elimName)) {
        gameState.bannedNames.push(elimName);
      }
      gameState.slots[elimIdx] = null;
    }

    gameState.bulletPos = -1;
    gameState.currentPos = 0;
    gameState.isSpinning = false;
    gameState.gameOver = false;
    gameState.roundCount = 0;
    gameState.eliminatedIndex = null;

    const startFrom = elimIdx !== null ? elimIdx : gameState.turn;
    gameState.turn = nextOnlineTurn(gameState, startFrom);

    io.emit("rematch", {
      playerNames: buildPlayerNames(gameState),
      onlineStatus: buildOnlineStatus(gameState),
      turn: gameState.turn,
      count: filledSlotCount(gameState),
      eliminatedIndex: elimIdx,
    });
  }

  io.on("connection", (socket: Socket) => {
    // ── SPECTATOR ────────────────────────────────────────────────────────────
    if (socket.handshake.query.spectator === "1") {
      logger.info({ socketId: socket.id }, "Spectator connected");
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
      socket.on("rematch", doRematch);
      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id }, "Spectator disconnected");
      });
      return; // spectators receive all broadcasts but never interact
    }

    // ── PLAYER ───────────────────────────────────────────────────────────────
    logger.info({ socketId: socket.id }, "Player connected");

    const freeIdx = gameState.slots.findIndex((s) => s === null);
    const hasOfflineSlots = gameState.slots.some((s) => s !== null && !s.isOnline);

    if (freeIdx === -1 && !hasOfflineSlots) {
      socket.emit("roomFull");
      socket.disconnect(true);
      return;
    }

    let assignedIndex = freeIdx;

    if (freeIdx !== -1) {
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
      socket.emit("gameInProgress", {
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
    }

    socket.on("setName", (name: string) => {
      const safeName = String(name).slice(0, 20).trim();
      if (!safeName) return;

      // Block banned names (eliminated players)
      if (gameState.bannedNames.includes(safeName)) {
        socket.emit("nameBanned");
        return;
      }

      if (assignedIndex === -1) {
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
        gameState.eliminatedIndex = shooterIndex;
        io.emit("shotResult", { isBang: true, playerIndex: shooterIndex, pos: gameState.currentPos });
      } else {
        gameState.currentPos = (gameState.currentPos + 1) % 6;
        gameState.turn = nextOnlineTurn(gameState, gameState.turn);
        io.emit("shotResult", { isBang: false, playerIndex: shooterIndex, pos: gameState.currentPos });
        io.emit("nextTurn", { turn: gameState.turn });
      }
    });

    socket.on("setFate", (text: string) => {
      if (!gameState.gameOver) return;
      if (gameState.eliminatedIndex === null) return;
      const slot = gameState.slots[gameState.eliminatedIndex];
      if (!slot || slot.socketId !== socket.id) return;
      const safeText = String(text).slice(0, 300);
      io.emit("fateAnnounced", { name: slot.name, text: safeText });
    });

    socket.on("rematch", doRematch);

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Player disconnected");

      if (assignedIndex === -1) return;

      const slot = gameState.slots[assignedIndex];
      if (!slot) return;

      if (slot.name) {
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
