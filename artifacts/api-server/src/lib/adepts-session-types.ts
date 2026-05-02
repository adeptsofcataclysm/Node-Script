/**
 * Authoritative Adepts session snapshot (HTTP + `/adepts` sync).
 * Version increments on every successful authoritative mutation.
 */

export type SeatIndex = 1 | 2 | 3 | 4 | 5;

export type AdeptsRoundIndex = 1 | 2 | 3;

/** Lifecycle + main rounds + mini-games that pause the board (vision-aligned names). */
export type AdeptsPhase =
  | { kind: "lobby" }
  | { kind: "opening_show" }
  | { kind: "spectator_picks" }
  | { kind: "round"; roundIndex: AdeptsRoundIndex }
  | { kind: "mini_wheel"; roundIndex: AdeptsRoundIndex }
  | { kind: "mini_roulette"; roundIndex: AdeptsRoundIndex }
  | { kind: "story_video" }
  | { kind: "donations" }
  | { kind: "game_over" };

export type AdeptsScores = [number, number, number, number, number];

/** Opening show: emoji line + spectator scores (Host marks correct). */
export type AdeptsOpeningShowState = {
  lobbyEmojiLineIndex: number;
  spectatorCorrectCounts: Record<string, number>;
};

/** Spectator picks before round 1 lock. */
export type AdeptsSpectatorPicksState = {
  locked: boolean;
  /** spectatorKey → seat 1–5 */
  bets: Record<string, SeatIndex>;
};

/** Post-roulette lottery pool. */
export type AdeptsLotteryState = {
  candidates: string[];
  optOut: Record<string, true>;
  lastWinnerNick: string | null;
};

/** Wheel snapshot (mirrors `/wheel` physics for session FSM + `/adepts` sync). */
export type AdeptsWheelSessionState = {
  isSpinning: boolean;
  lastSegmentIndex: number;
  totalRotation: number;
  previousTotalRotation: number;
  spinStartTime: number | null;
  spinTargetRotation: number;
  spinDurationMs: number;
};

export type AdeptsSession = {
  id: string;
  /** Bumped on each successful authoritative update (clients reconcile via version). */
  version: number;
  phase: AdeptsPhase;
  scores: AdeptsScores;
  /**
   * Quiz board turn seat **0–4** (same meaning as `quiz.currentTurnSeat` in `/adepts` sync).
   * Spectator bets still use `SeatIndex` 1–5 on `spectatorPicks.bets`.
   */
  currentTurnSeat: number;
  /** Active quiz catalog board (1–3), aligned with `/api/adepts-quiz-board/:boardId`. */
  activeBoardId: AdeptsRoundIndex;
  createdAtMs: number;
  updatedAtMs: number;

  openingShow: AdeptsOpeningShowState;
  spectatorPicks: AdeptsSpectatorPicksState;
  lottery: AdeptsLotteryState;
  /** Populated while phase is `mini_wheel`; cleared when returning to `round`. */
  wheel: AdeptsWheelSessionState | null;
};

/** Wire payload for `sync`-style responses (HTTP or Socket.io). */
export type AdeptsSessionSyncPayload = {
  sessionId: string;
  version: number;
  session: AdeptsSession;
};

export const ADEPTS_LOBBY_EMOJI_REVEAL_MAX = 40;
