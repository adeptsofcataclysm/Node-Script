import type { Player, Question } from "@/lib/adepts-quiz-types";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import type { AdeptsQuizBoardPayload } from "@/lib/adeptsQuizBoardApi";

/** Mirrors `ActiveQuizCard` from adepts-game hooks — socket payload only. */
export type AdeptsQuizRelayActiveCard = {
  themeIndex: number;
  questionIndex: number;
  stage: "question" | "answer";
  splashDismissed?: boolean;
  splashDedFlyExitStarted?: boolean;
  splashSeatPassUsed?: boolean;
  splashPassHoverSeat?: number | null;
};

/** Lean `/quiz` payload: full catalog only when `catalogIncluded` is true. */
export type AdeptsQuizRelayPayload = {
  boardRoom: string;
  /**
   * Board id (1 | 2 | 3). Included so receivers can reject a `catalogIncluded` relay that
   * belongs to a different board when all boards share the same socket room.
   */
  boardId?: number;
  players: Player[];
  activeQuizCard: AdeptsQuizRelayActiveCard | null;
  currentTurnSeat: number;
  quizBoardHoverCell?: QuizBoardHoverCell | null;
  /** Which cells are played; always sent so peers stay in sync without full question bodies. */
  questionUsedGrid: boolean[][];
  /** Host set after editing themes/questions via API — includes `themes` + `questions` once. */
  catalogIncluded?: boolean;
  themes?: string[];
  questions?: Question[][];
  dataVersion?: number;
  /** Пожертвования по местам 1–5; общие для всей сессии квиза. */
  donations?: (number | null)[];
};

export function normalizeQuizDonations(raw: unknown): (number | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== 5) return null;
  const out: (number | null)[] = [];
  for (let i = 0; i < 5; i++) {
    const v = raw[i];
    if (v === null || v === undefined) {
      out.push(null);
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      out.push(Math.round(v));
      continue;
    }
    const n = Number(v);
    out.push(Number.isFinite(n) ? Math.round(n) : null);
  }
  return out;
}

export function buildAdeptsQuizRelayPayload(
  slice: {
    players: Player[];
    themes: string[];
    questions: Question[][];
    activeQuizCard: AdeptsQuizRelayActiveCard | null;
    currentTurnSeat: number;
    quizBoardHoverCell?: QuizBoardHoverCell | null;
    dataVersion?: number;
    donations: (number | null)[];
  },
  boardRoom: string,
  includeCatalog: boolean,
  boardId?: number
): AdeptsQuizRelayPayload {
  const out: AdeptsQuizRelayPayload = {
    boardRoom,
    players: slice.players,
    activeQuizCard: slice.activeQuizCard,
    currentTurnSeat: slice.currentTurnSeat,
    quizBoardHoverCell: slice.quizBoardHoverCell ?? null,
    questionUsedGrid: slice.questions.map((row) => row.map((q) => Boolean(q.used))),
    donations: normalizeQuizDonations(slice.donations) ?? [null, null, null, null, null],
  };
  if (boardId !== undefined) out.boardId = boardId;
  if (slice.dataVersion !== undefined) out.dataVersion = slice.dataVersion;
  if (includeCatalog) {
    out.catalogIncluded = true;
    out.themes = slice.themes;
    out.questions = slice.questions;
  }
  return out;
}

export type ThemesQuestionsDerive = {
  themes: string[];
  questions: Question[][];
  /** Peers update local API mirror when host pushes catalog over socket. */
  receivedCatalog?: AdeptsQuizBoardPayload;
};

/**
 * Merge incoming `/quiz` payload into themes + questions for local state.
 * Supports lean relay (`questionUsedGrid`) and legacy full `GameState` sync.
 */
export function deriveThemesAndQuestionsFromQuizIncoming(
  incoming: unknown,
  prev: { themes: string[]; questions: Question[][] },
  cat: AdeptsQuizBoardPayload | null,
  isSameBoard: boolean
): ThemesQuestionsDerive {
  if (!incoming || typeof incoming !== "object") {
    return { themes: prev.themes, questions: prev.questions };
  }
  const rec = incoming as Record<string, unknown>;

  const rawGrid = rec["questionUsedGrid"];
  const gridOk =
    Array.isArray(rawGrid) &&
    rawGrid.length > 0 &&
    rawGrid.every((row) => Array.isArray(row));

  if (!gridOk) {
    const legacy = incoming as {
      themes?: string[];
      questions?: Question[][];
    };
    const themes = cat?.themes ?? (isSameBoard ? (legacy.themes ?? prev.themes) : prev.themes);
    const questions = cat
      ? cat.questions.map((row, tIdx) =>
          row.map((q, qIdx) => ({
            ...q,
            used: isSameBoard
              ? (legacy.questions?.[tIdx]?.[qIdx]?.used ?? false)
              : false,
          }))
        )
      : prev.questions.map((themeQs, tIdx) =>
          themeQs.map((defaultQ, qIdx) => ({
            ...defaultQ,
            used: isSameBoard
              ? (legacy.questions?.[tIdx]?.[qIdx]?.used ?? defaultQ.used)
              : defaultQ.used,
          }))
        );
    return { themes, questions };
  }

  const usedGrid = rawGrid as boolean[][];
  const catalogIncluded =
    rec["catalogIncluded"] === true &&
    Array.isArray(rec["themes"]) &&
    Array.isArray(rec["questions"]);

  if (catalogIncluded) {
    const themes = rec["themes"] as string[];
    const rawQuestions = rec["questions"] as Question[][];
    const questions = rawQuestions.map((row, tIdx) =>
      row.map((q, qIdx) => ({
        ...q,
        used: usedGrid[tIdx]?.[qIdx] ?? false,
      }))
    );
    const receivedCatalog: AdeptsQuizBoardPayload = {
      themes,
      questions: rawQuestions.map((row) => row.map((q) => ({ ...q, used: false }))),
    };
    return { themes, questions, receivedCatalog };
  }

  const themes = cat?.themes ?? (isSameBoard ? ((rec["themes"] as string[] | undefined) ?? prev.themes) : prev.themes);
  /**
   * `questionUsedGrid` is authoritative for «сыграна ли клетка». Не смешивать с `prev.questions[].used`
   * при `!isSameBoard` (например `boardRoom` default vs путь) — иначе старый localStorage оставляет
   * `used: true`, `withClosedActiveQuizIfCellUsed` сразу закрывает только что открытую с сервера карту (часто у ведущего).
   */
  const usedCell = (tIdx: number, qIdx: number) => Boolean(usedGrid[tIdx]?.[qIdx]);
  const questions = cat
    ? cat.questions.map((row, tIdx) =>
        row.map((q, qIdx) => ({
          ...q,
          used: usedCell(tIdx, qIdx),
        }))
      )
    : prev.questions.map((themeQs, tIdx) =>
        themeQs.map((defaultQ, qIdx) => ({
          ...defaultQ,
          used: usedCell(tIdx, qIdx),
        }))
      );
  return { themes, questions };
}
