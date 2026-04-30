import type { Server } from "socket.io";
import { logger } from "./lib/logger";
import {
  bindQuizSocketPresence,
  clearQuizPlayers,
  unbindQuizSocketPresence,
} from "./quiz-players-registry";

const MAX_BOARD = 2;

/** После «Запуск игры» — квиз-доски доступны; до этого только лобби */
let gameStarted = false;

/** Текущая квиз-доска (0..2) */
let lastBoardIndex: number | null = null;

function lobbyPayload(): { gameStarted: boolean; boardIndex: number } {
  const boardIndex =
    lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD
      ? lastBoardIndex
      : 0;
  return { gameStarted, boardIndex };
}

export function setupQuizNav(io: Server) {
  const ns = io.of("/quiz-nav");

  ns.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Quiz nav client connected");

    socket.on("quizPlayerPresence", (payload: unknown) => {
      const po = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const scope = po["scope"];
      const rawNick = po["nick"];
      const nick =
        rawNick == null ? "" : typeof rawNick === "string" ? rawNick : String(rawNick);
      const trimmed = nick.trim().slice(0, 64);
      const lobbyOnly = scope === "lobby";
      if (!lobbyOnly || !trimmed) {
        unbindQuizSocketPresence(socket.id);
        return;
      }
      const roleRaw = po["role"];
      const roleStr = roleRaw == null ? "spectator" : String(roleRaw);
      const role = roleStr === "host" ? "host" : "spectator";
      bindQuizSocketPresence(socket.id, trimmed, role);
    });

    socket.emit("lobbyState", lobbyPayload());

    if (gameStarted && lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD) {
      socket.emit("phase", { boardIndex: lastBoardIndex });
    }

    socket.on("startGame", () => {
      gameStarted = true;
      if (lastBoardIndex === null || lastBoardIndex < 0 || lastBoardIndex > MAX_BOARD) {
        lastBoardIndex = 0;
      }
      const payload = lobbyPayload();
      ns.emit("lobbyState", payload);
      ns.emit("phase", { boardIndex: payload.boardIndex });
      logger.info({ gameStarted: true, boardIndex: payload.boardIndex }, "Quiz game started");
    });

    socket.on("hostNavigate", (payload: { boardIndex?: unknown }) => {
      if (!gameStarted) return;
      const raw = payload?.boardIndex;
      const boardIndex = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > MAX_BOARD) {
        return;
      }
      lastBoardIndex = boardIndex;
      socket.broadcast.emit("phase", { boardIndex });
    });

    socket.on("requestPhase", () => {
      socket.emit("lobbyState", lobbyPayload());
      if (!gameStarted) return;
      if (lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD) {
        socket.emit("phase", { boardIndex: lastBoardIndex });
      }
    });

    socket.on("hostReturnToLogin", () => {
      gameStarted = false;
      lastBoardIndex = null;
      clearQuizPlayers();
      ns.emit("returnToLogin", {});
      ns.emit("lobbyState", lobbyPayload());
      logger.info({}, "Quiz hostReturnToLogin — broadcast returnToLogin");
    });

    socket.on("disconnect", () => {
      unbindQuizSocketPresence(socket.id);
      logger.info({ socketId: socket.id }, "Quiz nav client disconnected");
    });
  });
}
