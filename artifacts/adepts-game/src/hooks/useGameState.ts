import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type Question = {
  text: string;
  questionUrl: string;
  answerText: string;
  answerUrl: string;
  used: boolean;
};

export type GameState = {
  players: Player[];
  themes: string[];
  questions: Question[][];
  dataVersion?: number;
};

const DEFAULT_STATE: GameState = {
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
      { text: "Жители Даларана! Поднимите глаза и взгляните на это небо!\nЕсли вы это слышите, значит кто-то победил...", questionUrl: "", answerText: "Алгалона", answerUrl: "/bossy-500-answer.jpg", used: false },
    ],
    // Пасхалки
    [
      { text: "Имя этого NPC — гибрид имени актёра Харрисона Форда и его героя Индианы Джонса. Вся цепочка квестов в Ульдуме с его участием копирует сцены из фильмов про знаменитого археолога.", questionUrl: "", answerText: "Харрисон Джонс", answerUrl: "/pashalki-100-answer.jpg", used: false },
      { text: "В ЛБРС рука робота около лавы — к чему эта пасхалка?", questionUrl: "", answerText: "Терминатор 2", answerUrl: "/pashalki-200-answer.jpg", used: false },
      { text: "В канализации Даларана можно встретить алхимика по имени Уолтер Уайт (или его подобие). Он носит характерные очки и занимается «варкой» зелий, что является явной отсылкой к сериалу. Say my name?!", questionUrl: "", answerText: "Хайзенберг", answerUrl: "", used: false },
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
      { text: "Как назывался единый континент на Азероте до Великого Раскола?", questionUrl: "", answerText: "Калимдор", answerUrl: "/lor-wow-100-answer.webp", used: false },
      { text: "Чем закончилась Первая война против орды?", questionUrl: "", answerText: "Разрушением Штормграда", answerUrl: "/lor-wow-200-answer.jpg", used: false },
      { text: "Какого известного персонажа победил Артас перед тем, как взобраться на Ледяную Корону?", questionUrl: "", answerText: "Иллидан", answerUrl: "/lor-wow-300-answer.jpg", used: false },
      { text: "Почти на всех мирах существовали духи стихии: воды, огня, воздуха, земли. Но не первобытный Дренор. Каким элементом он был пропитан?", questionUrl: "", answerText: "Дух Жизни", answerUrl: "/lor-wow-400-answer.webp", used: false },
      { text: "Какое событие изображено на картинке?", questionUrl: "https://warcraft-wiki.ru/images/thumb/2/20/Chronicle3_Bolvar_and_Dranosh.jpg/450px-Chronicle3_Bolvar_and_Dranosh.jpg", answerText: "Битва у Врат Гнева", answerUrl: "", used: false },
    ],
    // Всратый косплей
    [
      { text: "", questionUrl: "/cosplay-100-question.jpg", answerText: "", answerUrl: "/cosplay-100-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-200-question.jpg", answerText: "", answerUrl: "/cosplay-200-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-300-question.jpg", answerText: "", answerUrl: "/cosplay-300-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-400-question.jpg", answerText: "", answerUrl: "/cosplay-400-answer.jpg", used: false },
      { text: "", questionUrl: "/cosplay-500-question.jpg", answerText: "", answerUrl: "/cosplay-500-answer.jpg", used: false },
    ],
    // Халява
    [
      { text: "100", questionUrl: "", answerText: "100", answerUrl: "", used: false },
      { text: "200", questionUrl: "", answerText: "200", answerUrl: "", used: false },
      { text: "300", questionUrl: "", answerText: "300", answerUrl: "", used: false },
      { text: "400", questionUrl: "", answerText: "400", answerUrl: "", used: false },
      { text: "Ящик пандоры", questionUrl: "", answerText: "Ящик пандоры", answerUrl: "", used: false },
    ],
    // Локации
    [
      { text: "В какой локации расположен вход в легендарное подземелье «Огненные Недра» (Molten Core)?", questionUrl: "", answerText: "Чёрная гора", answerUrl: "/locations-100-answer.jpg", used: false },
      { text: "Как называется город-крепость, который служит главной столицей Орды в Калимдоре?", questionUrl: "", answerText: "Оргриммар", answerUrl: "/locations-200-answer.jpg", used: false },
      { text: "Как называлось Мировое древо, у которого располагалась столица ночных эльфов Дарнас?", questionUrl: "", answerText: "Тельдрасил", answerUrl: "/locations-300-answer.webp", used: false },
      { text: "Через какой перевал в Восточных королевствах можно попасть в локацию Болото Печали, если идти из Сумеречного леса?", questionUrl: "", answerText: "Перевал мёртвого ветра", answerUrl: "/locations-400-answer.jpg", used: false },
      { text: "В какой локации Пандарии игроки могли выращивать собственные овощи и строить отношения с фракцией Земледельцев?", questionUrl: "", answerText: "Ферма солнечной песни", answerUrl: "/locations-500-answer.jpg", used: false },
    ],
    // Профессии
    [
      { text: "«Гоблинская» и «Гномская» — о какой профессии идёт речь?", questionUrl: "", answerText: "Инженерия", answerUrl: "/professions-100-answer.png", used: false },
      { text: "Обладатели какой профессии могли изготавливать волшебные масла?", questionUrl: "", answerText: "Наложение чар", answerUrl: "", used: false },
      { text: "Какая новая профессия появилась в WotLK?", questionUrl: "", answerText: "Начертание", answerUrl: "", used: false },
      { text: "С помощью какой профессии призывался один из боссов в дополнении TBC?", questionUrl: "", answerText: "Рыбалка", answerUrl: "", used: false },
      { text: "Сколько специализаций в кузнечном деле было в TBC? Бонус: назовите их.", questionUrl: "", answerText: "4: бронник, оружейник-мечи, оружейник-булавы, оружейник-топоры.", answerUrl: "", used: false },
    ],
  ],
};

const STORAGE_KEY = "adepts-game-state";
const PLAYERS_KEY = "adepts-shared-players";
const DATA_VERSION = 36;
const ROOM = "adepts-game";

function loadInitialState(): GameState {
  try {
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    const players = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_STATE.players;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.dataVersion !== DATA_VERSION) {
        return { ...DEFAULT_STATE, players, dataVersion: DATA_VERSION };
      }
      return { ...parsed, players };
    }
  } catch (err) {
    console.error("Failed to load state", err);
  }
  return { ...DEFAULT_STATE, dataVersion: DATA_VERSION };
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
      skipEmitRef.current = true;
      setState(incoming);
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

    socketRef.current?.emit("update", state);
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
    resetGame,
  };
}
