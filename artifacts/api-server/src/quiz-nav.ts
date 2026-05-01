import type { Server } from "socket.io";
import { logger } from "./lib/logger";
import {
  bindQuizSocketPresence,
  clearQuizPlayers,
  getQuizSocketLobbyRole,
  unbindQuizSocketPresence,
} from "./quiz-players-registry";

const MAX_BOARD = 2;

/** Должно совпадать с числом строк в `game-client` `lobbyEmojiRevealLines.ts`. */
const LOBBY_EMOJI_REVEAL_MAX = 40;

/** После «Запуск игры» — квиз-доски доступны; до этого только лобби */
let gameStarted = false;

/** Текущая квиз-доска (0..2) */
let lastBoardIndex: number | null = null;

/** Ник на местах 1–5 на доске (после «Запуск игры», задаёт ведущий). */
let seatPlayerNicks: string[] = [];

/** Индекс текущей строки эмодзи (−1 — поле пустое; 0..n−1 — одна строка из списка, замена при «Дальше»). */
let lobbyEmojiLineIndex = -1;

const CHAT_HISTORY_MAX = 50;
interface ChatEntry { id: string; nick: string; role: "host" | "spectator"; text: string; }
const chatHistory: ChatEntry[] = [];

/** Квиз перешёл на «Колесо адептов» — куда вернуться по кнопке ведущего. */
let adeptsWheelActive = false;
let adeptsWheelReturnHref: string | null = null;
let adeptsWheelCurrentTurnSeat = 0;

function lobbyPayload(): {
  gameStarted: boolean;
  boardIndex: number;
  seatPlayerNicks: string[];
  lobbyEmojiLineIndex: number;
} {
  const boardIndex =
    lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD
      ? lastBoardIndex
      : 0;
  return {
    gameStarted,
    boardIndex,
    seatPlayerNicks: [...seatPlayerNicks],
    lobbyEmojiLineIndex,
  };
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
    if (chatHistory.length > 0) {
      socket.emit("chatHistory", chatHistory);
    }

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
      lobbyEmojiLineIndex = -1;
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

    socket.on("hostAdeptsWheelOpen", (payload: unknown) => {
      const po = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const hrefRaw = po["returnHref"];
      const returnHref =
        typeof hrefRaw === "string" && hrefRaw.length > 0 && hrefRaw.length < 2048 ? hrefRaw : null;
      const rawSeat = po["currentTurnSeat"];
      const seatNum = typeof rawSeat === "number" ? rawSeat : Number(rawSeat);
      const currentTurnSeat =
        Number.isInteger(seatNum) && seatNum >= 0 && seatNum <= 4 ? seatNum : 0;
      if (!returnHref) return;
      adeptsWheelActive = true;
      adeptsWheelReturnHref = returnHref;
      adeptsWheelCurrentTurnSeat = currentTurnSeat;
      ns.emit("adeptsWheelOpened", {
        returnHref,
        currentTurnSeat,
      });
      logger.info({ returnHref, currentTurnSeat }, "Quiz adepts wheel opened");
    });

    socket.on("hostAdeptsWheelReturn", () => {
      if (!adeptsWheelActive || !adeptsWheelReturnHref) return;
      const href = adeptsWheelReturnHref;
      adeptsWheelActive = false;
      adeptsWheelReturnHref = null;
      ns.emit("adeptsWheelReturn", { returnHref: href });
      logger.info({ returnHref: href }, "Quiz adepts wheel return");
    });

    socket.on("requestAdeptsWheelState", () => {
      if (adeptsWheelActive && adeptsWheelReturnHref) {
        socket.emit("adeptsWheelOpened", {
          returnHref: adeptsWheelReturnHref,
          currentTurnSeat: adeptsWheelCurrentTurnSeat,
        });
      }
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
      lobbyEmojiLineIndex = -1;
      adeptsWheelActive = false;
      adeptsWheelReturnHref = null;
      clearQuizPlayers();
      ns.emit("returnToLogin", {});
      ns.emit("lobbyState", lobbyPayload());
      logger.info({}, "Quiz hostReturnToLogin — broadcast returnToLogin");
    });

    socket.on("lobbyEmojiNext", () => {
      if (gameStarted) return;
      if (getQuizSocketLobbyRole(socket.id) !== "host") return;
      if (lobbyEmojiLineIndex >= LOBBY_EMOJI_REVEAL_MAX - 1) return;
      lobbyEmojiLineIndex += 1;
      ns.emit("lobbyState", lobbyPayload());
    });

    socket.on("lobbyEmojiPrev", () => {
      if (gameStarted) return;
      if (getQuizSocketLobbyRole(socket.id) !== "host") return;
      if (lobbyEmojiLineIndex <= -1) return;
      lobbyEmojiLineIndex -= 1;
      ns.emit("lobbyState", lobbyPayload());
    });

    socket.on("requestChatHistory", () => {
      socket.emit("chatHistory", chatHistory);
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
      const entry: ChatEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nick,
        role,
        text,
      };
      chatHistory.push(entry);
      if (chatHistory.length > CHAT_HISTORY_MAX) chatHistory.shift();
      ns.emit("chatMessage", entry);
    });

    socket.on("disconnect", () => {
      unbindQuizSocketPresence(socket.id);
      logger.info({ socketId: socket.id }, "Quiz nav client disconnected");
    });
  });
}
