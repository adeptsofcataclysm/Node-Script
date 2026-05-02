import {
  defaultQuizRelayPayload,
  pointValueForQuestionIndex,
  type AdeptsDonationLogEntry,
  type AdeptsQuizRelayPayload,
  type AdeptsRelayActiveCard,
} from "./adepts-quiz-relay-types";

const ACTIVE_QUIZ_RELAY_PATCH_KEYS = [
  "splashDismissed",
  "splashDedFlyExitStarted",
  "splashPassHoverSeat",
  "splashSeatPassUsed",
] as const;

function parseActiveQuizRelayPatch(patch: unknown): Partial<AdeptsRelayActiveCard> {
  if (!patch || typeof patch !== "object") return {};
  const p = patch as Record<string, unknown>;
  const out: Partial<AdeptsRelayActiveCard> = {};
  for (const key of ACTIVE_QUIZ_RELAY_PATCH_KEYS) {
    if (!(key in p)) continue;
    const v = p[key];
    if (key === "splashPassHoverSeat") {
      if (v === null) {
        out.splashPassHoverSeat = null;
      } else if (typeof v === "number") {
        const n = Math.floor(v);
        if (Number.isInteger(n) && n >= 0 && n <= 4) out.splashPassHoverSeat = n;
      }
      continue;
    }
    if (typeof v === "boolean") {
      (out as Record<string, boolean>)[key] = v;
    }
  }
  return out;
}

const rooms = new Map<string, AdeptsQuizRelayPayload>();

export function getQuizRelayOrDefault(sessionId: string): AdeptsQuizRelayPayload {
  let s = rooms.get(sessionId);
  if (!s) {
    s = defaultQuizRelayPayload(sessionId);
    rooms.set(sessionId, s);
  }
  if (!Array.isArray(s.donationLog)) {
    s.donationLog = [];
  }
  return s;
}

export function cloneQuizRelay(sessionId: string): AdeptsQuizRelayPayload {
  return structuredClone(getQuizRelayOrDefault(sessionId));
}

export function setQuizRelayFull(sessionId: string, payload: AdeptsQuizRelayPayload): void {
  const base = getQuizRelayOrDefault(sessionId);

  const incomingBoardId =
    typeof (payload as Record<string, unknown>)["boardId"] === "number"
      ? (payload as Record<string, unknown>)["boardId"] as number
      : null;
  const boardChanged = incomingBoardId !== null && incomingBoardId !== base.boardId;

  base.boardRoom = sessionId;
  if (incomingBoardId !== null) base.boardId = incomingBoardId;
  base.players = structuredClone(payload.players);
  base.activeQuizCard = payload.activeQuizCard ? structuredClone(payload.activeQuizCard) : null;
  base.currentTurnSeat = payload.currentTurnSeat;
  base.quizBoardHoverCell = payload.quizBoardHoverCell ?? null;
  base.questionUsedGrid = structuredClone(payload.questionUsedGrid);
  if (payload.dataVersion !== undefined) base.dataVersion = payload.dataVersion;

  const rawLog = (payload as Record<string, unknown>)["donationLog"];
  if (Array.isArray(rawLog)) {
    const next: AdeptsDonationLogEntry[] = [];
    for (const row of rawLog) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const name = typeof o.name === "string" ? o.name.trim().slice(0, 64) : "";
      const amtRaw = o.amount;
      const amt = typeof amtRaw === "number" ? amtRaw : Number(amtRaw);
      const siRaw = o.seatIndex;
      const seatIndex =
        typeof siRaw === "number" && Number.isInteger(siRaw) && siRaw >= 0 && siRaw <= 4
          ? siRaw
          : undefined;
      if (!id || !Number.isFinite(amt) || !Number.isInteger(amt)) continue;
      next.push({ id, name: name || "Игрок", amount: amt, ...(seatIndex !== undefined ? { seatIndex } : {}) });
    }
    base.donationLog = next;
  } else if (!base.donationLog) {
    base.donationLog = [];
  }

  if (payload.catalogIncluded && payload.themes && payload.questions) {
    base.catalogIncluded = true;
    base.themes = structuredClone(payload.themes);
    base.questions = structuredClone(payload.questions);
  } else if (boardChanged) {
    // Board changed — clear the previous board's catalog so it is not served to new clients
    base.catalogIncluded = false;
    delete base.themes;
    delete base.questions;
  }
  // (lean relay, same board) → keep existing catalog intact so clients that connect later
  // still receive the most recently edited catalog for this board.
}

export function applyHostQuizRelay(sessionId: string, payload: unknown): { ok: true } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") return { ok: false, error: "payload required" };
  const p = payload as AdeptsQuizRelayPayload;
  if (!Array.isArray(p.players) || !Array.isArray(p.questionUsedGrid)) {
    return { ok: false, error: "invalid relay" };
  }
  setQuizRelayFull(sessionId, { ...p, boardRoom: sessionId });
  return { ok: true };
}

/**
 * Board hover highlight: ведущий или игрок, чей seat совпадает с currentTurnSeat.
 */
export function applyQuizBoardHover(
  sessionId: string,
  opts: { isHost: boolean; playerSeat: number | null },
  cell: { themeIndex: number; questionIndex: number } | null,
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  let authSeatN: number | null = null;
  if (opts.playerSeat !== null && opts.playerSeat !== undefined) {
    const n = Math.floor(Number(opts.playerSeat));
    if (Number.isInteger(n) && n >= 0 && n <= 4) authSeatN = ((n % 5) + 5) % 5;
  }
  const allowed = opts.isHost || (authSeatN !== null && authSeatN === turn);
  if (!allowed) return { ok: false, error: "not authorized" };

  if (cell === null) {
    s.quizBoardHoverCell = null;
    return { ok: true };
  }
  const t = cell.themeIndex;
  const q = cell.questionIndex;
  if (!Number.isInteger(t) || !Number.isInteger(q)) return { ok: false, error: "bad cell" };
  if (t < 0 || t >= s.questionUsedGrid.length) return { ok: false, error: "bad themeIndex" };
  const row = s.questionUsedGrid[t];
  if (!row || q < 0 || q >= row.length) return { ok: false, error: "bad questionIndex" };
  if (row[q]) return { ok: false, error: "cell already used" };
  s.quizBoardHoverCell = { themeIndex: t, questionIndex: q };
  return { ok: true };
}

/**
 * Merge whitelisted `activeQuizCard` fields from the current player (seat === turn) or host.
 * Used so splash / raccoon UI syncs to all clients — non-host relay does not send `hostQuizRelay`.
 */
export function applyActiveQuizPatch(
  sessionId: string,
  opts: {
    isHost: boolean;
    playerSeat: number | null;
    patch: unknown;
    nextTurnSeat?: unknown;
  },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };

  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  let authSeatN: number | null = null;
  if (opts.playerSeat !== null && opts.playerSeat !== undefined) {
    const n = Math.floor(Number(opts.playerSeat));
    if (Number.isInteger(n) && n >= 0 && n <= 4) authSeatN = ((n % 5) + 5) % 5;
  }

  const allowed = opts.isHost || (authSeatN !== null && authSeatN === turn);
  if (!allowed) return { ok: false, error: "not authorized" };

  const filtered = parseActiveQuizRelayPatch(opts.patch);
  let nextTurnN: number | null = null;
  if (opts.nextTurnSeat !== undefined && opts.nextTurnSeat !== null) {
    const nt = typeof opts.nextTurnSeat === "number" ? opts.nextTurnSeat : Number(opts.nextTurnSeat);
    const n = Math.floor(nt);
    if (!Number.isInteger(n) || n < 0 || n > 4) return { ok: false, error: "bad nextTurnSeat" };
    nextTurnN = ((n % 5) + 5) % 5;
  }

  if (Object.keys(filtered).length === 0 && nextTurnN === null) {
    return { ok: false, error: "empty patch" };
  }

  const merged: AdeptsRelayActiveCard = { ...c, ...filtered };

  if (nextTurnN !== null) {
    if (merged.splashSeatPassUsed !== true) {
      return { ok: false, error: "nextTurnSeat requires splashSeatPassUsed" };
    }
    s.currentTurnSeat = nextTurnN;
  }

  s.activeQuizCard = merged;
  return { ok: true };
}

export function applyPickCell(
  sessionId: string,
  seat: number,
  themeIndex: number,
  questionIndex: number,
  opts?: { hostBypass?: boolean },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const t = Math.floor(themeIndex);
  const q = Math.floor(questionIndex);
  if (!Number.isFinite(t) || !Number.isFinite(q)) return { ok: false, error: "bad index" };
  if (t < 0 || t >= s.questionUsedGrid.length) return { ok: false, error: "bad themeIndex" };
  const row = s.questionUsedGrid[t];
  if (!row || q < 0 || q >= row.length) return { ok: false, error: "bad questionIndex" };
  if (row[q]) return { ok: false, error: "cell already used" };
  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  const seatN = ((seat % 5) + 5) % 5;
  if (!opts?.hostBypass && turn !== seatN) return { ok: false, error: "not your turn" };
  if (s.activeQuizCard) return { ok: false, error: "card already open" };

  const card: AdeptsRelayActiveCard = {
    themeIndex: t,
    questionIndex: q,
    stage: "question",
    splashDismissed: false,
    splashDedFlyExitStarted: false,
    splashSeatPassUsed: false,
    splashPassHoverSeat: null,
  };
  s.activeQuizCard = card;
  /** Ведущий часто держит hover на той же ячейке — иначе в `sync` остаётся `quizBoardHoverCell` как у клика игрока с `null` (расхождение UI). */
  s.quizBoardHoverCell = null;
  return { ok: true };
}

export function applyHostRevealAnswer(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (!s.activeQuizCard) return { ok: false, error: "no active card" };
  if (s.activeQuizCard.stage !== "question") return { ok: false, error: "question not open" };
  s.activeQuizCard = { ...s.activeQuizCard, stage: "answer" };
  return { ok: true };
}

export function applyHostJudgeAnswer(
  sessionId: string,
  result: "correct" | "wrong",
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };
  if (c.stage !== "answer") return { ok: false, error: "answer not revealed" };
  const pts = pointValueForQuestionIndex(c.questionIndex);
  const seat = ((s.currentTurnSeat % 5) + 5) % 5;
  const p = s.players[seat];
  if (!p) return { ok: false, error: "bad seat" };

  if (result === "correct") {
    p.score += pts;
    s.questionUsedGrid[c.themeIndex][c.questionIndex] = true;
    s.activeQuizCard = null;
  } else {
    p.score -= pts;
    s.currentTurnSeat = (seat + 1) % 5;
    s.activeQuizCard = null;
  }
  return { ok: true };
}

export function applyHostAdjustScore(sessionId: string, seat: number, delta: number): void {
  const s = getQuizRelayOrDefault(sessionId);
  const i = ((seat % 5) + 5) % 5;
  const p = s.players[i];
  if (!p) return;
  p.score += delta;
}

export function applyHostSetTurn(sessionId: string, seat: number): void {
  const s = getQuizRelayOrDefault(sessionId);
  s.currentTurnSeat = ((seat % 5) + 5) % 5;
}

export function applyHostClearActiveCard(sessionId: string): void {
  const s = getQuizRelayOrDefault(sessionId);
  s.activeQuizCard = null;
}

export function initQuizRoomForSession(sessionId: string): void {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, defaultQuizRelayPayload(sessionId));
  }
}

/** Clears played cells and open card — call when the host ends the round (e.g. return to login). */
export function resetQuizRoomForSession(sessionId: string): void {
  rooms.set(sessionId, defaultQuizRelayPayload(sessionId));
}

/** Имена мест 0–4 из лобби при «Запуск игры» — сразу в relay, чтобы все клиенты увидели ники в `sync`. */
export function applySeatNickRosterToQuizRelay(sessionId: string, seatNicks: string[]): void {
  const s = getQuizRelayOrDefault(sessionId);
  const row = [...seatNicks.map((x) => String(x ?? "").trim().slice(0, 64))];
  while (row.length < 5) row.push("");
  for (let i = 0; i < 5; i++) {
    const p = s.players[i];
    if (!p) continue;
    const nick = row[i] ?? "";
    p.name = nick.length > 0 ? nick : `Игрок ${i + 1}`;
  }
}

export function applyPlayerDonation(
  sessionId: string,
  seat: number,
  amount: number,
): { ok: true } | { ok: false; error: string } {
  const seatN = ((Math.floor(seat) % 5) + 5) % 5;
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, error: "amount" };
  const s = getQuizRelayOrDefault(sessionId);
  const p = s.players[seatN];
  if (!p) return { ok: false, error: "player" };
  if (p.score < 0 || amount > p.score) return { ok: false, error: "no funds" };

  const name = String(p.name ?? "").trim().slice(0, 64) || `Игрок ${seatN + 1}`;
  const nameKey = name.trim().toLowerCase();
  if (!s.donationLog) s.donationLog = [];

  let mergeLegacy = 0;
  s.donationLog = s.donationLog.filter((e) => {
    if (typeof e.seatIndex === "number") return true;
    if (String(e.name ?? "").trim().toLowerCase() === nameKey) {
      mergeLegacy += e.amount;
      return false;
    }
    return true;
  });

  p.score -= amount;

  const addTotal = amount + mergeLegacy;
  const existing = s.donationLog.find(
    (e) => typeof e.seatIndex === "number" && e.seatIndex === seatN,
  );
  if (existing) {
    existing.amount += addTotal;
    existing.name = name;
  } else {
    const id = `d-seat-${seatN}-${Date.now()}`;
    s.donationLog.push({ id, name, amount: addTotal, seatIndex: seatN });
  }
  return { ok: true };
}

export function __resetQuizRoomsForTests(): void {
  rooms.clear();
}
