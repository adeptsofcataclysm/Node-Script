/** Server-side mirror of `AdeptsQuizRelayPayload` (game-client) for authoritative `/quiz` rooms. */

export type AdeptsRelayPlayer = { id: string; name: string; score: number };

export type AdeptsRelayActiveCard = {
  themeIndex: number;
  questionIndex: number;
  stage: "question" | "answer";
  splashDismissed?: boolean;
  splashDedFlyExitStarted?: boolean;
  splashSeatPassUsed?: boolean;
  splashPassHoverSeat?: number | null;
};

export type AdeptsRelayHover = { themeIndex: number; questionIndex: number } | null;

export type AdeptsDonationLogEntry = {
  id: string;
  name: string;
  amount: number;
  /** 0–4; повторные пожертвования того же места суммируются в одной строке. */
  seatIndex?: number;
};

export type AdeptsQuizRelayPayload = {
  boardRoom: string;
  /** Board id (1 | 2 | 3). Used to detect cross-board relay contamination. */
  boardId?: number;
  players: AdeptsRelayPlayer[];
  activeQuizCard: AdeptsRelayActiveCard | null;
  currentTurnSeat: number;
  quizBoardHoverCell?: AdeptsRelayHover;
  questionUsedGrid: boolean[][];
  catalogIncluded?: boolean;
  themes?: string[];
  questions?: unknown[][];
  dataVersion?: number;
  /** Журнал пожертвований. */
  donationLog?: AdeptsDonationLogEntry[];
};

const THEME_COUNT = 8;
const QUESTION_COUNT = 5;

export function defaultQuizRelayPayload(sessionId: string): AdeptsQuizRelayPayload {
  const players: AdeptsRelayPlayer[] = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    score: 0,
  }));
  const questionUsedGrid = Array.from({ length: THEME_COUNT }, () =>
    Array.from({ length: QUESTION_COUNT }, () => false),
  );
  return {
    boardRoom: sessionId,
    players,
    activeQuizCard: null,
    currentTurnSeat: 0,
    quizBoardHoverCell: null,
    questionUsedGrid,
    dataVersion: 59,
    donationLog: [],
  };
}

export function pointValueForQuestionIndex(questionIndex: number): number {
  const tier = [100, 200, 300, 400, 500];
  return tier[Math.max(0, Math.min(QUESTION_COUNT - 1, questionIndex))] ?? 100;
}
