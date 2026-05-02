import type { Socket } from "socket.io";

const MAX_LEN = 128;

/** Unified show id across `/quiz`, `/quiz-nav`, `/wheel`, default namespace (roulette), `/adepts`. */
export function readSocketSessionId(socket: Socket): string {
  const q = socket.handshake.query;
  const raw = q["sessionId"] ?? q["room"];
  const s = Array.isArray(raw) ? raw[0] : raw;
  const t = typeof s === "string" ? s.trim().slice(0, MAX_LEN) : "";
  return t || "default";
}
