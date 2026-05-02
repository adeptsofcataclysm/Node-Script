import type { QuizLobbyStatePayload } from "@/hooks/useQuizLobbyState";
import type { Player } from "@/lib/adepts-quiz-types";

/** Ростер имён на местах 1–5 — подставляется ведущим при старте; читается на доске. */
export const SEAT_ROSTER_SESSION_KEY = "adepts-quiz-seat-player-nicks";

/** Служебное событие: обновились роль и место из `lobbyState` (локальный ключ «игрок/зритель»). */
export const ADEPTS_QUIZ_ASSIGNMENTS_EVENT = "adepts-quiz-assignments";

function notifyAssignmentsChanged(): void {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(ADEPTS_QUIZ_ASSIGNMENTS_EVENT));
  } catch {
    /* ignore */
  }
}

function rosterNickKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Индекс места за столом 0–4 или −1 — совпадение ника без учёта регистра. */
export function findSeatIndexForNick(rosterNicks: string[], playerNick: string): number {
  const key = rosterNickKey(playerNick);
  if (!key) return -1;
  return rosterNicks.findIndex((r) => rosterNickKey(r) === key);
}

function normalizeNickList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? "").trim().slice(0, 64)).filter(Boolean).slice(0, 5);
}

/**
 * Если в sessionStorage лежит ростер после «Запуск игры»: читаем массив (до 5 слотов),
 * ключ удаляем один раз — дальнейшие синки только с сервера (ручная смена имён сохраняется).
 */
function consumeSeatRosterNickRow(): string[] | null {
  try {
    const raw = sessionStorage.getItem(SEAT_ROSTER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const row = parsed.map((x) => String(x ?? "").trim().slice(0, 64));
    if (!row.some((s) => s.length > 0)) return null;
    sessionStorage.removeItem(SEAT_ROSTER_SESSION_KEY);
    return row.slice(0, 5);
  } catch {
    return null;
  }
}

/** Накладывает ники из лобби поверх строки игроков (индекс 0 = место 1 за столом). */
export function mergeSeatRosterIntoQuizPlayers(players: Player[]): {
  merged: Player[];
  hadRoster: boolean;
} {
  const rosterRow = consumeSeatRosterNickRow();
  if (!rosterRow) return { merged: players, hadRoster: false };

  const out = players.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    const slot = out[i];
    if (!slot) continue;
    const nick = rosterRow[i] ?? "";
    const name = nick.length > 0 ? nick : `Игрок ${i + 1}`;
    out[i] = { ...slot, name };
  }
  return { merged: out, hadRoster: true };
}

/**
 * После события `lobbyState` с сервера: роли в localStorage и ростер в sessionStorage
 * для подстановки имён игроков на досках.
 */
export function syncQuizLobbyClientAssignments(payload: QuizLobbyStatePayload): void {
  if (!payload.gameStarted) {
    try {
      sessionStorage.removeItem(SEAT_ROSTER_SESSION_KEY);
    } catch {
      /* ignore */
    }
    notifyAssignmentsChanged();
    return;
  }

  const nicks = normalizeNickList(payload.seatPlayerNicks);
  try {
    sessionStorage.setItem(SEAT_ROSTER_SESSION_KEY, JSON.stringify(nicks));
  } catch {
    /* ignore */
  }

  const isHost = localStorage.getItem("player_role")?.trim().toLowerCase() === "host";
  if (isHost) {
    notifyAssignmentsChanged();
    return;
  }

  const nick = localStorage.getItem("player_nick")?.trim();
  if (!nick) {
    notifyAssignmentsChanged();
    return;
  }

  const idx = findSeatIndexForNick(nicks, nick);
  if (idx >= 0) {
    localStorage.setItem("player_role", "player");
    localStorage.setItem("player_seat_index", String(idx));
  } else {
    localStorage.setItem("player_role", "spectator");
    localStorage.removeItem("player_seat_index");
  }
  notifyAssignmentsChanged();
}
