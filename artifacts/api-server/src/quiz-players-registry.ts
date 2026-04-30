export type QuizPlayerRow = {
  nick: string;
  role: "host" | "spectator";
  firstSeen: number;
  lastSeen: number;
};

const byNick = new Map<string, QuizPlayerRow>();

/** socket.id → присутствие в квизе (только залогиненные клиенты шлют quizPlayerPresence). */
const presenceBySocket = new Map<string, { nick: string; role: "host" | "spectator" }>();
const socketIdsByNick = new Map<string, Set<string>>();

function normalizeNick(nick: string): string {
  return nick.trim().slice(0, 64);
}

function recordQuizPlayer(nick: string, role: "host" | "spectator"): void {
  const trimmed = normalizeNick(nick);
  if (!trimmed) return;
  const now = Date.now();
  const prev = byNick.get(trimmed);
  if (prev) {
    byNick.set(trimmed, { ...prev, role, lastSeen: now });
  } else {
    byNick.set(trimmed, { nick: trimmed, role, firstSeen: now, lastSeen: now });
  }
}

function reconcileNickRole(nick: string): void {
  const set = socketIdsByNick.get(nick);
  if (!set || set.size === 0) return;
  let role: "host" | "spectator" = "spectator";
  for (const sid of set) {
    const p = presenceBySocket.get(sid);
    if (p?.role === "host") {
      role = "host";
      break;
    }
  }
  recordQuizPlayer(nick, role);
}

/** Регистрация / обновление присутствия с одного сокета (лобби или доска). */
export function bindQuizSocketPresence(
  socketId: string,
  nick: string,
  role: "host" | "spectator"
): void {
  const t = normalizeNick(nick);
  if (!t) return;
  unbindQuizSocketPresence(socketId);
  presenceBySocket.set(socketId, { nick: t, role });
  let set = socketIdsByNick.get(t);
  if (!set) {
    set = new Set();
    socketIdsByNick.set(t, set);
  }
  set.add(socketId);
  recordQuizPlayer(t, role);
}

/** Снять присутствие с сокета (disconnect, пустой payload, выход). */
export function unbindQuizSocketPresence(socketId: string): void {
  const prev = presenceBySocket.get(socketId);
  if (!prev) return;
  presenceBySocket.delete(socketId);
  const set = socketIdsByNick.get(prev.nick);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    socketIdsByNick.delete(prev.nick);
    byNick.delete(prev.nick);
  } else {
    reconcileNickRole(prev.nick);
  }
}

export function listQuizPlayersSorted(): QuizPlayerRow[] {
  return [...byNick.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

/** Запасной фильтр, если сокет «завис» без disconnect, а heartbeat перестал приходить. */
export const QUIZ_PLAYER_PRESENCE_TTL_MS = 30_000;

export function listQuizPlayersOnline(now = Date.now()): QuizPlayerRow[] {
  const cutoff = now - QUIZ_PLAYER_PRESENCE_TTL_MS;
  return [...byNick.values()]
    .filter((p) => p.lastSeen >= cutoff)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export function removeQuizPlayer(nick: string): void {
  const t = normalizeNick(nick);
  if (!t) return;
  const set = socketIdsByNick.get(t);
  if (set) {
    for (const sid of [...set]) {
      presenceBySocket.delete(sid);
    }
    socketIdsByNick.delete(t);
  }
  byNick.delete(t);
}

export function clearQuizPlayers(): void {
  byNick.clear();
  presenceBySocket.clear();
  socketIdsByNick.clear();
}
