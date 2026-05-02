import { io, type Socket } from "socket.io-client";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
import { normalizeAdeptsSocketRole } from "@/lib/adeptsCommandSocket";

let quizNavSocket: Socket | null = null;
/** Пересоздаём сокет при смене сессии или роли — иначе handshake `adeptsRole` устаревает и сервер не принимает команды ведущего с `/spectate`. */
let lastNavKey = "";

const socketReplaceListeners = new Set<() => void>();

/** When the singleton is recreated (session changed), listeners must re-attach to the new Socket. */
export function subscribeQuizNavSocketReplace(listener: () => void): () => void {
  socketReplaceListeners.add(listener);
  return () => {
    socketReplaceListeners.delete(listener);
  };
}

function notifyQuizNavSocketReplaced(): void {
  for (const fn of socketReplaceListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function emitQuizNavLobbyPresenceOnConnect(): void {
  try {
    const nick = localStorage.getItem("player_nick")?.trim();
    if (!nick) return;
    const lobbyRole =
      localStorage.getItem("player_role")?.trim().toLowerCase() === "host" ? "host" : "spectator";
    quizNavSocket?.emit("quizPlayerPresence", { nick, role: lobbyRole, scope: "lobby" });
  } catch {
    /* ignore */
  }
}

export function getQuizNavSocket(): Socket {
  const sessionId = getAdeptsSessionId();
  const role = normalizeAdeptsSocketRole();
  const navKey = `${sessionId}|${role}`;
  if (quizNavSocket && lastNavKey !== navKey) {
    quizNavSocket.disconnect();
    quizNavSocket = null;
  }
  if (!quizNavSocket) {
    lastNavKey = navKey;
    quizNavSocket = io("/quiz-nav", {
      path: "/socket.io",
      query: { sessionId, adeptsRole: role },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    quizNavSocket.on("connect", emitQuizNavLobbyPresenceOnConnect);
    notifyQuizNavSocketReplaced();
  }
  return quizNavSocket;
}
