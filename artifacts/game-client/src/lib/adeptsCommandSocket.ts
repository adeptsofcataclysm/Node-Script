import { io, type Socket } from "socket.io-client";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";

let socket: Socket | null = null;
let lastKey = "";

/** Matches server `socketClaimsAdeptsHostRole` (trim + case-insensitive). */
export function normalizeAdeptsSocketRole(): "host" | "spectator" | "player" {
  const raw =
    (typeof localStorage !== "undefined" ? localStorage.getItem("player_role") : null)?.trim().toLowerCase() ?? "";
  if (raw === "host") return "host";
  if (raw === "spectator") return "spectator";
  return "player";
}

/** Same key used to recycle the `/adepts` socket — bump deps when it changes so listeners follow reconnects. */
export function getAdeptsCommandSocketClientKey(): string {
  const sid = getAdeptsSessionId();
  const role = normalizeAdeptsSocketRole();
  const seatRaw = typeof localStorage !== "undefined" ? localStorage.getItem("player_seat_index") : null;
  const seat = seatRaw != null ? Number(seatRaw) : NaN;
  return `${sid}|${role}|${seat}`;
}

/** Seat sent on the `/adepts` handshake and with each `pickCell` (server reconciles with auth). */
export function readAdeptsPlayerSeatIndexForSocket(): number {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem("player_seat_index") : null;
  const n = raw != null ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 4) return 0;
  return n;
}

export function getAdeptsCommandSocket(): Socket {
  const key = getAdeptsCommandSocketClientKey();
  if (socket && lastKey !== key) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    lastKey = key;
    const role = normalizeAdeptsSocketRole();
    socket = io("/adepts", {
      path: "/socket.io",
      query: { sessionId: getAdeptsSessionId(), adeptsRole: role },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: {
        role,
        seat: readAdeptsPlayerSeatIndexForSocket(),
        spectatorKey:
          typeof localStorage !== "undefined"
            ? localStorage.getItem("player_nick")?.trim().slice(0, 128) || undefined
            : undefined,
      },
    });
  }
  return socket;
}
