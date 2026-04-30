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

/** Ник на местах 1–5 на доске (после «Запуск игры», задаёт ведущий). */
let seatPlayerNicks: string[] = [];

function lobbyPayload(): {
  gameStarted: boolean;
  boardIndex: number;
  seatPlayerNicks: string[];
} {
  const boardIndex =
    lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD
      ? lastBoardIndex
      : 0;
  return { gameStarted, boardIndex, seatPlayerNicks: [...seatPlayerNicks] };
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

    socket.on("startGame", (payload: unknown) => {
      const po = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const raw = po["seatPlayerNicks"];
      seatPlayerNicks = Array.isArray(raw)
        ? raw.map((x) => String(x ?? "").trim().slice(0, 64)).filter(Boolean).slice(0, 5)
        : [];

      gameStarted = true;
      if (lastBoardIndex === null || lastBoardIndex < 0 || lastBoardIndex > MAX_BOARD) {
        lastBoardIndex = 0;
      }
      const out = lobbyPayload();
      ns.emit("lobbyState", out);
      ns.emit("phase", { boardIndex: out.boardIndex });
      logger.info(
        { gameStarted: true, boardIndex: out.boardIndex, seatCount: seatPlayerNicks.length },
        "Quiz game started"
      );
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
      seatPlayerNicks = [];
      clearQuizPlayers();
      ns.emit("returnToLogin", {});
      ns.emit("lobbyState", lobbyPayload());
      logger.info({}, "Quiz hostReturnToLogin — broadcast returnToLogin");
    });

    socket.on("chatMessage", (payload: unknown) => {
      const po =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : {};
      const text =
        typeof po["text"] === "string" ? po["text"].trim().slice(0, 500) : "";
      const nick =
        typeof po["nick"] === "string"
          ? po["nick"].trim().slice(0, 64)
          : "Аноним";
      const role = po["role"] === "host" ? "host" : "spectator";
      if (!text) return;
      ns.emit("chatMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nick,
        role,
        text,
      });
    });

    socket.on("disconnect", () => {
      unbindQuizSocketPresence(socket.id);
      logger.info({ socketId: socket.id }, "Quiz nav client disconnected");
    });
  });
}
