import { type Server, type Socket } from "socket.io";
import { readSocketSessionId } from "./lib/socket-session-id";
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
  gameStarted: boolean;
  roundCount: number;
  eliminatedIndex: number | null;
  bannedNames: string[];
  scores: Record<number, number>;
}

function createFreshState(): GameState {
  return {
    bulletPos: -1,
    currentPos: 0,
    slots: Array(MAX_PLAYERS).fill(null),
    turn: 0,
    isSpinning: false,
    gameOver: false,
    gameStarted: false,
    roundCount: 0,
    eliminatedIndex: null,
    bannedNames: [],
    scores: {},
  };
}

const states = new Map<string, GameState>();

function getState(sessionId: string): GameState {
  if (!states.has(sessionId)) states.set(sessionId, createFreshState());
  return states.get(sessionId)!;
}

/** Перед открытием «Ящика Пандоры» с квиза: 5 слотов с именами мест 0–4, все офлайн — игроки подхватят по setName. */
export function seedPandoraFromQuiz(
  sessionId: string,
  opts: { playerNames: string[]; initialTurnSeat: number },
): void {
  const gs = getState(sessionId);
  const names = [...opts.playerNames].slice(0, 5);
  while (names.length < 5) names.push("");
  gs.bulletPos = -1;
  gs.currentPos = 0;
  gs.isSpinning = false;
  gs.gameOver = false;
  gs.gameStarted = false;
  gs.roundCount = 0;
  gs.eliminatedIndex = null;
  gs.bannedNames = [];
  gs.scores = {};
  gs.turn = ((Math.floor(opts.initialTurnSeat) % 5) + 5) % 5;
  gs.slots = names.map((raw, i) => {
    const trimmed = String(raw ?? "").trim().slice(0, 20);
    const name = trimmed.length > 0 ? trimmed : `Игрок ${i + 1}`;
    return { socketId: null, name, isOnline: false };
  });
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
  const first = state.slots.findIndex((s) => s !== null);
  return first >= 0 ? first : 0;
}

export function setupGame(io: Server) {
  function adminResetSession(sessionId: string): void {
    const sid = sessionId.trim().slice(0, 128) || "default";
    states.set(sid, createFreshState());
    io.to(sid).emit("adminReset");
    io.in(sid).disconnectSockets(true);
  }

  io.on("connection", (socket: Socket) => {
    const sessionId = readSocketSessionId(socket);
    socket.join(sessionId);

    function doRematch(): void {
      const gameState = getState(sessionId);
      if (!gameState.gameOver) return;

      const elimIdx = gameState.eliminatedIndex;

      if (elimIdx !== null) {
        const elimName = gameState.slots[elimIdx]?.name;
        if (elimName && !gameState.bannedNames.includes(elimName)) {
          gameState.bannedNames.push(elimName);
        }
        gameState.slots[elimIdx] = null;
        gameState.scores[elimIdx] = 0;
      }

      gameState.bulletPos = -1;
      gameState.currentPos = 0;
      gameState.isSpinning = false;
      gameState.gameOver = false;
      gameState.roundCount = 0;
      gameState.eliminatedIndex = null;

      const startFrom = elimIdx !== null ? elimIdx : gameState.turn;
      gameState.turn = nextOnlineTurn(gameState, startFrom);

      io.to(sessionId).emit("rematch", {
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
        turn: gameState.turn,
        count: filledSlotCount(gameState),
        eliminatedIndex: elimIdx,
        scores: gameState.scores,
      });
    }

    if (socket.handshake.query.spectator === "1") {
      logger.info({ socketId: socket.id, sessionId }, "Spectator connected");
      const gameState = getState(sessionId);
      socket.emit("sync", {
        bulletPos: gameState.bulletPos,
        currentPos: gameState.currentPos,
        turn: gameState.turn,
        isSpinning: gameState.isSpinning,
        gameOver: gameState.gameOver,
        gameStarted: gameState.gameStarted,
        playerCount: filledSlotCount(gameState),
        roundCount: gameState.roundCount,
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
        scores: gameState.scores,
      });
      socket.on("rematch", doRematch);
      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id, sessionId }, "Spectator disconnected");
      });
      return;
    }

    logger.info({ socketId: socket.id, sessionId }, "Player connected");

    const gameState = getState(sessionId);
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
      io.to(sessionId).emit("updatePlayers", {
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
        gameStarted: gameState.gameStarted,
        playerCount: filledSlotCount(gameState),
        roundCount: gameState.roundCount,
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
        scores: gameState.scores,
      });
    } else {
      socket.emit("gameInProgress", {
        playerNames: buildPlayerNames(gameState),
        onlineStatus: buildOnlineStatus(gameState),
      });
    }

    socket.on("setName", (name: string) => {
      const gs = getState(sessionId);
      const safeName = String(name).slice(0, 20).trim();
      if (!safeName) return;

      if (gs.bannedNames.includes(safeName)) {
        socket.emit("nameBanned");
        return;
      }

      if (assignedIndex === -1) {
        const matchIdx = gs.slots.findIndex(
          (s) => s !== null && !s.isOnline && s.name === safeName
        );
        if (matchIdx === -1) {
          socket.emit("slotReserved");
          return;
        }
        assignedIndex = matchIdx;
        gs.slots[matchIdx] = { socketId: socket.id, name: safeName, isOnline: true };
        socket.emit("assignedIndex", matchIdx);
        socket.emit("sync", {
          bulletPos: gs.bulletPos,
          currentPos: gs.currentPos,
          turn: gs.turn,
          isSpinning: gs.isSpinning,
          gameOver: gs.gameOver,
          gameStarted: gs.gameStarted,
          playerCount: filledSlotCount(gs),
          roundCount: gs.roundCount,
          playerNames: buildPlayerNames(gs),
          onlineStatus: buildOnlineStatus(gs),
          scores: gs.scores,
        });
        io.to(sessionId).emit("playerOnline", { playerIndex: matchIdx });
        io.to(sessionId).emit("updatePlayers", {
          count: filledSlotCount(gs),
          playerNames: buildPlayerNames(gs),
          onlineStatus: buildOnlineStatus(gs),
        });
        return;
      }

      const offlineMatchIdx = gs.slots.findIndex(
        (s, i) =>
          s !== null &&
          !s.isOnline &&
          s.name === safeName &&
          i !== assignedIndex
      );

      if (offlineMatchIdx !== -1) {
        gs.slots[assignedIndex] = null;
        assignedIndex = offlineMatchIdx;
        gs.slots[offlineMatchIdx] = { socketId: socket.id, name: safeName, isOnline: true };
        socket.emit("assignedIndex", offlineMatchIdx);
        io.to(sessionId).emit("playerOnline", { playerIndex: offlineMatchIdx });
      } else {
        const existing = gs.slots[assignedIndex];
        if (existing) {
          gs.slots[assignedIndex] = { ...existing, name: safeName };
        }
      }

      io.to(sessionId).emit("updatePlayers", {
        count: filledSlotCount(gs),
        playerNames: buildPlayerNames(gs),
        onlineStatus: buildOnlineStatus(gs),
      });
    });

    socket.on("spin", () => {
      const gs = getState(sessionId);
      const slot = gs.slots[gs.turn];
      if (!slot || slot.socketId !== socket.id) return;
      if (gs.isSpinning) return;
      if (gs.gameOver) return;
      if (!gs.gameStarted && !allSlotsReady(gs)) return;

      gs.isSpinning = true;
      gs.gameStarted = true;
      gs.bulletPos = Math.floor(Math.random() * 6);
      gs.currentPos = 0;
      gs.roundCount += 1;

      io.to(sessionId).emit("startSpin");

      setTimeout(() => {
        const g2 = getState(sessionId);
        g2.isSpinning = false;
        io.to(sessionId).emit("stopSpin", { roundCount: g2.roundCount, currentPos: g2.currentPos });
      }, 1700);
    });

    socket.on("shoot", () => {
      const gs = getState(sessionId);
      const slot = gs.slots[gs.turn];
      if (!slot || slot.socketId !== socket.id) return;
      if (gs.isSpinning) return;
      if (gs.bulletPos === -1) return;
      if (gs.gameOver) return;

      const isBang = gs.currentPos === gs.bulletPos;
      const shooterIndex = gs.turn;

      if (isBang) {
        gs.gameOver = true;
        gs.bulletPos = -1;
        gs.eliminatedIndex = shooterIndex;
        io.to(sessionId).emit("shotResult", { isBang: true, playerIndex: shooterIndex, pos: gs.currentPos });
      } else {
        gs.currentPos = (gs.currentPos + 1) % 6;
        gs.turn = nextOnlineTurn(gs, gs.turn);
        gs.scores[shooterIndex] = (gs.scores[shooterIndex] ?? 0) + 1;
        io.to(sessionId).emit("shotResult", { isBang: false, playerIndex: shooterIndex, pos: gs.currentPos });
        io.to(sessionId).emit("nextTurn", { turn: gs.turn });
      }
    });

    socket.on("setFate", (text: string) => {
      const gs = getState(sessionId);
      if (!gs.gameOver) return;
      if (gs.eliminatedIndex === null) return;
      const slot = gs.slots[gs.eliminatedIndex];
      if (!slot || slot.socketId !== socket.id) return;
      const safeText = String(text).slice(0, 300);
      io.to(sessionId).emit("fateAnnounced", { name: slot.name, text: safeText });
    });

    socket.on("rematch", doRematch);

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, sessionId }, "Player disconnected");

      if (assignedIndex === -1) return;

      const gs = getState(sessionId);
      const slot = gs.slots[assignedIndex];
      if (!slot) return;

      if (slot.name) {
        gs.slots[assignedIndex] = { ...slot, socketId: null, isOnline: false };

        if (gs.turn === assignedIndex && !gs.gameOver) {
          const online = onlineIndices(gs);
          if (online.length > 0) {
            gs.turn = nextOnlineTurn(gs, assignedIndex);
            io.to(sessionId).emit("nextTurn", { turn: gs.turn });
          }
        }

        io.to(sessionId).emit("updatePlayers", {
          count: filledSlotCount(gs),
          playerNames: buildPlayerNames(gs),
          onlineStatus: buildOnlineStatus(gs),
        });
        io.to(sessionId).emit("playerOffline", { playerIndex: assignedIndex });
      } else {
        gs.slots[assignedIndex] = null;
        io.to(sessionId).emit("updatePlayers", {
          count: filledSlotCount(gs),
          playerNames: buildPlayerNames(gs),
          onlineStatus: buildOnlineStatus(gs),
        });
      }
    });
  });

  return { adminResetSession };
}
