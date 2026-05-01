import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, Question } from "@/lib/adepts-quiz-types";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import { mergeSeatRosterIntoQuizPlayers } from "@/lib/quizLobbyClientAssignments";

export type { Player, Question };

export type ActiveQuizCard = {
  themeIndex: number;
  questionIndex: number;
  stage: "question" | "answer";
  /** Клик ведущего / ходящего по вылетающему еноту — синхронно всем клиентам */
  splashDismissed?: boolean;
  /** После передачи хода по еноту — один раз за открытую карточку, для всех клиентов */
  splashSeatPassUsed?: boolean;
  /** Подсветка цели передачи хода (место 0–4), синхронно всем; null — нет наведения */
  splashPassHoverSeat?: number | null;
};

export type GameState = {
  players: Player[];
  themes: string[];
  questions: Question[][];
  /** Открытая карточка квиза — синхронизируется с зрителем по /quiz */
  activeQuizCard: ActiveQuizCard | null;
  /** Текущий ход: индекс места игрока 0..4 */
  currentTurnSeat: number;
  /** Подсветка ячейки доски под курсором ведущего / игрока с ходом */
  quizBoardHoverCell?: QuizBoardHoverCell;
  dataVersion?: number;
  /** Идентификатор доски — проверяется в sync-обработчике для отклонения данных чужой доски */
  boardRoom?: string;
};

const DEFAULT_STATE: GameState = {
  activeQuizCard: null,
  currentTurnSeat: 0,
  quizBoardHoverCell: null,
  players: Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    score: 0,
  })),
  themes: [
    "Боссы",
    "Пасхалки",
    "Цитаты и Фразы",
    "Лор WOW",
    "Всратый косплей",
    "Халява",
    "Локации",
    "Профессии",
  ],
  questions: [
    // Боссы
    [
      { text: "Что это за босс?", questionUrl: "/bossy-100.mp4", answerText: "Ониксия", answerUrl: "/bossy-100-answer.jpg", used: false },
      { text: "В битве с этим боссом лучше лишний раз не шуметь, чтобы не дать себя обнаружить.", questionUrl: "", answerText: "Атрамед", answerUrl: "/bossy-200-answer.jpg", used: false },
      { text: "Назовите босса, бывшего нам союзника, который перед впадением в безумие бафает рейд, чтобы рейду было проще с ним справиться.", questionUrl: "", answerText: "Валестраз", answerUrl: "/bossy-300-answer.webp", used: false },
      { text: "Назовите этого босса?", questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/945708-controlling-the-elements.jpg", answerText: "Ал'акир", answerUrl: "", used: false },
      { text: "Жители Даларана! Поднимите глаза и взгляните на это небо!\nЕсли вы это слышите, значит кто-то победил...", questionUrl: "", answerText: "Алгалона", answerUrl: "/bossy-500-answer.jpg", used: false, splashUrl: "/raccoon.png" },
    ],
    // Пасхалки
    [
      { text: "Имя этого NPC — гибрид имени актёра Харрисона Форда и его героя Индианы Джонса. Вся цепочка квестов в Ульдуме с его участием копирует сцены из фильмов про знаменитого археолога.", questionUrl: "", answerText: "Харрисон Джонс", answerUrl: "/pashalki-100-answer.jpg", used: false, splashUrl: "/raccoon.png" },
      { text: "В ЛБРС рука робота около лавы — к чему эта пасхалка?", questionUrl: "", answerText: "Терминатор 2", answerUrl: "/pashalki-200-answer.jpg", used: false },
      { text: "", questionUrl: "/pashalki-300-question.mp4", answerText: "Вы получаете 3 крутки Колеса Адептов", answerUrl: "/freebie-400-question.png", used: false },
      { text: "На одном из островов в Низине Шолазар находится люк с выбитыми на нём цифрами 5, 9, 16, 17, 24, 43. Это почти точная копия загадочного люка из сериала. Назовите сериал?", questionUrl: "", answerText: "Остаться в живых (Lost)", answerUrl: "/pashalki-400-answer.jpg", used: false },
      { text: "Эта иконка является «плейсхолдером» иконок некоторых скилов в старых версиях WoW. Вопрос: кто на ней изображён?", questionUrl: "https://wow.zamimg.com/images/wow/icons/large/classic_temp.jpg", answerText: "Сэмуайз Дидье — арт-директор Blizzard Entertainment (бывший, проработал там почти с основания компании и до 2023 года)", answerUrl: "/pashalki-500-answer.jpg", used: false },
    ],
    // Цитаты и Фразы
    [
      { text: "Кто это говорит?\n«Вы не готовы!»", questionUrl: "", answerText: "Иллидан", answerUrl: "/vy-ne-gotovy.mp4", used: false },
      { text: "Продолжите цитату:\nAllright chamss. Let's do this, [...]", questionUrl: "", answerText: "LEEEEROY JANKINS", answerUrl: "/leeroy.mp4", used: false },
      { text: "Разрешите доебаться... (с)", questionUrl: "", answerText: "Джентельменыч", answerUrl: "/razreshite.mp4", used: false },
      { text: "Закончите уравнение:\n3x³ + [...]", questionUrl: "", answerText: "const... ну что там?", answerUrl: "/3x3.mp4", used: false },
      { text: "Закончите цитату:\nYou think you do, [...]", questionUrl: "", answerText: "but you don't.", answerUrl: "/you-think.mp4", used: false },
    ],
    // Лор WOW
    [
      { text: "Как назывался единый континент на Азероте до Великого Раскола?", questionUrl: "", answerText: "Калимдор", answerUrl: "/lor-wow-100-answer.webp", used: false, headerUrl: "/wheel.png" },
      { text: "Чем закончилась Первая война против орды?", questionUrl: "", answerText: "Разрушением Штормграда", answerUrl: "/lor-wow-200-answer.jpg", used: false },
      { text: "Какого известного персонажа победил Артас перед тем, как взобраться на Ледяную Корону?", questionUrl: "", answerText: "Иллидан", answerUrl: "/lor-wow-300-answer.jpg", used: false },
      { text: "Почти на всех мирах существовали духи стихии: воды, огня, воздуха, земли. Но не первобытный Дренор. Каким элементом он был пропитан?", questionUrl: "", answerText: "Дух Жизни", answerUrl: "/lor-wow-400-answer.webp", used: false },
      { text: "Какое событие изображено на картинке?", questionUrl: "https://warcraft-wiki.ru/images/thumb/2/20/Chronicle3_Bolvar_and_Dranosh.jpg/450px-Chronicle3_Bolvar_and_Dranosh.jpg", answerText: "Битва у Врат Гнева", answerUrl: "", used: false, splashUrl: "/raccoon.png" },
    ],
    // Всратый косплей
    [
      { text: "", questionUrl: "/cosplay-100-question.jpg", answerText: "", answerUrl: "/cosplay-100-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-200-question.jpg", answerText: "", answerUrl: "/cosplay-200-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-300-question.jpg", answerText: "", answerUrl: "/cosplay-300-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-400-question.jpg", answerText: "", answerUrl: "/cosplay-400-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-500-question.jpg", answerText: "Ауриайя", answerUrl: "/cosplay-500-answer.jpg", used: false },
    ],
    // Халява
    [
      { text: "100", questionUrl: "", answerText: "100", answerUrl: "", used: false },
      { text: "200", questionUrl: "", answerText: "200", answerUrl: "", used: false },
      { text: "300", questionUrl: "", answerText: "300", answerUrl: "", used: false, splashUrl: "/raccoon.png" },
      { text: "", questionUrl: "/freebie-400-question.mp4", answerText: "Вы получаете 3 крутки Колеса Адептов", answerUrl: "/freebie-400-question.png", used: false },
      { text: "Ящик Пандоры", questionUrl: "/halyava-500-question.mp4", answerText: "", answerUrl: "", used: false },
    ],
    // Локации
    [
      { text: "В какой локации расположен вход в легендарное подземелье «Огненные Недра» (Molten Core)?", questionUrl: "", answerText: "Чёрная гора", answerUrl: "/locations-200-answer.jpg", used: false },
      { text: "Как называется город-крепость, который служит главной столицей Орды в Калимдоре?", questionUrl: "", answerText: "Оргриммар", answerUrl: "/locations-100-answer.jpg", used: false },
      { text: "Как называлось Мировое древо, у которого располагалась столица ночных эльфов Дарнас?", questionUrl: "", answerText: "Тельдрасил", answerUrl: "/locations-300-answer.webp", used: false },
      { text: "Через какой перевал в Восточных королевствах можно попасть в локацию Болото Печали, если идти из Сумеречного леса?", questionUrl: "", answerText: "Перевал мёртвого ветра", answerUrl: "/locations-400-answer.jpg", used: false },
      { text: "В какой локации Пандарии игроки могли выращивать собственные овощи и строить отношения с фракцией Земледельцев?", questionUrl: "", answerText: "Ферма солнечной песни", answerUrl: "/locations-500-answer.webp", used: false },
    ],
    // Профессии
    [
      { text: "«Гоблинская» и «Гномская» — о какой профессии идёт речь?", questionUrl: "", answerText: "Инженерия", answerUrl: "/professions-100-answer.png", used: false },
      { text: "Обладатели какой профессии могли изготавливать волшебные масла?", questionUrl: "", answerText: "Наложение чар", answerUrl: "/professions-200-answer.png", used: false, splashUrl: "/raccoon.png" },
      { text: "Какая новая профессия появилась в WotLK?", questionUrl: "", answerText: "Начертание", answerUrl: "/professions-300-answer.png", used: false },
      { text: "С помощью какой профессии призывался один из боссов в дополнении TBC?", questionUrl: "", answerText: "Рыбалка", answerUrl: "/professions-400-answer.png", used: false },
      { text: "Сколько специализаций в кузнечном деле было в TBC? Бонус: назовите их.", questionUrl: "", answerText: "4: бронник, оружейник-мечи, оружейник-булавы, оружейник-топоры.", answerUrl: "/professions-500-answer.png", used: false },
    ],
  ],
};

const STORAGE_KEY = "adepts-game-state";
const PLAYERS_KEY = "adepts-shared-players";
const DATA_VERSION = 58;
const ROOM = "adepts-game";

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

  // Лор WOW 100 — иконка колеса в шапке карточки (старые сохранения без headerUrl)
  if (nextQuestions[3]?.[0]) {
    nextQuestions[3][0] = {
      ...nextQuestions[3][0],
      headerUrl: "/wheel.png",
    };
  }

  return { ...state, questions: nextQuestions };
}

function loadInitialState(): GameState {
  try {
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    const players = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_STATE.players;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.dataVersion !== DATA_VERSION) {
        return restoreLegacyWheelCards({ ...DEFAULT_STATE, players, dataVersion: DATA_VERSION });
      }
      return restoreLegacyWheelCards({
        ...parsed,
        players,
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
      });
    }
  } catch (err) {
    console.error("Failed to load state", err);
  }
  return restoreLegacyWheelCards({ ...DEFAULT_STATE, dataVersion: DATA_VERSION });
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadInitialState);

  const socketRef = useRef<Socket | null>(null);
  const skipEmitRef = useRef(false);

  // Connect to Socket.io /quiz namespace for real-time sync
  useEffect(() => {
    const socket = io("/quiz", {
      path: "/socket.io",
      query: { room: ROOM },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("sync", (incoming: GameState) => {
      const basePlayers = incoming.players?.length ? incoming.players : DEFAULT_STATE.players;
      const { merged, hadRoster } = mergeSeatRosterIntoQuizPlayers([...basePlayers]);
      const hostResetTurn =
        hadRoster &&
        typeof localStorage !== "undefined" &&
        localStorage.getItem("player_role") === "host";
      const isSameBoard = incoming.boardRoom === ROOM;
      const nextState = restoreLegacyWheelCards({
        ...incoming,
        themes: isSameBoard ? (incoming.themes ?? DEFAULT_STATE.themes) : DEFAULT_STATE.themes,
        players: merged,
        activeQuizCard: incoming.activeQuizCard ?? null,
        currentTurnSeat: hostResetTurn
          ? 0
          : Number.isInteger(incoming.currentTurnSeat)
            ? ((Number(incoming.currentTurnSeat) % 5) + 5) % 5
            : 0,
        questions: DEFAULT_STATE.questions.map((themeQs, tIdx) =>
          themeQs.map((defaultQ, qIdx) => ({
            ...defaultQ,
            used: isSameBoard
              ? (incoming.questions?.[tIdx]?.[qIdx]?.used ?? defaultQ.used)
              : defaultQ.used,
          }))
        ),
      });
      skipEmitRef.current = true;
      setState(nextState);
      if (hadRoster) {
        skipEmitRef.current = false;
        queueMicrotask(() => socketRef.current?.emit("update", { ...nextState, boardRoom: ROOM }));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Save to localStorage and emit to server on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(state.players));

    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      return;
    }

    socketRef.current?.emit("update", { ...state, boardRoom: ROOM });
  }, [state]);

  // Cross-tab sync via StorageEvent (same machine, different tabs)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          skipEmitRef.current = true;
          setState(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === PLAYERS_KEY && e.newValue) {
        try {
          const players = JSON.parse(e.newValue);
          skipEmitRef.current = true;
          setState(prev => ({ ...prev, players }));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

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

  const updateThemeName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev };
      next.themes = [...prev.themes];
      next.themes[index] = name;
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (themeIndex: number, questionIndex: number, data: Partial<Question>) => {
      setState((prev) => {
        const next = { ...prev };
        next.questions = prev.questions.map((theme, tIdx) =>
          tIdx === themeIndex
            ? theme.map((q, qIdx) =>
                qIdx === questionIndex ? { ...q, ...data } : q
              )
            : theme
        );
        return next;
      });
    },
    []
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
    (patch: Partial<NonNullable<GameState["activeQuizCard"]>>) => {
      setState((prev) => {
        if (!prev.activeQuizCard) return prev;
        return { ...prev, activeQuizCard: { ...prev.activeQuizCard, ...patch } };
      });
    },
    []
  );

  const setQuizBoardHoverCell = useCallback((cell: QuizBoardHoverCell) => {
    setState((prev) => ({ ...prev, quizBoardHoverCell: cell }));
  }, []);

  const resetGame = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
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
  };
}
