import type {
  AdeptsSuperTttState,
  AdeptsSuperTttWinner,
  Player,
  Question,
} from "@/lib/adepts-quiz-types";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import type { AdeptsQuizBoardPayload } from "@/lib/adeptsQuizBoardApi";
import type { DonationLogEntry } from "@/lib/donationLog";
import { normalizeDonationLog } from "@/lib/donationLog";

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
   * Board id (1–4). Included so receivers can reject a `catalogIncluded` relay that
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
  /** Журнал пожертвований (строки «ник — сумма»). */
  donationLog?: DonationLogEntry[];
  /** Скрыть таблицу пожертвований на 3-й доске (после ×2 с деда); сброс на странице похорон. */
  hideDonationsTableOnBoard3?: boolean;
  /** Титры после игры (квиз-доски 3 и 4); в relay добавляется при `boardId === 3` или `4`. */
  creditsRollActive?: boolean;
  creditsRollStartedAt?: number;
  /** Квиз-доска 4 «СУПЕР ИГРА!». */
  superTtt?: AdeptsSuperTttState | null;
  superTttWinner?: AdeptsSuperTttWinner | null;
  /** Доска 4: место того, кто открыл верхнюю правую карточку (вопрос 1) — ○ в крестиках-ноликах. */
  superBoardFourKeyOpenerSeat?: number | null;
};

export function buildAdeptsQuizRelayPayload(
  slice: {
    players: Player[];
    themes: string[];
    questions: Question[][];
    activeQuizCard: AdeptsQuizRelayActiveCard | null;
    currentTurnSeat: number;
    quizBoardHoverCell?: QuizBoardHoverCell | null;
    dataVersion?: number;
    donationLog: DonationLogEntry[];
    hideDonationsTableOnBoard3?: boolean;
    creditsRollActive?: boolean;
    creditsRollStartedAt?: number;
    superTtt?: AdeptsSuperTttState | null;
    superTttWinner?: AdeptsSuperTttWinner | null;
    superBoardFourKeyOpenerSeat?: number | null;
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
    donationLog: normalizeDonationLog(slice.donationLog) ?? [],
    hideDonationsTableOnBoard3: slice.hideDonationsTableOnBoard3 === true,
  };
  if (boardId !== undefined) out.boardId = boardId;
  if (slice.dataVersion !== undefined) out.dataVersion = slice.dataVersion;
  /** Всегда шлём подписи тем — на сервере нужны для «Маунты 400» и т.п. без тяжёлого каталога. */
  out.themes = slice.themes;
  if (includeCatalog) {
    out.catalogIncluded = true;
    out.questions = slice.questions;
  }
  if (boardId === 3 || boardId === 4) {
    out.creditsRollActive = slice.creditsRollActive === true;
    if (slice.creditsRollActive === true && slice.creditsRollStartedAt !== undefined) {
      out.creditsRollStartedAt = slice.creditsRollStartedAt;
    }
  }
  if (boardId === 4) {
    out.superTtt = slice.superTtt ?? null;
    out.superTttWinner = slice.superTttWinner ?? null;
    const keySeat = slice.superBoardFourKeyOpenerSeat;
    if (typeof keySeat === "number" && Number.isInteger(keySeat)) {
      out.superBoardFourKeyOpenerSeat = ((keySeat % 5) + 5) % 5;
    } else if (keySeat === null) {
      out.superBoardFourKeyOpenerSeat = null;
    }
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
