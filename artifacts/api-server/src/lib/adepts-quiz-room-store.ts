import type { AdeptsQuizRelayPayload, AdeptsRelayActiveCard } from "./adepts-quiz-relay-types";
import {
  defaultQuizRelayPayload,
  pointValueForQuestionIndex,
} from "./adepts-quiz-relay-types";

const rooms = new Map<string, AdeptsQuizRelayPayload>();

export function getQuizRelayOrDefault(sessionId: string): AdeptsQuizRelayPayload {
  let s = rooms.get(sessionId);
  if (!s) {
    s = defaultQuizRelayPayload(sessionId);
    rooms.set(sessionId, s);
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

export function applyHostSetHover(
  sessionId: string,
  cell: { themeIndex: number; questionIndex: number } | null,
): void {
  const s = getQuizRelayOrDefault(sessionId);
  s.quizBoardHoverCell = cell;
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

export function __resetQuizRoomsForTests(): void {
  rooms.clear();
}
