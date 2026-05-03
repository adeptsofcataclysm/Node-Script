import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AdeptsBoardId,
  AdeptsSuperTttState,
  AdeptsSuperTttWinner,
  Player,
  Question,
} from "@/lib/adepts-quiz-types";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import {
  ADEPTS_QUIZ_ASSIGNMENTS_EVENT,
  mergeSeatRosterIntoQuizPlayers,
} from "@/lib/quizLobbyClientAssignments";
import { consumeAdeptsWheelReturnCloseQuizCardFlag } from "@/lib/quizAdeptsWheelClient";
import type { AdeptsQuizBoardPayload } from "@/lib/adeptsQuizBoardApi";
import {
  fetchAdeptsQuizBoard,
  patchAdeptsQuizQuestion,
  patchAdeptsQuizTheme,
} from "@/lib/adeptsQuizBoardApi";
import {
  buildAdeptsQuizRelayPayload,
  deriveThemesAndQuestionsFromQuizIncoming,
} from "@/lib/adeptsQuizSocketRelay";
import type { DonationLogEntry } from "@/lib/donationLog";
import { normalizeDonationLog } from "@/lib/donationLog";
import {
  getAdeptsCommandSocket,
  getAdeptsCommandSocketClientKey,
  readAdeptsPlayerSeatIndexForSocket,
} from "@/lib/adeptsCommandSocket";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
import { withClosedActiveQuizIfCellUsed } from "@/lib/withClosedActiveQuizIfCellUsed";

export type { Player, Question };

export type ActiveQuizCard = {
  themeIndex: number;
  questionIndex: number;
  stage: "question" | "answer";
  splashDismissed?: boolean;
  splashDedFlyExitStarted?: boolean;
  splashSeatPassUsed?: boolean;
  splashPassHoverSeat?: number | null;
};

export type GameState = {
  players: Player[];
  themes: string[];
  questions: Question[][];
  activeQuizCard: ActiveQuizCard | null;
  currentTurnSeat: number;
  quizBoardHoverCell?: QuizBoardHoverCell;
  dataVersion?: number;
  boardRoom?: string;
  /** Журнал пожертвований (строки); общий для всех раундов квиза. */
  donationLog: DonationLogEntry[];
  /** После ×2 с деда на 400 — скрыть таблицу на 3-й доске; сброс при входе на похороны (сервер). */
  hideDonationsTableOnBoard3?: boolean;
  /** Титры после игры (квиз-доски 3 и 4). */
  creditsRollActive?: boolean;
  creditsRollStartedAt?: number;
  /** Доска 4: крестики-нолики после 4 карточек. */
  superTtt?: AdeptsSuperTttState | null;
  superTttWinner?: AdeptsSuperTttWinner | null;
  /** Доска 4: место игрока, открывшего верхнюю правую карточку (вопрос 1) — ○. */
  superBoardFourKeyOpenerSeat?: number | null;
};

const DEFAULT_PLAYERS: Player[] = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i + 1}`,
  score: 0,
}));

function emptyGrid(boardId: AdeptsBoardId): Pick<GameState, "themes" | "questions"> {
  if (boardId === 4) {
    return {
      themes: [""],
      questions: [
        Array.from({ length: 4 }, () => ({
          text: "",
          questionUrl: "",
          answerText: "",
          answerUrl: "",
          used: false,
        })),
      ],
    };
  }
  const themeCount = 8;
  return {
    themes: Array.from({ length: themeCount }, () => ""),
    questions: Array.from({ length: themeCount }, () =>
      Array.from({ length: 5 }, () => ({
        text: "",
        questionUrl: "",
        answerText: "",
        answerUrl: "",
        used: false,
      }))
    ),
  };
}

const DEFAULT_DONATION_LOG: DonationLogEntry[] = [];

const DEFAULT_CORE: Omit<GameState, "themes" | "questions"> = {
  activeQuizCard: null,
  currentTurnSeat: 0,
  quizBoardHoverCell: null,
  players: DEFAULT_PLAYERS,
  dataVersion: undefined,
  boardRoom: undefined,
  donationLog: [...DEFAULT_DONATION_LOG],
  hideDonationsTableOnBoard3: false,
  creditsRollActive: false,
  creditsRollStartedAt: undefined,
  superTtt: null,
  superTttWinner: null,
  superBoardFourKeyOpenerSeat: undefined,
};

const PLAYERS_KEY = "adepts-shared-players";
const DONATION_LOG_KEY = "adepts-shared-donation-log";

function loadSharedDonationLog(): DonationLogEntry[] {
  try {
    const s = localStorage.getItem(DONATION_LOG_KEY);
    if (!s) return [...DEFAULT_DONATION_LOG];
    const parsed = JSON.parse(s) as unknown;
    return normalizeDonationLog(parsed) ?? [...DEFAULT_DONATION_LOG];
  } catch {
    return [...DEFAULT_DONATION_LOG];
  }
}

type BoardRuntime = {
  storageKey: string;
  dataVersion: number;
  dataVersionKey: string | null;
};

function boardRuntime(boardId: AdeptsBoardId): BoardRuntime {
  switch (boardId) {
    case 1:
      return { storageKey: "adepts-game-state", dataVersion: 59, dataVersionKey: null };
    case 2:
      return {
        storageKey: "adepts-game-2-state",
        dataVersion: 52,
        dataVersionKey: "adepts-game-2-data-version",
      };
    case 3:
      return {
        storageKey: "adepts-game-3-state",
        dataVersion: 17,
        dataVersionKey: "adepts-game-3-data-version",
      };
    case 4:
      return {
        storageKey: "adepts-game-4-state",
        dataVersion: 1,
        dataVersionKey: "adepts-game-4-data-version",
      };
  }
}

function mergeBoardWithUsed(board: AdeptsQuizBoardPayload, prevQuestions: Question[][]): Question[][] {
  const dimsMatch =
    prevQuestions.length === board.questions.length &&
    board.questions.every((row, tIdx) => row.length === (prevQuestions[tIdx]?.length ?? -1));
  return board.questions.map((row, tIdx) =>
    row.map((q, qIdx) => ({
      ...q,
      used: dimsMatch ? (prevQuestions[tIdx]?.[qIdx]?.used ?? false) : false,
    }))
  );
}

function restoreLegacyWheelCards(state: GameState): GameState {
  const nextQuestions = state.questions.map((theme) => theme.map((question) => ({ ...question })));

  if (nextQuestions[1]?.[2]) {
    nextQuestions[1][2] = {
      ...nextQuestions[1][2],
      text: "",
      questionUrl: "/pashalki-300-question.mp4",
      answerText: "Вы получаете 3 крутки Колеса Адептов",
      answerUrl: "/freebie-400-question.png",
    };
  }

  if (nextQuestions[1]?.[0]) {
    nextQuestions[1][0] = {
      ...nextQuestions[1][0],
      splashUrl: "/raccoon.png",
    };
  }

  if (nextQuestions[5]?.[3]) {
    nextQuestions[5][3] = {
      ...nextQuestions[5][3],
      text: "",
      questionUrl: "/freebie-400-question.mp4",
      answerText: "Вы получаете 3 крутки Колеса Адептов",
      answerUrl: "/freebie-400-question.png",
    };
  }

  if (nextQuestions[5]?.[4]) {
    nextQuestions[5][4] = {
      ...nextQuestions[5][4],
      questionUrl: "/halyava-500-question.mp4",
    };
  }

  if (nextQuestions[3]?.[0]) {
    nextQuestions[3][0] = {
      ...nextQuestions[3][0],
      headerUrl: "/wheel.png",
    };
  }

  return { ...state, questions: nextQuestions };
}

function restoreLegacyPandoraVideos(state: GameState): GameState {
  const nextQuestions = state.questions.map((theme) => theme.map((question) => ({ ...question })));

  if (nextQuestions[3]?.[4]) {
    nextQuestions[3][4] = {
      ...nextQuestions[3][4],
      questionUrl: "/halyava-500-question.mp4",
    };
  }

  return { ...state, questions: nextQuestions };
}

function restoreRaccoonCards(state: GameState): GameState {
  const nextQuestions = state.questions.map((theme) => theme.map((question) => ({ ...question })));
  const raccoonCards: Array<[number, number]> = [
    [0, 2],
    [1, 4],
    [4, 2],
    [6, 1],
    [7, 4],
  ];

  for (const [themeIdx, questionIdx] of raccoonCards) {
    if (nextQuestions[themeIdx]?.[questionIdx]) {
      nextQuestions[themeIdx][questionIdx] = {
        ...nextQuestions[themeIdx][questionIdx],
        splashUrl: "/raccoon.png",
      };
    }
  }

  const cursedCosplayUrls = [
    "/cursed-cosplay-200.png",
    "/cursed-cosplay-400.png",
    "/cursed-cosplay-100.png",
    "/cursed-cosplay-300.png",
  ] as const;
  cursedCosplayUrls.forEach((url, qIdx) => {
    if (nextQuestions[1]?.[qIdx]) {
      nextQuestions[1][qIdx] = {
        ...nextQuestions[1][qIdx],
        questionUrl: url,
      };
    }
  });

  if (nextQuestions[1]?.[2]) {
    nextQuestions[1][2] = {
      ...nextQuestions[1][2],
      answerUrl: "/cursed-cosplay-300-answer.png",
    };
  }
  if (nextQuestions[1]?.[3]) {
    nextQuestions[1][3] = {
      ...nextQuestions[1][3],
      answerUrl: "/cursed-cosplay-400-answer.png",
    };
  }

  if (nextQuestions[3]?.[1]) {
    nextQuestions[3][1] = {
      ...nextQuestions[3][1],
      text: "Ящик Пандоры",
      questionUrl: "/halyava-500-question.mp4",
    };
  }

  if (nextQuestions[0]?.[3]) {
    const q = nextQuestions[0][3];
    const u = (q.questionUrl || "").toLowerCase();
    if (/lor-400-question\.(png|jpg|gif)$/i.test(u) && !u.startsWith("http")) {
      nextQuestions[0][3] = { ...q, questionUrl: "/lor-400-question.gif" };
    }
  }

  if (nextQuestions[3]?.[0]?.answerUrl?.includes("8ea3f54ef99a2e90ed1ef1f34bcc085f.gif@jpg")) {
    const q = nextQuestions[3][0];
    nextQuestions[3][0] = {
      ...q,
      answerUrl: "https://images.cybersport.ru/images/as-is/plain/8e/8ea3f54ef99a2e90ed1ef1f34bcc085f.gif",
    };
  }

  if (nextQuestions[2]?.[0]) {
    nextQuestions[2][0] = {
      ...nextQuestions[2][0],
      headerUrl: "/wheel.png",
    };
  }

  if (nextQuestions[4]?.[1]) {
    nextQuestions[4][1] = {
      ...nextQuestions[4][1],
      questionUrl: "/zaceni-look-200-question.png",
    };
  }
  if (nextQuestions[4]?.[3]) {
    nextQuestions[4][3] = {
      ...nextQuestions[4][3],
      questionUrl: "/zaceni-look-400-question.png",
    };
  }

  if (nextQuestions[4]?.[4]) {
    nextQuestions[4][4] = {
      ...nextQuestions[4][4],
      questionUrl: "/zaceni-look-500-question.mp4",
    };
  }
  if (nextQuestions[5]?.[1]) {
    nextQuestions[5][1] = {
      ...nextQuestions[5][1],
      questionUrl: "/bosses-200-question.mp4",
    };
  }

  if (nextQuestions[6]?.[3]) {
    nextQuestions[6][3] = {
      ...nextQuestions[6][3],
      text: '[4.Поиск спутников]: "Помогу с фармом «Тёмных ларцов» для репутации с фракцией <????>. Подробности в ПМ."\nО какой фракции идёт речь?',
    };
  }

  if (nextQuestions[7]?.[0]) {
    nextQuestions[7][0] = { ...nextQuestions[7][0], questionUrl: "/wow-events-100-question.png" };
  }
  if (nextQuestions[7]?.[3]) {
    nextQuestions[7][3] = {
      ...nextQuestions[7][3],
      questionUrl: "/wow-events-400-question.png",
      answerUrl: "/wow-events-400-answer.png",
    };
  }
  if (nextQuestions[7]?.[4]) {
    nextQuestions[7][4] = { ...nextQuestions[7][4], questionUrl: "/wow-events-500-question.png" };
  }
  if (nextQuestions[7]?.[2]) {
    nextQuestions[7][2] = { ...nextQuestions[7][2], answerUrl: "/wow-events-300-answer.png" };
  }

  return { ...state, questions: nextQuestions };
}

function migrateCatalog(boardId: AdeptsBoardId, state: GameState): GameState {
  if (boardId === 4) return { ...state };
  if (boardId === 1) return restoreLegacyWheelCards(state);
  if (boardId === 2) return restoreLegacyPandoraVideos(state);
  return restoreRaccoonCards(state);
}

function loadInitialState(boardId: AdeptsBoardId): GameState {
  const rt = boardRuntime(boardId);
  let rosterPlayers = DEFAULT_PLAYERS;
  try {
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    rosterPlayers = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_PLAYERS;

    if (rt.dataVersionKey) {
      const storedVersion = localStorage.getItem(rt.dataVersionKey);
      if (storedVersion !== String(rt.dataVersion)) {
        localStorage.setItem(rt.dataVersionKey, String(rt.dataVersion));
        localStorage.removeItem(rt.storageKey);
        return migrateCatalog(boardId, {
          ...DEFAULT_CORE,
          ...emptyGrid(boardId),
          players: rosterPlayers,
          donationLog: loadSharedDonationLog(),
        });
      }
    }

    const stored = localStorage.getItem(rt.storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (boardId === 1 && parsed.dataVersion !== rt.dataVersion) {
        return migrateCatalog(boardId, {
          ...DEFAULT_CORE,
          ...emptyGrid(boardId),
          players: rosterPlayers,
          dataVersion: rt.dataVersion,
          donationLog: loadSharedDonationLog(),
        });
      }
      return migrateCatalog(boardId, {
        ...parsed,
        players: rosterPlayers,
        donationLog: normalizeDonationLog(parsed.donationLog) ?? loadSharedDonationLog(),
        activeQuizCard: parsed.activeQuizCard ?? null,
        currentTurnSeat: Number.isInteger(parsed.currentTurnSeat)
          ? ((Number(parsed.currentTurnSeat) % 5) + 5) % 5
          : 0,
        quizBoardHoverCell:
          parsed.quizBoardHoverCell &&
          typeof parsed.quizBoardHoverCell.themeIndex === "number" &&
          typeof parsed.quizBoardHoverCell.questionIndex === "number"
            ? parsed.quizBoardHoverCell
            : null,
        hideDonationsTableOnBoard3:
          typeof parsed.hideDonationsTableOnBoard3 === "boolean"
            ? parsed.hideDonationsTableOnBoard3
            : false,
        /** Титры не восстанавливаем из localStorage — только по кнопке «Титры». */
        creditsRollActive: false,
        creditsRollStartedAt: undefined,
        /** Доска 4: фаза крестиков-ноликов только по relay, иначе при заходе на /4/ сначала показывались нолики из LS. */
        superTtt: boardId === 4 ? null : (parsed as GameState).superTtt ?? null,
        superTttWinner: boardId === 4 ? null : (parsed as GameState).superTttWinner ?? null,
        /** Не `null`: иначе первый hostQuizRelay после загрузки затирал бы серверный seat открывшего ключевую клетку. */
        superBoardFourKeyOpenerSeat: undefined,
      });
    }
  } catch (err) {
    console.error("Failed to load state", err);
  }
  if (boardId === 1) {
    return migrateCatalog(boardId, {
      ...DEFAULT_CORE,
      ...emptyGrid(boardId),
      players: rosterPlayers,
      dataVersion: rt.dataVersion,
      donationLog: loadSharedDonationLog(),
    });
  }
  return migrateCatalog(boardId, {
    ...DEFAULT_CORE,
    ...emptyGrid(boardId),
    players: rosterPlayers,
    donationLog: loadSharedDonationLog(),
  });
}

function isHostRole(): boolean {
  if (typeof localStorage === "undefined") return false;
  const r = localStorage.getItem("player_role")?.trim().toLowerCase();
  return r === "host";
}

const TRACK_KEYS: Record<AdeptsBoardId, string> = {
  1: "adepts-game",
  2: "adepts-game-2",
  3: "adepts-game-3",
  4: "adepts-game-4",
};

export function useGameState(boardId: AdeptsBoardId) {
  const rt = boardRuntime(boardId);
  const [state, setState] = useState<GameState>(() => loadInitialState(boardId));
  const [catalogReady, setCatalogReady] = useState(false);

  const skipEmitRef = useRef(false);
  const catalogRef = useRef<AdeptsQuizBoardPayload | null>(null);
  const pendingCatalogEmitRef = useRef(false);
  const allowQuizPushRef = useRef(false);

  useEffect(() => {
    fetchAdeptsQuizBoard(boardId)
      .then((board) => {
        catalogRef.current = board;
        setState((prev) =>
          migrateCatalog(boardId, {
            ...prev,
            themes: board.themes,
            questions: mergeBoardWithUsed(board, prev.questions),
          })
        );
        setCatalogReady(true);
      })
      .catch((err) => {
        console.error("Failed to load quiz board from API", err);
        setCatalogReady(true);
      });
  }, [boardId]);

  const adeptsSocketKey = getAdeptsCommandSocketClientKey();

  useEffect(() => {
    const socket = getAdeptsCommandSocket();

    const onConnect = () => {
      allowQuizPushRef.current = isHostRole();
      socket.emit("requestAdeptsSync");
    };
    const onDisconnect = () => {
      if (!isHostRole()) allowQuizPushRef.current = false;
    };

    const applyQuizIncoming = (incoming: unknown) => {
      allowQuizPushRef.current = isHostRole();
      if (!incoming || typeof incoming !== "object") return;
      const rec = incoming as Record<string, unknown>;
      const basePlayers = Array.isArray(rec["players"]) && (rec["players"] as Player[]).length
        ? (rec["players"] as Player[])
        : DEFAULT_PLAYERS;
      const { merged, hadRoster } = mergeSeatRosterIntoQuizPlayers([...basePlayers]);
      const hostResetTurn =
        hadRoster && typeof localStorage !== "undefined" && isHostRole();
      const isSameBoard = rec["boardRoom"] === getAdeptsSessionId();
      const cat = catalogRef.current;

      /**
       * All boards share the same socket room ("adepts-game"). A relay tagged with a different
       * `boardId` was emitted by a client on another board — strip every board-specific field
       * (catalog, questionUsedGrid, activeQuizCard, hover, dataVersion) so it cannot overwrite
       * this board's themes/questions/used-state/open-card. Cross-board fields (players, turn)
       * are still applied so scores stay in sync during a round transition.
       */
      const relayBoardId = typeof rec["boardId"] === "number" ? rec["boardId"] : null;
      const boardMismatch = relayBoardId !== null && relayBoardId !== boardId;
      const recToUse: Record<string, unknown> = boardMismatch
        ? {
            boardRoom: rec["boardRoom"],
            boardId: rec["boardId"],
            players: rec["players"],
            currentTurnSeat: rec["currentTurnSeat"],
            donationLog: rec["donationLog"],
            hideDonationsTableOnBoard3: rec["hideDonationsTableOnBoard3"],
            // Reset all board-specific fields to safe defaults
            activeQuizCard: null,
            quizBoardHoverCell: null,
            questionUsedGrid: undefined,
            catalogIncluded: false,
            superTtt: null,
            superTttWinner: null,
            superBoardFourKeyOpenerSeat: null,
          }
        : rec;

      setState((prev) => {
        const { themes, questions, receivedCatalog } = deriveThemesAndQuestionsFromQuizIncoming(
          recToUse,
          prev,
          cat,
          isSameBoard
        );
        if (receivedCatalog) {
          catalogRef.current = receivedCatalog;
        }

        const rawTurn = recToUse["currentTurnSeat"];
        const incomingTurn =
          typeof rawTurn === "number"
            ? rawTurn
            : typeof rawTurn === "string"
              ? Number(rawTurn)
              : NaN;
        const relayTurn =
          Number.isInteger(incomingTurn) ? ((incomingTurn % 5) + 5) % 5 : null;

        const rawCard = (recToUse["activeQuizCard"] as GameState["activeQuizCard"]) ?? null;
        let hoverFromRelay: GameState["quizBoardHoverCell"] =
          recToUse["quizBoardHoverCell"] !== undefined
            ? (recToUse["quizBoardHoverCell"] as GameState["quizBoardHoverCell"])
            : prev.quizBoardHoverCell;
        if (
          rawCard &&
          hoverFromRelay &&
          typeof hoverFromRelay === "object" &&
          hoverFromRelay.themeIndex === rawCard.themeIndex &&
          hoverFromRelay.questionIndex === rawCard.questionIndex
        ) {
          hoverFromRelay = null;
        }

        const incomingLog = normalizeDonationLog(recToUse["donationLog"]);
        const nextDonationLog = incomingLog ?? prev.donationLog;

        const rawHide = recToUse["hideDonationsTableOnBoard3"];
        const nextHideDonationsTableOnBoard3 =
          typeof rawHide === "boolean" ? rawHide : (prev.hideDonationsTableOnBoard3 ?? false);

        const rawSuperT = recToUse["superTtt"];
        const rawSuperW = recToUse["superTttWinner"];
        const nextSuperTtt: GameState["superTtt"] =
          boardId !== 4
            ? null
            : boardMismatch
              ? null
              : rawSuperT !== undefined
                ? (rawSuperT as GameState["superTtt"])
                : prev.superTtt ?? null;
        const nextSuperWinner: GameState["superTttWinner"] =
          boardId !== 4
            ? null
            : boardMismatch
              ? null
              : rawSuperW !== undefined
                ? (rawSuperW as GameState["superTttWinner"])
                : prev.superTttWinner ?? null;

        const rawKeyOp = recToUse["superBoardFourKeyOpenerSeat"];
        let nextKeyOpener: GameState["superBoardFourKeyOpenerSeat"];
        if (boardId !== 4) {
          nextKeyOpener = undefined;
        } else if (boardMismatch) {
          nextKeyOpener = null;
        } else if (rawKeyOp !== undefined) {
          if (rawKeyOp === null) {
            nextKeyOpener = null;
          } else if (typeof rawKeyOp === "number" && Number.isInteger(rawKeyOp)) {
            const n = Math.floor(rawKeyOp);
            nextKeyOpener = n >= 0 && n <= 4 ? ((n % 5) + 5) % 5 : prev.superBoardFourKeyOpenerSeat;
          } else {
            nextKeyOpener = prev.superBoardFourKeyOpenerSeat;
          }
        } else {
          nextKeyOpener = prev.superBoardFourKeyOpenerSeat;
        }

        const creditsBoard = boardId === 3 || boardId === 4;
        const nextCredits =
          !creditsBoard
            ? { creditsRollActive: false, creditsRollStartedAt: undefined as number | undefined }
            : boardMismatch
              ? {
                  /** Relay с другой доски: титры не переносим; сервер уже сбросил credits. */
                  creditsRollActive: false,
                  creditsRollStartedAt: undefined,
                }
              : (() => {
                  const active = recToUse["creditsRollActive"] === true;
                  const rawAt = recToUse["creditsRollStartedAt"];
                  const at =
                    typeof rawAt === "number" && Number.isFinite(rawAt)
                      ? Math.floor(rawAt)
                      : active
                        ? prev.creditsRollStartedAt
                        : undefined;
                  return {
                    creditsRollActive: active,
                    creditsRollStartedAt: active ? at : undefined,
                  };
                })();

        let nextState = withClosedActiveQuizIfCellUsed(
          migrateCatalog(boardId, {
            ...prev,
            boardRoom: typeof recToUse["boardRoom"] === "string" ? recToUse["boardRoom"] : prev.boardRoom,
            themes,
            questions,
            players: merged,
            donationLog: nextDonationLog,
            activeQuizCard: rawCard,
            // Relay is authoritative: never let host+Roster merge stomp server `currentTurnSeat`.
            currentTurnSeat:
              relayTurn !== null ? relayTurn : hostResetTurn ? 0 : prev.currentTurnSeat,
            quizBoardHoverCell: hoverFromRelay,
            dataVersion:
              typeof recToUse["dataVersion"] === "number" ? recToUse["dataVersion"] : prev.dataVersion,
            hideDonationsTableOnBoard3: nextHideDonationsTableOnBoard3,
            creditsRollActive: nextCredits.creditsRollActive,
            creditsRollStartedAt: nextCredits.creditsRollStartedAt,
            superTtt: nextSuperTtt,
            superTttWinner: nextSuperWinner,
            superBoardFourKeyOpenerSeat: nextKeyOpener,
          })
        );

        const closeAfterWheel = consumeAdeptsWheelReturnCloseQuizCardFlag();
        let stateToApply = closeAfterWheel
          ? { ...nextState, activeQuizCard: null, quizBoardHoverCell: null }
          : nextState;

        if (boardId === 4) {
          const row0 = stateToApply.questions[0];
          const fourPrizeCardsDone =
            Array.isArray(row0) &&
            row0.length >= 4 &&
            row0.slice(0, 4).every((q) => q.used === true);
          if (!fourPrizeCardsDone && stateToApply.superTtt) {
            stateToApply = { ...stateToApply, superTtt: null, superTttWinner: null };
          }
        }

        const rebroadcast = closeAfterWheel || hadRoster;
        skipEmitRef.current = true;
        if (rebroadcast) {
            queueMicrotask(() => {
            getAdeptsCommandSocket().emit("command", {
              type: "hostQuizRelay",
              payload: buildAdeptsQuizRelayPayload(stateToApply, getAdeptsSessionId(), false, boardId),
            });
          });
        }
        return stateToApply;
      });
    };

    const onAdeptsSync = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const quiz = (payload as Record<string, unknown>)["quiz"];
      if (quiz && typeof quiz === "object") applyQuizIncoming(quiz);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sync", onAdeptsSync);

    if (socket.connected) {
      allowQuizPushRef.current = isHostRole();
      socket.emit("requestAdeptsSync");
    }

    /** `lobbyState` пишет ростер в sessionStorage после первого sync — без повторного sync merge имён не случится. */
    const onAssignments = () => {
      if (socket.connected) socket.emit("requestAdeptsSync");
    };
    window.addEventListener(ADEPTS_QUIZ_ASSIGNMENTS_EVENT, onAssignments);

    return () => {
      window.removeEventListener(ADEPTS_QUIZ_ASSIGNMENTS_EVENT, onAssignments);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sync", onAdeptsSync);
    };
  }, [boardId, adeptsSocketKey]);

  /**
   * Ведущий перешёл с доски 4 на другую (не cleanup размонтирования — иначе Strict Mode сбрасывал игру при входе на /4/).
   * Чистим LS доски 4 и шлём board4LeaveReset, чтобы следующий заход снова с карточек.
   */
  useEffect(() => {
    const LAST_QUIZ_BOARD_KEY = "adepts-last-open-quiz-board";
    try {
      const prev = sessionStorage.getItem(LAST_QUIZ_BOARD_KEY);
      sessionStorage.setItem(LAST_QUIZ_BOARD_KEY, String(boardId));
      if (prev !== "4" || boardId === 4) return;
      if (!isHostRole()) return;
      const storageKey = boardRuntime(4).storageKey;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        const next: GameState = {
          ...parsed,
          superTtt: null,
          superTttWinner: null,
          superBoardFourKeyOpenerSeat: null,
          activeQuizCard: null,
          quizBoardHoverCell: null,
        };
        if (Array.isArray(next.questions?.[0])) {
          next.questions = next.questions.map((row, ti) =>
            ti === 0 ? row.map((q, qi) => (qi < 4 ? { ...q, used: false } : q)) : row,
          );
        }
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      getAdeptsCommandSocket().emit("command", { type: "board4LeaveReset" });
    } catch (err) {
      console.error("board4 leave after navigation", err);
    }
  }, [boardId]);

  useEffect(() => {
    const persisted: GameState =
      boardId === 3 || boardId === 4
        ? { ...state, creditsRollActive: false, creditsRollStartedAt: undefined }
        : state;
    localStorage.setItem(rt.storageKey, JSON.stringify(persisted));
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(state.players));
    localStorage.setItem(DONATION_LOG_KEY, JSON.stringify(state.donationLog));

    /** Consume before `catalogReady` / `allowQuizPush` returns — otherwise skip stays true and a later `hostQuizRelay` can stomp relay (host pick then no modal). */
    const skipThisCommit = skipEmitRef.current;
    if (skipThisCommit) skipEmitRef.current = false;

    if (!catalogReady) return;
    if (!allowQuizPushRef.current) return;
    if (skipThisCommit) return;

    const includeCatalog = pendingCatalogEmitRef.current;
    pendingCatalogEmitRef.current = false;
    getAdeptsCommandSocket().emit("command", {
      type: "hostQuizRelay",
      payload: buildAdeptsQuizRelayPayload(state, getAdeptsSessionId(), includeCatalog, boardId),
    });
  }, [state, catalogReady, rt.storageKey, boardId]);

  useEffect(() => {
    const storageKey = rt.storageKey;
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          skipEmitRef.current = true;
          const parsed = JSON.parse(e.newValue) as GameState;
          if (boardId === 3 || boardId === 4) {
            parsed.creditsRollActive = false;
            parsed.creditsRollStartedAt = undefined;
          }
          setState(parsed);
        } catch {}
      }
      if (e.key === PLAYERS_KEY && e.newValue) {
        try {
          const players = JSON.parse(e.newValue);
          skipEmitRef.current = true;
          setState((prev) => ({ ...prev, players }));
        } catch {}
      }
      if (e.key === DONATION_LOG_KEY && e.newValue) {
        try {
          const d = normalizeDonationLog(JSON.parse(e.newValue));
          if (d) {
            skipEmitRef.current = true;
            setState((prev) => ({ ...prev, donationLog: d }));
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [rt.storageKey]);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev };
      next.players = [...prev.players];
      next.players[index] = { ...next.players[index], name };
      return next;
    });
  }, []);

  const updatePlayerScore = useCallback((index: number, score: number) => {
    setState((prev) => {
      const next = { ...prev };
      next.players = [...prev.players];
      next.players[index] = { ...next.players[index], score };
      return next;
    });
  }, []);

  const updateThemeName = useCallback(
    async (index: number, name: string) => {
      if (!isHostRole()) return;
      try {
        const board = await patchAdeptsQuizTheme(boardId, index, name);
        catalogRef.current = board;
        pendingCatalogEmitRef.current = true;
        setState((prev) => ({
          ...prev,
          themes: board.themes,
          questions: mergeBoardWithUsed(board, prev.questions),
        }));
      } catch (e) {
        console.error(e);
      }
    },
    [boardId]
  );

  const updateQuestion = useCallback(
    async (themeIndex: number, questionIndex: number, data: Partial<Question>) => {
      if (!isHostRole()) return;
      const { used, ...catalogPatch } = data;
      let board: AdeptsQuizBoardPayload | null = null;
      if (Object.keys(catalogPatch).length > 0) {
        try {
          board = await patchAdeptsQuizQuestion(boardId, themeIndex, questionIndex, catalogPatch);
        } catch (e) {
          console.error(e);
          return;
        }
      }
      setState((prev) => {
        let themes = prev.themes;
        let questions = prev.questions;
        if (board) {
          catalogRef.current = board;
          pendingCatalogEmitRef.current = true;
          themes = board.themes;
          questions = mergeBoardWithUsed(board, prev.questions);
        }
        if (used !== undefined) {
          questions = questions.map((row, tIdx) =>
            tIdx === themeIndex
              ? row.map((q, qIdx) =>
                  qIdx === questionIndex ? { ...q, used } : q
                )
              : row
          );
        }
        return withClosedActiveQuizIfCellUsed({ ...prev, themes, questions });
      });
    },
    [boardId]
  );

  const resetScores = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({ ...p, score: 0 })),
    }));
  }, []);

  const setActiveQuizCard = useCallback((card: GameState["activeQuizCard"]) => {
    setState((prev) => ({ ...prev, activeQuizCard: card }));
  }, []);

  const setCurrentTurnSeat = useCallback((seat: number) => {
    const normalized = ((Number(seat) % 5) + 5) % 5;
    setState((prev) => ({ ...prev, currentTurnSeat: normalized }));
  }, []);

  const patchActiveQuizCard = useCallback(
    (
      patch: Partial<NonNullable<GameState["activeQuizCard"]>>,
      relayOpts?: { nextTurnSeat?: number },
    ) => {
      const RELAY_KEYS = new Set<string>([
        "splashDismissed",
        "splashDedFlyExitStarted",
        "splashPassHoverSeat",
        "splashSeatPassUsed",
      ]);
      const keys = Object.keys(patch);
      const onlyRelaySplash = keys.length > 0 && keys.every((k) => RELAY_KEYS.has(k));

      setState((prev) => {
        if (!prev.activeQuizCard) return prev;
        const nextCard = { ...prev.activeQuizCard, ...patch };
        const nextTurnRaw = relayOpts?.nextTurnSeat;
        const hasNext =
          nextTurnRaw !== undefined && Number.isFinite(Number(nextTurnRaw));
        const nextTurnSeat = hasNext
          ? ((Math.floor(Number(nextTurnRaw)) % 5) + 5) % 5
          : prev.currentTurnSeat;
        return {
          ...prev,
          activeQuizCard: nextCard,
          ...(hasNext ? { currentTurnSeat: nextTurnSeat } : {}),
        };
      });

      if (!isHostRole()) {
        const emitPatch: Record<string, unknown> = {};
        for (const k of keys) {
          if (RELAY_KEYS.has(k)) {
            emitPatch[k] = (patch as Record<string, unknown>)[k];
          }
        }
        const nextTurnRaw = relayOpts?.nextTurnSeat;
        const hasNextEmit =
          nextTurnRaw !== undefined && Number.isFinite(Number(nextTurnRaw));
        if (onlyRelaySplash || hasNextEmit) {
          const cmd: Record<string, unknown> = { type: "activeQuizPatch", patch: emitPatch };
          if (hasNextEmit) {
            cmd.nextTurnSeat = ((Math.floor(Number(nextTurnRaw)) % 5) + 5) % 5;
          }
          if (Object.keys(emitPatch).length > 0 || hasNextEmit) {
            getAdeptsCommandSocket().emit("command", cmd);
          }
        }
      }
    },
    []
  );

  const setQuizBoardHoverCell = useCallback((cell: QuizBoardHoverCell) => {
    setState((prev) => ({ ...prev, quizBoardHoverCell: cell }));
    if (!isHostRole()) {
      getAdeptsCommandSocket().emit("command", { type: "hostSetHover", cell });
    }
  }, []);

  const resetGame = useCallback(() => {
    setState((prev) =>
      migrateCatalog(boardId, {
        ...DEFAULT_CORE,
        themes: catalogRef.current?.themes ?? prev.themes,
        questions: (catalogRef.current?.questions ?? prev.questions).map((row) =>
          row.map((q) => ({ ...q, used: false }))
        ),
        players: DEFAULT_PLAYERS.map((p) => ({ ...p })),
        dataVersion: rt.dataVersion,
        boardRoom: getAdeptsSessionId(),
        donationLog: Array.isArray(prev.donationLog) ? [...prev.donationLog] : [...DEFAULT_DONATION_LOG],
        superTtt: null,
        superTttWinner: null,
        superBoardFourKeyOpenerSeat: null,
      })
    );
  }, [boardId, rt.dataVersion]);

  /** Pass `turnSeat` from the board when the clicker is host — avoids stale `useCallback` state vs `localStorage` host flag. */
  const submitPlayerDonation = useCallback((amount: number) => {
    getAdeptsCommandSocket().emit("command", { type: "playerDonation", amount });
  }, []);

  const setCreditsRoll = useCallback(
    (active: boolean) => {
      if ((boardId !== 3 && boardId !== 4) || !isHostRole()) return;
      setState((prev) => ({
        ...prev,
        creditsRollActive: active,
        creditsRollStartedAt: active ? Date.now() : undefined,
      }));
    },
    [boardId],
  );

  const emitSuperTttPick = useCallback((cellIndex: number) => {
    skipEmitRef.current = true;
    getAdeptsCommandSocket().emit("command", {
      type: "superTttPick",
      cellIndex,
      seat: readAdeptsPlayerSeatIndexForSocket(),
    });
  }, []);

  const emitSuperTttResetBoard = useCallback(() => {
    skipEmitRef.current = true;
    getAdeptsCommandSocket().emit("command", { type: "superTttResetBoard" });
  }, []);

  const emitCloseSuperGameCard = useCallback((themeIndex: number, questionIndex: number) => {
    skipEmitRef.current = true;
    getAdeptsCommandSocket().emit("command", {
      type: "closeSuperGameCard",
      themeIndex,
      questionIndex,
      seat: readAdeptsPlayerSeatIndexForSocket(),
    });
  }, []);

  const emitPickCell = useCallback(
    (themeIndex: number, questionIndex: number, opts?: { turnSeat?: number }) => {
      /**
       * Host: `Home` clears hover then calls here; batched `setState` runs the persist effect before `sync`
       * returns. Without this, `hostQuizRelay` goes out with stale relay (no card) and can overwrite `pickCell`
       * on the server — players never push relay, so only the host saw the bug.
       */
      skipEmitRef.current = true;
      const raw = opts?.turnSeat;
      const seatForCmd =
        raw !== undefined && Number.isFinite(Number(raw))
          ? ((Math.floor(Number(raw)) % 5) + 5) % 5
          : readAdeptsPlayerSeatIndexForSocket();
      getAdeptsCommandSocket().emit("command", {
        type: "pickCell",
        themeIndex,
        questionIndex,
        seat: seatForCmd,
      });
    },
    []
  );

  return {
    catalogReady,
    state,
    trackKey: TRACK_KEYS[boardId],
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
    setActiveQuizCard,
    setCurrentTurnSeat,
    patchActiveQuizCard,
    setQuizBoardHoverCell,
    resetGame,
    emitPickCell,
    emitSuperTttPick,
    emitSuperTttResetBoard,
    emitCloseSuperGameCard,
    submitPlayerDonation,
    setCreditsRoll,
  };
}
