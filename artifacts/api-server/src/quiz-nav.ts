import type { Server, Socket } from "socket.io";
import { readSocketSessionId } from "./lib/socket-session-id";
import { logger } from "./lib/logger";
import {
  bindQuizSocketPresence,
  clearQuizPlayers,
  getQuizSocketLobbyRole,
  listQuizPlayersWithStatusForSession,
  unbindQuizSocketPresence,
} from "./quiz-players-registry";
import { resetQuizRoomForSession } from "./lib/adepts-quiz-room-store";

function queryAdeptsRoleLower(socket: Socket): string {
  const q = socket.handshake.query["adeptsRole"];
  const raw = Array.isArray(q) ? q[0] : q;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/**
 * Ведущий: запись из `quizPlayerPresence` (лобби) **или** тот же `adeptsRole` в query, что на `/adepts`
 * (после обновления страницы на доске реестр может быть пуст).
 */
function isQuizNavLobbyHost(socket: Socket): boolean {
  if (getQuizSocketLobbyRole(socket.id) === "host") return true;
  return queryAdeptsRoleLower(socket) === "host";
}

function canMutateLobbyEmoji(socket: Socket): boolean {
  return isQuizNavLobbyHost(socket);
}

const MAX_BOARD = 2;

/** Должно совпадать с числом строк в `game-client` `lobbyEmojiRevealLines.ts`. */
const LOBBY_EMOJI_REVEAL_MAX = 40;

const CHAT_HISTORY_MAX = 50;
interface ChatEntry {
  id: string;
  nick: string;
  role: "host" | "spectator";
  text: string;
}

interface QuizNavSession {
  gameStarted: boolean;
  lastBoardIndex: number | null;
  seatPlayerNicks: string[];
  lobbyEmojiLineIndex: number;
  chatHistory: ChatEntry[];
  adeptsWheelActive: boolean;
  adeptsWheelReturnHref: string | null;
  adeptsWheelCurrentTurnSeat: number;
}

const navBySession = new Map<string, QuizNavSession>();

function getNav(sessionId: string): QuizNavSession {
  let s = navBySession.get(sessionId);
  if (!s) {
    s = {
      gameStarted: false,
      lastBoardIndex: null,
      seatPlayerNicks: [],
      lobbyEmojiLineIndex: -1,
      chatHistory: [],
      adeptsWheelActive: false,
      adeptsWheelReturnHref: null,
      adeptsWheelCurrentTurnSeat: 0,
    };
    navBySession.set(sessionId, s);
  }
  return s;
}

function lobbyPayload(sessionId: string): {
  gameStarted: boolean;
  boardIndex: number;
  seatPlayerNicks: string[];
  lobbyEmojiLineIndex: number;
} {
  const nav = getNav(sessionId);
  const boardIndex =
    nav.lastBoardIndex !== null && nav.lastBoardIndex >= 0 && nav.lastBoardIndex <= MAX_BOARD
      ? nav.lastBoardIndex
      : 0;
  return {
    gameStarted: nav.gameStarted,
    boardIndex,
    seatPlayerNicks: [...nav.seatPlayerNicks],
    lobbyEmojiLineIndex: nav.lobbyEmojiLineIndex,
  };
}

export function setupQuizNav(io: Server) {
  const ns = io.of("/quiz-nav");

  function emitQuizLobbyRoster(sessionId: string): void {
    const players = listQuizPlayersWithStatusForSession(sessionId);
    /** Всем в namespace: клиент отфильтрует по своему `sessionId` (надёжнее, чем только `to(room)`). */
    ns.emit("quizLobbyRoster", { sessionId, players });
  }

  ns.on("connection", (socket: Socket) => {
    const sessionId = readSocketSessionId(socket);
    socket.join(sessionId);

    logger.info({ socketId: socket.id, sessionId }, "Quiz nav client connected");

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
        emitQuizLobbyRoster(sessionId);
        return;
      }
      const roleRaw = po["role"];
      const roleStr = roleRaw == null ? "spectator" : String(roleRaw);
      const role = roleStr === "host" ? "host" : "spectator";
      bindQuizSocketPresence(socket.id, trimmed, role, sessionId);
      emitQuizLobbyRoster(sessionId);
    });

    socket.emit("lobbyState", lobbyPayload(sessionId));
    const nav = getNav(sessionId);
    if (nav.chatHistory.length > 0) {
      socket.emit("chatHistory", nav.chatHistory);
    }

    if (
      nav.gameStarted &&
      nav.lastBoardIndex !== null &&
      nav.lastBoardIndex >= 0 &&
      nav.lastBoardIndex <= MAX_BOARD
    ) {
      socket.emit("phase", { boardIndex: nav.lastBoardIndex });
    }

    socket.on("startGame", (payload: unknown) => {
      if (!isQuizNavLobbyHost(socket)) {
        logger.warn(
          { sessionId, socketId: socket.id },
          "startGame ignored: socket is not registered as lobby host (quizPlayerPresence)",
        );
        return;
      }
      const n = getNav(sessionId);
      const po = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const raw = po["seatPlayerNicks"];
      n.seatPlayerNicks = Array.isArray(raw)
        ? raw.map((x) => String(x ?? "").trim().slice(0, 64)).filter(Boolean).slice(0, 5)
        : [];

      n.gameStarted = true;
      n.lobbyEmojiLineIndex = -1;
      if (n.lastBoardIndex === null || n.lastBoardIndex < 0 || n.lastBoardIndex > MAX_BOARD) {
        n.lastBoardIndex = 0;
      }
      const out = lobbyPayload(sessionId);
      ns.to(sessionId).emit("lobbyState", out);
      ns.to(sessionId).emit("phase", { boardIndex: out.boardIndex });
      /* Same as lobbyEmojiNext: room broadcast can miss the initiator; host must get lobbyState to redirect. */
      socket.emit("lobbyState", out);
      socket.emit("phase", { boardIndex: out.boardIndex });
      logger.info(
        { sessionId, gameStarted: true, boardIndex: out.boardIndex, seatCount: n.seatPlayerNicks.length },
        "Quiz game started",
      );
    });

    socket.on("hostAdeptsWheelOpen", (payload: unknown) => {
      if (!isQuizNavLobbyHost(socket)) return;
      const n = getNav(sessionId);
      const po = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const hrefRaw = po["returnHref"];
      const returnHref =
        typeof hrefRaw === "string" && hrefRaw.length > 0 && hrefRaw.length < 2048 ? hrefRaw : null;
      const rawSeat = po["currentTurnSeat"];
      const seatNum = typeof rawSeat === "number" ? rawSeat : Number(rawSeat);
      const currentTurnSeat =
        Number.isInteger(seatNum) && seatNum >= 0 && seatNum <= 4 ? seatNum : 0;
      if (!returnHref) return;
      n.adeptsWheelActive = true;
      n.adeptsWheelReturnHref = returnHref;
      n.adeptsWheelCurrentTurnSeat = currentTurnSeat;
      ns.to(sessionId).emit("adeptsWheelOpened", {
        returnHref,
        currentTurnSeat,
      });
      logger.info({ sessionId, returnHref, currentTurnSeat }, "Quiz adepts wheel opened");
    });

    socket.on("hostAdeptsWheelReturn", () => {
      if (!isQuizNavLobbyHost(socket)) return;
      const n = getNav(sessionId);

      // Primary path: wheel was opened in this socket's session.
      let targetSessionId = sessionId;
      let targetNav = n;

      // Fallback: if this session has no active wheel (e.g. the socket reconnected to
      // the wrong room after a page reload), scan all sessions for one that does.
      if (!n.adeptsWheelActive || !n.adeptsWheelReturnHref) {
        for (const [sid, nav] of navBySession.entries()) {
          if (nav.adeptsWheelActive && nav.adeptsWheelReturnHref) {
            targetSessionId = sid;
            targetNav = nav;
            break;
          }
        }
        if (!targetNav.adeptsWheelActive || !targetNav.adeptsWheelReturnHref) return;
      }

      const href = targetNav.adeptsWheelReturnHref;
      targetNav.adeptsWheelActive = false;
      targetNav.adeptsWheelReturnHref = null;
      ns.to(targetSessionId).emit("adeptsWheelReturn", { returnHref: href });
      logger.info({ sessionId, targetSessionId, returnHref: href }, "Quiz adepts wheel return");
    });

    socket.on("requestAdeptsWheelState", () => {
      const n = getNav(sessionId);
      if (n.adeptsWheelActive && n.adeptsWheelReturnHref) {
        socket.emit("adeptsWheelOpened", {
          returnHref: n.adeptsWheelReturnHref,
          currentTurnSeat: n.adeptsWheelCurrentTurnSeat,
        });
      }
    });

    socket.on("hostNavigate", (payload: { boardIndex?: unknown }) => {
      if (!isQuizNavLobbyHost(socket)) return;
      const n = getNav(sessionId);
      if (!n.gameStarted) return;
      const raw = payload?.boardIndex;
      const boardIndex = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > MAX_BOARD) {
        return;
      }
      n.lastBoardIndex = boardIndex;
      socket.to(sessionId).emit("phase", { boardIndex });
      /** Echo: `socket.to` excludes sender; host must receive `phase` for `QuizNavSync` (no client-side `assign` in `GamePhaseNav`). */
      socket.emit("phase", { boardIndex });
    });

    socket.on("requestPhase", () => {
      socket.emit("lobbyState", lobbyPayload(sessionId));
      const n = getNav(sessionId);
      if (!n.gameStarted) return;
      if (n.lastBoardIndex !== null && n.lastBoardIndex >= 0 && n.lastBoardIndex <= MAX_BOARD) {
        socket.emit("phase", { boardIndex: n.lastBoardIndex });
      }
    });

    socket.on("requestQuizLobbyRoster", () => {
      socket.emit("quizLobbyRoster", {
        sessionId,
        players: listQuizPlayersWithStatusForSession(sessionId),
      });
    });

    socket.on("hostReturnToLogin", () => {
      if (!isQuizNavLobbyHost(socket)) return;
      const n = getNav(sessionId);
      n.gameStarted = false;
      n.lastBoardIndex = null;
      n.seatPlayerNicks = [];
      n.lobbyEmojiLineIndex = -1;
      n.adeptsWheelActive = false;
      n.adeptsWheelReturnHref = null;
      resetQuizRoomForSession(sessionId);
      clearQuizPlayers();
      ns.emit("quizLobbyRoster", { allSessions: true, players: [] });
      ns.to(sessionId).emit("returnToLogin", {});
      ns.to(sessionId).emit("lobbyState", lobbyPayload(sessionId));
      logger.info({ sessionId }, "Quiz hostReturnToLogin — broadcast returnToLogin");
    });

    socket.on("lobbyEmojiNext", () => {
      if (!canMutateLobbyEmoji(socket)) return;
      const n = getNav(sessionId);
      if (n.gameStarted) return;
      if (n.lobbyEmojiLineIndex >= LOBBY_EMOJI_REVEAL_MAX - 1) return;
      n.lobbyEmojiLineIndex += 1;
      const out = lobbyPayload(sessionId);
      ns.to(sessionId).emit("lobbyState", out);
      /* Room broadcast alone can miss the initiator (join timing / adapter); always echo to this socket. */
      socket.emit("lobbyState", out);
    });

    socket.on("lobbyEmojiPrev", () => {
      if (!canMutateLobbyEmoji(socket)) return;
      const n = getNav(sessionId);
      if (n.gameStarted) return;
      if (n.lobbyEmojiLineIndex <= -1) return;
      n.lobbyEmojiLineIndex -= 1;
      const out = lobbyPayload(sessionId);
      ns.to(sessionId).emit("lobbyState", out);
      socket.emit("lobbyState", out);
    });

    socket.on("requestChatHistory", () => {
      socket.emit("chatHistory", getNav(sessionId).chatHistory);
    });

    socket.on("chatMessage", (payload: unknown) => {
      const n = getNav(sessionId);
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
      n.chatHistory.push(entry);
      if (n.chatHistory.length > CHAT_HISTORY_MAX) n.chatHistory.shift();
      ns.to(sessionId).emit("chatMessage", entry);
    });

    socket.on("disconnect", () => {
      unbindQuizSocketPresence(socket.id);
      emitQuizLobbyRoster(sessionId);
      logger.info({ socketId: socket.id, sessionId }, "Quiz nav client disconnected");
    });
  });
}
