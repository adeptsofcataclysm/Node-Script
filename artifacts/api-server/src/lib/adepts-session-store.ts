import { randomUUID } from "node:crypto";
import type { AdeptsPhase, AdeptsSession, SeatIndex } from "./adepts-session-types";
import {
  ADEPTS_LOBBY_EMOJI_REVEAL_MAX,
} from "./adepts-session-types";
import { canTransitionAdeptsPhase } from "./adepts-session-fsm";
import { initQuizRoomForSession } from "./adepts-quiz-room-store";

// Re-export SeatIndex for callers (bets use 1–5).
export type { SeatIndex };

type MutableSession = AdeptsSession;

const sessions = new Map<string, MutableSession>();

const ZERO_SCORES: AdeptsSession["scores"] = [0, 0, 0, 0, 0];

function nowMs(): number {
  return Date.now();
}

function initialPhase(): AdeptsPhase {
  return { kind: "lobby" };
}

function defaultWheel(): NonNullable<AdeptsSession["wheel"]> {
  return {
    isSpinning: false,
    lastSegmentIndex: 0,
    totalRotation: 0,
    previousTotalRotation: 0,
    spinStartTime: null,
    spinTargetRotation: 0,
    spinDurationMs: 10400,
  };
}

function buildNewSession(id: string): MutableSession {
  const t = nowMs();
  return {
    id,
    version: 1,
    phase: initialPhase(),
    scores: [...ZERO_SCORES] as AdeptsSession["scores"],
    currentTurnSeat: 0,
    activeBoardId: 1,
    createdAtMs: t,
    updatedAtMs: t,
    openingShow: { lobbyEmojiLineIndex: -1, spectatorCorrectCounts: {} },
    spectatorPicks: { locked: false, bets: {} },
    lottery: { candidates: [], optOut: {}, lastWinnerNick: null },
    wheel: null,
  };
}

function bump(s: MutableSession): void {
  s.version += 1;
  s.updatedAtMs = nowMs();
}

export function createAdeptsSession(): AdeptsSession {
  const id = randomUUID();
  const session = buildNewSession(id);
  sessions.set(id, session);
  initQuizRoomForSession(id);
  return cloneAdeptsSession(session);
}

/** Lazy-create session document for a socket `sessionId` (e.g. `default` or UUID from POST /api/sessions). */
export function ensureAdeptsSession(sessionId: string): AdeptsSession {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, buildNewSession(sessionId));
    initQuizRoomForSession(sessionId);
  }
  return cloneAdeptsSession(sessions.get(sessionId)!);
}

export function getMutableAdeptsSession(sessionId: string): MutableSession | undefined {
  return sessions.get(sessionId);
}

export function getAdeptsSession(sessionId: string): AdeptsSession | undefined {
  const s = sessions.get(sessionId);
  return s ? cloneAdeptsSession(s) : undefined;
}

export function cloneAdeptsSession(session: AdeptsSession): AdeptsSession {
  return structuredClone(session);
}

export type AdeptsSessionTransitionResult =
  | { ok: true; session: AdeptsSession }
  | { ok: false; error: string };

export function transitionAdeptsSession(
  sessionId: string,
  nextPhase: AdeptsPhase,
): AdeptsSessionTransitionResult {
  const current = sessions.get(sessionId);
  if (!current) {
    return { ok: false, error: "Session not found" };
  }
  if (!canTransitionAdeptsPhase(current.phase, nextPhase)) {
    return {
      ok: false,
      error: `Invalid phase transition: ${JSON.stringify(current.phase)} → ${JSON.stringify(nextPhase)}`,
    };
  }
  current.phase = nextPhase;
  bump(current);

  if (nextPhase.kind === "round") {
    current.activeBoardId = nextPhase.roundIndex;
  }
  if (nextPhase.kind === "mini_wheel") {
    current.wheel = current.wheel ?? defaultWheel();
  } else {
    current.wheel = null;
  }

  return { ok: true, session: cloneAdeptsSession(current) };
}

export function openingEmojiNext(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.phase.kind !== "opening_show") return { ok: false, error: "not in opening_show" };
  if (s.openingShow.lobbyEmojiLineIndex >= ADEPTS_LOBBY_EMOJI_REVEAL_MAX - 1) {
    return { ok: false, error: "emoji line at max" };
  }
  s.openingShow.lobbyEmojiLineIndex += 1;
  bump(s);
  return { ok: true };
}

export function openingEmojiPrev(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.phase.kind !== "opening_show") return { ok: false, error: "not in opening_show" };
  if (s.openingShow.lobbyEmojiLineIndex <= -1) return { ok: false, error: "emoji line at min" };
  s.openingShow.lobbyEmojiLineIndex -= 1;
  bump(s);
  return { ok: true };
}

export function openingMarkCorrect(sessionId: string, nick: string): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.phase.kind !== "opening_show") return { ok: false, error: "not in opening_show" };
  const key = nick.trim().slice(0, 64);
  if (!key) return { ok: false, error: "nick required" };
  s.openingShow.spectatorCorrectCounts[key] = (s.openingShow.spectatorCorrectCounts[key] ?? 0) + 1;
  bump(s);
  return { ok: true };
}

export function spectatorPlaceBet(
  sessionId: string,
  spectatorKey: string,
  seat: SeatIndex,
): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.phase.kind !== "spectator_picks") return { ok: false, error: "not in spectator_picks" };
  if (s.spectatorPicks.locked) return { ok: false, error: "picks locked" };
  const k = spectatorKey.trim().slice(0, 128);
  if (!k) return { ok: false, error: "spectatorKey required" };
  s.spectatorPicks.bets[k] = seat;
  bump(s);
  return { ok: true };
}

export function spectatorPicksLock(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.phase.kind !== "spectator_picks") return { ok: false, error: "not in spectator_picks" };
  s.spectatorPicks.locked = true;
  bump(s);
  return { ok: true };
}

export function lotterySetCandidates(
  sessionId: string,
  candidates: string[],
): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  s.lottery.candidates = candidates.map((c) => String(c).trim().slice(0, 64)).filter(Boolean).slice(0, 64);
  bump(s);
  return { ok: true };
}

export function lotteryOptOut(sessionId: string, nick: string): { ok: true } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  const k = nick.trim().slice(0, 64);
  if (!k) return { ok: false, error: "nick required" };
  s.lottery.optOut[k] = true;
  bump(s);
  return { ok: true };
}

export function lotteryDraw(sessionId: string): { ok: true; winner: string | null } | { ok: false; error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  const pool = s.lottery.candidates.filter((c) => !s.lottery.optOut[c]);
  if (pool.length === 0) {
    s.lottery.lastWinnerNick = null;
    bump(s);
    return { ok: true, winner: null };
  }
  const winner = pool[Math.floor(Math.random() * pool.length)] ?? null;
  s.lottery.lastWinnerNick = winner;
  bump(s);
  return { ok: true, winner };
}

export function replaceWheelState(sessionId: string, wheel: NonNullable<AdeptsSession["wheel"]>): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.wheel = { ...wheel };
  bump(s);
}

export function __resetAdeptsSessionsForTests(): void {
  sessions.clear();
}
