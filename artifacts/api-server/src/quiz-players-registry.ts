export type QuizPlayerRow = {
  nick: string;
  role: "host" | "spectator";
  firstSeen: number;
  lastSeen: number;
};

export type QuizPlayerRowWithStatus = QuizPlayerRow & {
  online: boolean;
};

const byNick = new Map<string, QuizPlayerRow>();

/** socket.id → присутствие в квизе (только залогиненные клиенты шлют quizPlayerPresence). */
const presenceBySocket = new Map<string, { nick: string; role: "host" | "spectator"; sessionId: string }>();
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
  role: "host" | "spectator",
  sessionId: string
): void {
  const t = normalizeNick(nick);
  if (!t) return;
  const sid = sessionId.trim().slice(0, 128) || "default";
  unbindQuizSocketPresence(socketId);
  presenceBySocket.set(socketId, { nick: t, role, sessionId: sid });
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

export function listQuizPlayersWithStatus(now = Date.now()): QuizPlayerRowWithStatus[] {
  const cutoff = now - QUIZ_PLAYER_PRESENCE_TTL_MS;
  return [...byNick.values()]
    .map((p) => ({
      ...p,
      online: (socketIdsByNick.get(p.nick)?.size ?? 0) > 0 && p.lastSeen >= cutoff,
    }))
    .sort((a, b) => a.firstSeen - b.firstSeen);
}

function nickHasPresenceInQuizSession(nick: string, sessionId: string): boolean {
  const set = socketIdsByNick.get(nick);
  if (!set || set.size === 0) return false;
  for (const socketId of set) {
    if (presenceBySocket.get(socketId)?.sessionId === sessionId) return true;
  }
  return false;
}

/** Список участников, у которых есть сокет с `quizPlayerPresence` в этой `sessionId` (как `/quiz-nav`). */
export function listQuizPlayersWithStatusForSession(sessionId: string, now = Date.now()): QuizPlayerRowWithStatus[] {
  const sid = sessionId.trim().slice(0, 128) || "default";
  return listQuizPlayersWithStatus(now).filter((p) => nickHasPresenceInQuizSession(p.nick, sid));
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

/** Роль сокета в квиз-лобби (после `quizPlayerPresence` с scope=lobby). */
export function getQuizSocketLobbyRole(socketId: string): "host" | "spectator" | null {
  return presenceBySocket.get(socketId)?.role ?? null;
}
