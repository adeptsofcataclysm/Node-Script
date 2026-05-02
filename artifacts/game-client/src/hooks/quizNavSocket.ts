import { io, type Socket } from "socket.io-client";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
import { normalizeAdeptsSocketRole } from "@/lib/adeptsCommandSocket";

let quizNavSocket: Socket | null = null;
let lastSessionId = "";

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

export function getQuizNavSocket(): Socket {
  const sessionId = getAdeptsSessionId();
  if (quizNavSocket && lastSessionId !== sessionId) {
    quizNavSocket.disconnect();
    quizNavSocket = null;
  }
  if (!quizNavSocket) {
    lastSessionId = sessionId;
    quizNavSocket = io("/quiz-nav", {
      path: "/socket.io",
      query: { sessionId, adeptsRole: normalizeAdeptsSocketRole() },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    notifyQuizNavSocketReplaced();
  }
  return quizNavSocket;
}
