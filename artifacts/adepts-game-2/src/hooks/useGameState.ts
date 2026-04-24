import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

const BASE = import.meta.env.BASE_URL;

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
};

function gd(id: string) {
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

const DEFAULT_STATE: GameState = {
  players: Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    score: 0,
  })),
  themes: [
    "Дед прими таблетки",
    "Тактики",
    "Петомцы",
    "Треш",
    "Цитаты и Фразы",
    "Великие подвиги",
    "НаЯборот",
    "Абилки",
  ],
  questions: [
    // Дед прими таблетки — пустые
    [
      { text: "", questionUrl: "", answerText: "", answerUrl: "", used: false },
      { text: "", questionUrl: "", answerText: "", answerUrl: "", used: false },
      { text: "", questionUrl: "", answerText: "", answerUrl: "", used: false },
      { text: "", questionUrl: "", answerText: "", answerUrl: "", used: false },
      { text: "", questionUrl: "", answerText: "", answerUrl: "", used: false },
    ],
    // Тактики
    [
      {
        text: "СЕКРЕТНЫЙ ВОПРОС-ИВЕНТ\n\nКарусель, карусель!\nКто успель — тот присель\nВот такая наша карусеееееееель!\n\nТебе даётся 30 сек. Вспомни и назови такие энкаунтеры, в тактике которых рейд должен двигаться по кругу. Что считается а что не считается — дело ведущего. Обсуждению не подлежит!!!!",
        questionUrl: "",
        answerText: "нужно сделать либо отдельный таймер на сайте, специально для таких евентов, либо как-то по другому.",
        answerUrl: "",
        used: false,
      },
      {
        text: "Однажды игрок в WoW поспорил, что напишет самую короткую и самую всеобъемлющую тактику, которой можно описать каждого босса в игре. Он выйграл спор, написав...",
        questionUrl: "",
        answerText: "Красное бей, зелёное хиль.",
        answerUrl: "",
        used: false,
      },
      {
        text: "Чтобы лучше запомнить тактику на этого босса, достаточно посмотреть на свою клавиатуру.",
        questionUrl: "",
        answerText: "Тадиус (-----БОСС++++)",
        answerUrl: `${BASE}tactics-300-answer.png`,
        used: false,
      },
      {
        text: "Как известно, у Адептов когда-то был творец эпохальных разборов на рейдовые подземелья. Какие-то доделаны до конца, а какие-то заброшены. Так вот, если бы сейчас появился эпохальный обзор на Осаду Оргримара, то каким по счёту он бы был?",
        questionUrl: "",
        answerText: "10-й\n\nЧто было:\n1) Чёрный храм\n2) Плато Солнечного Колодца\n3) Ульдуар\n4) Цитадель Ледяной Короны\n5) Твердыня Крыла Тьмы\n6) Сумеречный Бастион\n7) Трон Четырёх Ветров\n8) Огненные Просторы\n9) Душа Дракона",
        answerUrl: `${BASE}tactics-400-answer.png`,
        used: false,
      },
      {
        text: "Перед походом в Чёрный Храм адептов просили полететь в забытый город ради семечка колючечника. Ради какого босса, и зачем?",
        questionUrl: "",
        answerText: "Матушка Шахраз. Чтобы её стяжка 3-х игроков иногда прокала на этих мобов с семечек.",
        answerUrl: `${BASE}tactics-500-answer.png`,
        used: false,
      },
    ],
    // Петомцы
    [
      {
        text: "Есть особое достижение на каменных стражах в ПМШ. В чём суть этого достижения?",
        questionUrl: "",
        answerText: "\"Любовь к собакам обязательна\" — необходимо убить босса с рейдом из призванных собаками.",
        answerUrl: gd("16fKN23vgiYGc8m79nSBClW_1-cZNs1vd"),
        used: false,
      },
      {
        text: "В WoW TBC Classic чернокнижникам в середине патча дали нового питомца. Какого?",
        questionUrl: "",
        answerText: "Инкубус",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/1049275-.jpg",
        used: false,
      },
      {
        text: "Нет!!! Будьте вы прокляты, незваные гости! Армии Короля-лича поймают вас! Вы не сбежите от своей гибели...\n\nИменно это вы услышите в свой адрес (а также ухудшите шанс дропа на хороший лут) если убьёте...",
        questionUrl: "",
        answerText: "Мистер Бигглсоуорт (Кот Бегемот)",
        answerUrl: "https://warcraft-wiki.ru/images/thumb/f/f8/Mr._Bigglesworth_HS_Scholomance.jpg/290px-Mr._Bigglesworth_HS_Scholomance.jpg",
        used: false,
      },
      {
        text: "Этот питомец может превратить вас в лягушку.",
        questionUrl: "",
        answerText: "Моджо",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/63437-%D0%BC%D0%BE%D0%B4%D0%B6%D0%BE-jungle-love.jpg",
        used: false,
      },
      {
        text: "Что такого особенного было в питомце «Омерзительный слизнючёнышь», который очень редко падал с сумок, добываемых со слизнюков?",
        questionUrl: "",
        answerText: "При призыве пет накладывал дебафф на −20 ко всем резистам (есть инфа, что на одного человека, но есть инфа что на всю пати).",
        answerUrl: "https://digiseller.mycdn.ink/imgwebp.ashx?idp=300641&dc=645926400&w=576",
        used: false,
      },
    ],
    // Треш
    [
      {
        text: "В каком рейде впервые появился так называемый suppression room?",
        questionUrl: "",
        answerText: "ЛКТ / БВЛ",
        answerUrl: "https://external-preview.redd.it/has-your-guild-been-wiping-on-suppression-room-for-hours-v0-9nZ-fIhhjmaxdcAaFth4fboliSwZ8KWKFkjXU-YxaDY.png?width=1080&crop=smart&format=pjpg&auto=webp&s=c0bd7e10461ffc669b7b4b92d884bac7b63ed8c9",
        used: false,
      },
      {
        text: "Одна из самых страшных фраз, что можно услышать после многих вайпов на боссе.",
        questionUrl: "",
        answerText: "«Здесь трешь реснулся.» (Рес треша происходит через 2 часа после его убийства, если жив босс перед трешом.)",
        answerUrl: "",
        used: false,
      },
      {
        text: "Назовите рейдовое подземелье, в котором вообще нет треша как такового.",
        questionUrl: "",
        answerText: "(1) Испытание крестоносца  (2) Око вечности (где Малигос летает)  (3) Трон четырёх ветров (Алакир).",
        answerUrl: "",
        used: false,
      },
      {
        text: "В каком рейде нужно убить некоторое количество треша, чтобы заспавнился босс?",
        questionUrl: "",
        answerText: "Огненные просторы",
        answerUrl: gd("1pmww42WHN0YKDbEhhG20eog1j4eoiDhR"),
        used: false,
      },
      {
        text: "СЕКРЕТНЫЙ ВОПРОС-ИВЕНТ!!!\nТебе даётся 30 сек. Вспомни и назови такие энкаунтеры, в которых значительная (или почти вся) часть сражения завязана на битве с трешом. Чем больше битв назовёшь — тем больше очков получишь. Что считается а что не считается — дело ведущего. Обсуждению не подлежит!!!!",
        questionUrl: "",
        answerText: "нужно сделать либо отдельный таймер на сайте, специально для таких евентов, либо как-то по другому.",
        answerUrl: "",
        used: false,
      },
    ],
    // Цитаты и Фразы
    [
      {
        text: "Что заиграет после этого?\n— Trifiling gnome! Your arrogance will be your undoing!\n— But i'm in charge here...\n— [...]",
        questionUrl: "",
        answerText: "",
        answerUrl: gd("1xOPOAvweFM8IDl3tiHV67jAqUDrCx7mD"),
        used: false,
      },
      {
        text: "Дополните фразу:\n[...]. Я...этого...не хотела.",
        questionUrl: "",
        answerText: "",
        answerUrl: gd("1YxVFWtpdvQ4f4mTFNi247RZ2UirbGOuH"),
        used: false,
      },
      {
        text: "Дополните цитату:\nНе бывает в игре багов [...]",
        questionUrl: "",
        answerText: "",
        answerUrl: gd("1jzUyYr-0bVoxTh3wO7GnpG6AEmfXYkTZ"),
        used: false,
      },
      {
        text: "Кто это сказал?\n«От вас будет пахнуть огнём!»",
        questionUrl: "",
        answerText: "Киирилл",
        answerUrl: gd("1Hm54AnqlUJluP3-j32_BRgswqlsph7lv"),
        used: false,
      },
      {
        text: "Там был вопрос про Ониксию и фразу из видео. Но! Этот вопрос уже есть в раунде 1.",
        questionUrl: "",
        answerText: "",
        answerUrl: "",
        used: false,
      },
    ],
    // Великие подвиги (дрочивки)
    [
      {
        text: "Ачивка называется — «Крутостью мне заложило уши!». Что нужно было сделать, чтобы получить данную ачивку?",
        questionUrl: "",
        answerText: "Победить Синестру в героическом режиме с первой попытки, не допустив смерти ни одного из участников рейда.",
        answerUrl: gd("1uiiDsyLXRA5XjfqD5-D7j5b9lBxyFG28"),
        used: false,
      },
      {
        text: "Добейтесь того, чтобы пираты из шайки Кровавого Паруса начали относиться к вам с уважением, а обитатели Пиратской бухты, Круговзора, Прибамбасска, Кебестана, Ярморки Новолуния и поместья Чёрного Ворона стали вас превозносить.",
        questionUrl: "",
        answerText: "Чокнутый",
        answerUrl: gd("1-hlTrDLFPmtG4g_Gnsz4YEZUs5XIBH1c"),
        used: false,
      },
      {
        text: "В течение одного сохранённого рейда убейте всех боссов в Наксрамасе и рейде на 10 игроков, не допустив смерти ни одного участника рейда.",
        questionUrl: "",
        answerText: "Неумирающий",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/409843-%D0%BD%D0%B5%D1%83%D0%BC%D0%B8%D1%80%D0%B0%D1%8E%D1%89%D0%B8%D0%B9.jpg",
        used: false,
      },
      {
        text: "Назовите ачивку, для которой нужно убить всех лидеров фракции противника в их столицах. Наградой будет огромный Чёрный боевой медведь.",
        questionUrl: "",
        answerText: "За Альянс!",
        answerUrl: gd("19r1lgm-MiXOyUuUpEzAGvdZwSR7o_zFA"),
        used: false,
      },
      {
        text: "Назовите великий подвиг, связанный с этой фигуркой.",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/289826-%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%BD%D0%B0%D1%8F-%D1%84%D0%B8%D0%B3%D1%83%D1%80%D0%BA%D0%B0-%D0%B2%D0%B5%D1%80%D0%B1%D0%BB%D1%8E%D0%B4%D0%B0.jpg",
        answerText: "«Странная фигурка верблюда». В Ульдуме при нажатии вас отправляет в «Дымящиеся озёра» вызволять верблюда из лап Дормуса.\nПодвиг называется — Странник вечных песков.",
        answerUrl: "",
        used: false,
      },
    ],
    // НаЯборот
    [
      { text: "Солнцетень", questionUrl: "", answerText: "Луносет", answerUrl: "", used: false },
      { text: "Равнины пространства", questionUrl: "", answerText: "Пещеры времени", answerUrl: "", used: false },
      { text: "Мокрая компашка", questionUrl: "", answerText: "Пылающий легион", answerUrl: "", used: false },
      { text: "Слив конца", questionUrl: "", answerText: "Источник вечности", answerUrl: "", used: false },
      { text: "Квадростоп Наполнения", questionUrl: "", answerText: "Круговерть Путоты", answerUrl: "", used: false },
    ],
    // Абилки
    [
      {
        text: "Назовите эту способность.",
        questionUrl: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_sealofsacrifice.jpg",
        answerText: "Длань Жертвенности",
        answerUrl: "",
        used: false,
      },
      {
        text: "Как называют всё это вот?",
        questionUrl: gd("1rZYkRGIqQGrwf_1SmyPoZqjYgg8rvEwd"),
        answerText: "Лужи",
        answerUrl: "",
        used: false,
      },
      {
        text: "Опишите эту способность:",
        questionUrl: gd("1sf98Ii28Bi4AQca3M_EpsoV8lOEqT6Lu"),
        answerText: "«Цеповуха» К'Туна. Чем дальше скачет — тем больше урон.",
        answerUrl: "",
        used: false,
      },
      {
        text: "Назовите абилку по описанию:\nДруид получает одну из способностей связанного с ним класса. Выбор зависит от специализации. Цель также получает одну из способностей друида. Время действия — 1 ч. Эффект сохраняется после смерти.",
        questionUrl: "",
        answerText: "Симбиоз.",
        answerUrl: gd("1Po6nyVvlXcI2kSQZVvjj_RNK_Z-pU4Vd"),
        used: false,
      },
      {
        text: "Почему тут аж три камня здоровья?",
        questionUrl: gd("1rTL5adwkPzLUjGqVCFF25705oyEguFLr"),
        answerText: "Когда-то у варлока были разные уровни заклинания для камней здоровья. Эти камушки не стакались между собой в инвентаре.",
        answerUrl: "",
        used: false,
      },
    ],
  ],
};

const STORAGE_KEY = "adepts-game-2-state";
const PLAYERS_KEY = "adepts-shared-players";
const DATA_VERSION = 4;
const DATA_VERSION_KEY = "adepts-game-2-data-version";
const ROOM = "adepts-game-2";

function loadInitialState(): GameState {
  try {
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    const players = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_STATE.players;

    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== String(DATA_VERSION)) {
      localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_STATE, players };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, players };
    }
    return { ...DEFAULT_STATE, players };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadInitialState);

  const socketRef = useRef<Socket | null>(null);
  const skipEmitRef = useRef(false);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(state.players));

    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      return;
    }

    socketRef.current?.emit("update", state);
  }, [state]);

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
      const next = { ...prev, players: [...prev.players] };
      next.players[index] = { ...next.players[index], name };
      return next;
    });
  }, []);

  const updatePlayerScore = useCallback((index: number, score: number) => {
    setState((prev) => {
      const next = { ...prev, players: [...prev.players] };
      next.players[index] = { ...next.players[index], score };
      return next;
    });
  }, []);

  const updateThemeName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev, themes: [...prev.themes] };
      next.themes[index] = name;
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (themeIndex: number, questionIndex: number, data: Partial<Question>) => {
      setState((prev) => ({
        ...prev,
        questions: prev.questions.map((theme, tIdx) =>
          tIdx === themeIndex
            ? theme.map((q, qIdx) => (qIdx === questionIndex ? { ...q, ...data } : q))
            : theme
        ),
      }));
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
