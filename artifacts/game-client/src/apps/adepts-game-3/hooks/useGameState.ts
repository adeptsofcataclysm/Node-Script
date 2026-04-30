import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, Question } from "@/lib/adepts-quiz-types";
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
};

export type GameState = {
  players: Player[];
  themes: string[];
  questions: Question[][];
  activeQuizCard: ActiveQuizCard | null;
  /** Текущий ход: индекс места игрока 0..4 */
  currentTurnSeat: number;
};

function gd(id: string) {
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

const DEFAULT_STATE: GameState = {
  activeQuizCard: null,
  currentTurnSeat: 0,
  players: Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    score: 0,
  })),
  themes: [
    "Лор Адептов",
    "Всратый косплей",
    "Маунты",
    "Пасхалки",
    "Зацени Look",
    "Боссы",
    "Фракции",
    "События в WoW",
  ],
  questions: [
    // Лор Адептов
    [
      {
        text: "Какому антагонисту игры был посвящён эвент с «Херлок Шолмсом»?",
        questionUrl: "",
        answerText: "Смертокрыл/Нелтарион (Нелтариарти)",
        answerUrl: "",
        used: false,
      },
      {
        text: "Сколько волн (статиков) было за всё время существования гильдии?",
        questionUrl: "",
        answerText: "5 статиков",
        answerUrl: "",
        used: false,
      },
      {
        text: "Как известно, Адепты в классике противостояли орде. Противостояние это было поистине легендарным. Назови гильдию орды, с которой Адепты смело сражались всю классику?",
        questionUrl: "",
        answerText: "Экселенс",
        answerUrl: "",
        splashUrl: "/raccoon.png",
        used: false,
      },
      {
        text: "К чему была приурочена эта гифка?",
        questionUrl: "/lor-400-question.gif",
        answerText: "Переезд гильдии с сервера Рок-Делар на Пламегор (бля там написано «АдеТПы»)",
        answerUrl: "",
        used: false,
      },
      {
        text: "Назовите союзные гильдии Адептам, с которыми был заключён пакт о коалиции в противостоянии орде?",
        questionUrl: "",
        answerText: "Классика, Тайга",
        answerUrl: "",
        used: false,
      },
    ],
    // Всратый косплей
    [
      {
        text: "Угадайте персонажа по косплею:",
        questionUrl: "/cursed-cosplay-200.png",
        answerText: "Пандарен",
        answerUrl: "https://mir-s3-cdn-cf.behance.net/project_modules/hd_webp/42b0ab50391213.560881a922da1.jpg",
        used: false,
      },
      {
        text: "Угадайте персонажа по косплею:",
        questionUrl: "/cursed-cosplay-400.png",
        answerText: "Гулдан",
        answerUrl: "https://cs19.pikabu.ru/s/2025/12/20/13/6ljew2eq.webp",
        used: false,
      },
      {
        text: "Угадайте персонажа по косплею:",
        questionUrl: "/cursed-cosplay-100.png",
        answerText: "Артас",
        answerUrl: "/cursed-cosplay-300-answer.png",
        used: false,
      },
      {
        text: "Угадайте персонажа по косплею:",
        questionUrl: "/cursed-cosplay-300.png",
        answerText: "Шаман",
        answerUrl: "/cursed-cosplay-400-answer.png",
        used: false,
      },
      {
        text: "Угадайте персонажа по косплею:",
        questionUrl: "https://s.13.cl/sites/default/files/inline-images/2021-01/south-park-wow-cosplayer-1609791777871.jpg",
        answerText: "Jarod Nandin — самый знаменитый косплей по WoW.\nКосплей на задрота WoW.",
        answerUrl: "https://i.redd.it/rtxt1hffn0r31.jpg",
        splashUrl: "/raccoon.png",
        used: false,
      },
    ],
    // Маунты
    [
      {
        text: "Как называется маунт, который можно получить при победе над Кельтасом?",
        questionUrl: "",
        answerText: "Алар",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/171317-.jpg",
        used: false,
        headerUrl: "/wheel.png",
      },
      {
        text: "Как называется этот маунт?",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/321464-%D0%BF%D0%BE%D0%B2%D0%BE%D0%B4%D1%8C%D1%8F-%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B3%D0%BE-%D1%8F%D0%BA%D0%B0-%D0%B4%D0%BB%D1%8F-%D0%BF%D1%83%D1%82%D0%B5%D1%88%D0%B5%D1%81%D1%82%D0%B2%D0%B8%D0%B9.jpg",
        answerText: "Поводья большого яка для путешествий",
        answerUrl: "/mounts-200-answer.png",
        used: false,
      },
      {
        text: "Получить этого редкого маунта можно было только во время эвента «Открытие врат Ан'Киража». Как называется маунт?",
        questionUrl: "",
        answerText: "Чёрный киражский боевой танк",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/1121442-%D1%87%D0%B5%D1%80%D0%BD%D1%8B%D0%B9-%D0%BA%D0%B8%D1%80%D0%B0%D0%B6%D1%81%D0%BA%D0%B8%D0%B9-%D0%B1%D0%BE%D0%B5%D0%B2%D0%BE%D0%B9-%D1%82%D0%B0%D0%BD%D0%BA.jpg",
        used: false,
      },
      {
        text: "Сразу после убийства своего отца Артас направился на ферму Балнира. С помощью силы Фростморна принц воскресил своего давнего друга. О ком идёт речь?",
        questionUrl: "",
        answerText: "Непобедимый",
        answerUrl: "https://static.wowhead.com/uploads/screenshots/normal/166549.jpg",
        used: false,
      },
      {
        text: "Редкий морской конёк, который обитает в безднах Вайш'ира. Позволяет хозяину быстро передвигаться под водой. Это один из немногих маунтов, который не становится персональным при получении.",
        questionUrl: "",
        answerText: "Поводья Посейдуса (Посейдус)",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/228087-%D0%BF%D0%BE%D0%B2%D0%BE%D0%B4%D1%8C%D1%8F-%D0%BF%D0%BE%D1%81%D0%B5%D0%B9%D0%B4%D1%83%D1%81%D0%B0.jpg",
        used: false,
      },
    ],
    // Пасхалки
    [
      {
        text: "В канализации Даларана вы можете найти пасхалку к известному мульт-сериалу. Какому?",
        questionUrl: "",
        answerText: "Черепашки-ниндзя",
        // Без @jpg: иначе CDN отдаёт image/jpeg — один кадр, «гифка не играет»
        answerUrl: "https://images.cybersport.ru/images/as-is/plain/8e/8ea3f54ef99a2e90ed1ef1f34bcc085f.gif",
        used: false,
      },
      {
        text: "Ящик Пандоры",
        questionUrl: "/halyava-500-question.mp4",
        answerText: "нужно сделать либо отдельный таймер на сайте, специально для таких евентов, либо как-то по другому.",
        answerUrl: "",
        used: false,
      },
      {
        text: "В Шаттрате в нижней таверне можно встретить светскую львицу, которая продаёт БОЛЬШУУУУУУЩИЕ сумки. Как её зовут?",
        questionUrl: "",
        answerText: "Псения Кобчак",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/70585-%D0%BF%D1%81%D0%B5%D0%BD%D0%B8%D1%8F-%D0%BA%D0%BE%D0%B1%D1%87%D0%B0%D0%BA.jpg",
        used: false,
      },
      {
        text: "Этот NPC в Красногорье и Пылающих Степях даёт игроку ряд заданий на уничтожение врага с помощью хитрых ловушек. На кого эта пасхалка?",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/195137-%D0%B4%D0%B6%D0%BE%D0%BD-%D0%B4%D0%B6%D0%B5%D0%B9-%D0%BA%D0%B8%D1%88%D0%B0%D0%BD.jpg",
        answerText: "Рэмбо/Сильвестр Сталлоне",
        answerUrl: "",
        used: false,
      },
      {
        text: "С большого червя Оуро, одного из боссов в АК40, падает особый аксессуар в виде коробочки. Что это за коробочка, и к какому произведению эта пасхалка?",
        questionUrl: "",
        answerText: "Аксессуар называется «Джом Габбар». Отсылка к «Дюне».",
        answerUrl: "",
        used: false,
      },
    ],
    // Зацени Look
    [
      {
        text: "С кого падает этот замечательный предмет на голову?",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/218694-%D0%BF%D1%80%D0%BE%D0%BA%D0%BB%D1%8F%D1%82%D0%BE%D0%B5-%D0%B2%D0%B8%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5-%D1%81%D0%B0%D1%80%D0%B3%D0%B5%D1%80%D0%B0%D1%81%D0%B0.jpg",
        answerText: "С Иллидана",
        answerUrl: "",
        used: false,
      },
      {
        text: "Какой спек у этого паладина?",
        questionUrl: "/zaceni-look-200-question.png",
        answerText: "Хил...но в душе он остаётся ретриком)",
        answerUrl: "",
        used: false,
      },
      {
        text: "В названии этого клинка заключена частичка нашей гильдии.",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/33806-%D0%BA%D1%80%D0%BE%D0%BC%D0%BA%D0%B0-%D0%BA%D0%B0%D1%82%D0%B0%D0%BA%D0%BB%D0%B8%D0%B7%D0%BC%D0%B0.jpg",
        answerText: "Кромка Катаклизма",
        answerUrl: gd("1xHf3TlyN7tStHu31AgdeMjn0lxwxIG5m"),
        splashUrl: "/raccoon.png",
        used: false,
      },
      {
        text: "Какой из классов мог носить эту версию Атиеша?",
        questionUrl: "/zaceni-look-400-question.png",
        answerText: "Чернокнижник (синяя лента — чернокнижник, оранжевая — жрец, зелёная — друид, красная — маг)",
        answerUrl: "",
        used: false,
      },
      {
        text: "",
        questionUrl: "/zaceni-look-500-question.mp4",
        answerText: "Вы получаете 3 крутки Колеса Адептов",
        answerUrl: "/freebie-400-question.png",
        used: false,
      },
    ],
    // Боссы
    [
      {
        text: "Страж Земли — один из пяти Аспектов Драконов и лидер чёрных драконов. Когда титаны покидали Азерот, они даровали ему власть над землёй и её недрами, чтобы он охранял мир и спокойствие на этой планете. Однако это благословение стало его проклятием. Заключённые в недрах Азерота Древние Боги медленно, но верно подтачивали разум благородного дракона, наконец сведя его с ума. Назовите имя этого легендарного Дракона?",
        questionUrl: "",
        answerText: "Смертокрыл, Нелтарион",
        answerUrl: "https://static0.gamerantimages.com/wordpress/wp-content/uploads/2022/06/Deathwing-WoW.jpg?w=1600&h=900&fit=crop",
        used: false,
      },
      {
        text: "",
        questionUrl: "/bosses-200-question.mp4",
        answerText: "Вы получаете 3 крутки Колеса Адептов",
        answerUrl: "/freebie-400-question.png",
        used: false,
      },
      {
        text: "После победы над этим боссом, в благодарность, он благословляет рейд и дарует бафф для упрощения следующего энкаунтера (в героическом режиме).\nНазовите этого босса?",
        questionUrl: "",
        answerText: "Лей Ши",
        answerUrl: "https://www.guiaswow.com/wp-content/uploads/2012/11/guia-lei-shi.jpg",
        used: false,
      },
      {
        text: "Первый раз этот босс встречается нам в подземелье «Пик Чёрной горы». По сюжету он даёт приказ Вождю Ренду Черноруку расправиться с вами. Назовите этого босса.",
        questionUrl: "",
        answerText: "Нефариан",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/152109-%D0%BB%D0%BE%D1%80%D0%B4-%D0%B2%D0%B8%D0%BA%D1%82%D0%BE%D1%80-%D0%BD%D0%B5%D1%84%D0%B0%D1%80%D0%B8%D0%B9.jpg",
        used: false,
      },
      {
        text: "Босс, которого надо только хилить.",
        questionUrl: "",
        answerText: "Валитрия Сноходица",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/151037-valithria-dreamwalker.jpg",
        used: false,
      },
    ],
    // Фракции
    [
      {
        text: "У какой фракции в Шатрате (столице TBC) самый длинный лифт?",
        questionUrl: "",
        answerText: "Алдоры",
        answerUrl: "https://preview.redd.it/aldor-elevator-is-its-own-game-mode-v0-myblx483a4kg1.png?auto=webp&s=817b2021a1e86792eb86b788de30f68b2be67615",
        used: false,
      },
      {
        text: "Побочная фракция в TBC, связанная с грибочками.",
        questionUrl: "",
        answerText: "Спорегар",
        answerUrl: "https://static.wikia.nocookie.net/wow/images/4/49/Sporeggar_Concept_Art_Peter_Lee.jpg/revision/latest?cb=20131115184120&path-prefix=ru",
        splashUrl: "/raccoon.png",
        used: false,
      },
      {
        text: "Первоначально это была просто одна из многочисленных гильдий ремесленников, работающих в Стальгорне.\nПосле порабощения Повелителем огня они придумали и реализовали план побега. Сбежав из-под гнёта Повелителя Огня, эти рукастые дворфы осели в Тлеющем Ущелье.\nЭлитная группа мастеров, которые могут открыть ряд эпических рецептов, если вы приобретаете с ними достаточно репутации.\nНапример, при прокачке репутации до превознесения игроки получают доступ к «Сумеркам», которые помогают в рейдовом контенте.\nНазовите фракцию?",
        questionUrl: "",
        answerText: "Братство Тория",
        answerUrl: "https://tagn.wordpress.com/wp-content/uploads/2020/12/bs_mastersmithburninate.png",
        used: false,
      },
      {
        text: '[4.Поиск спутников]: "Помогу с фармом «Тёмных ларцов» для репутации с фракцией <????>. Подробности в ПМ."\nО какой фракции идёт речь?',
        questionUrl: "",
        answerText: "Чёрный ворон",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/11152-%D1%87%D0%B5%D1%80%D0%BD%D1%8B%D0%B9-%D0%B2%D0%BE%D1%80%D0%BE%D0%BD.jpg",
        used: false,
      },
      {
        text: "С какой фракцией в ваниле нужно было прокачивать репутацию для входа в Наксрамас?",
        questionUrl: "",
        answerText: "Серебряный рассвет",
        answerUrl: "https://wow.zamimg.com/uploads/screenshots/normal/7625-%D1%81%D0%B5%D1%80%D0%B5%D0%B1%D1%80%D1%8F%D0%BD%D1%8B%D0%B9-%D1%80%D0%B0%D1%81%D1%81%D0%B2%D0%B5%D1%82.jpg",
        used: false,
      },
    ],
    // События в WoW
    [
      {
        text: "Что за праздник?",
        questionUrl: "/wow-events-100-question.png",
        answerText: "Зимний Покров",
        answerUrl: "",
        used: false,
      },
      {
        text: "На каком ивенте добывается это невероятно редкое средство передвижения?",
        questionUrl: "https://wow.zamimg.com/uploads/screenshots/normal/159887-%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F-%D1%80%D0%B0%D0%BA%D0%B5%D1%82%D0%B0-%D0%BB%D1%8E%D0%B1%D0%B2%D0%B8.jpg",
        answerText: "Любовная Лихорадка",
        answerUrl: "",
        used: false,
      },
      {
        text: "Несчастный, ты достиг конца пути! Судьба решит, кому вперёд идти!\nДанную фразу можно услышать от босса этого события.",
        questionUrl: "",
        answerText: "Тыквовин",
        answerUrl: "/wow-events-300-answer.png",
        used: false,
      },
      {
        text: "Почему всё в огне?",
        questionUrl: "/wow-events-400-question.png",
        answerText: "Событие в локации: прилетел Смертокрыл",
        answerUrl: "/wow-events-400-answer.png",
        used: false,
      },
      {
        text: "Что за событие происходило, когда в игре появлялись подобные NPC?",
        questionUrl: "/wow-events-500-question.png",
        answerText: "Подготовка к открытию Врат Ан'киража",
        answerUrl: gd("17AFs6awvOAhukzbHGvCyslHPkOm4f_Dt"),
        splashUrl: "/raccoon.png",
        used: false,
      },
    ],
  ],
};

const STORAGE_KEY = "adepts-game-3-state";
const PLAYERS_KEY = "adepts-shared-players";
const DATA_VERSION = 14;
const DATA_VERSION_KEY = "adepts-game-3-data-version";
const ROOM = "adepts-game-3";

function restoreRaccoonCards(state: GameState): GameState {
  const nextQuestions = state.questions.map((theme) => theme.map((question) => ({ ...question })));
  const raccoonCards: Array<[number, number]> = [
    [0, 2], // Лор Адептов 300
    [1, 4], // Всратый косплей 500
    [4, 2], // Зацени Look 300
    [6, 1], // Фракции 200
    [7, 4], // События в WoW 500
  ];

  for (const [themeIdx, questionIdx] of raccoonCards) {
    if (nextQuestions[themeIdx]?.[questionIdx]) {
      nextQuestions[themeIdx][questionIdx] = {
        ...nextQuestions[themeIdx][questionIdx],
        splashUrl: "/raccoon.png",
      };
    }
  }

  // Всратый косплей 100–400 — локальные картинки в public
  // Порядок файлов на диске прежний; привязка к 100/200/300/400 — циклическая перестановка
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

  // Лор Адептов 400 — канонический медиа-файл в public (локальные .png/.jpg → .gif)
  if (nextQuestions[0]?.[3]) {
    const q = nextQuestions[0][3];
    const u = (q.questionUrl || "").toLowerCase();
    if (/lor-400-question\.(png|jpg|gif)$/i.test(u) && !u.startsWith("http")) {
      nextQuestions[0][3] = { ...q, questionUrl: "/lor-400-question.gif" };
    }
  }

  // Пасхалки 100 — старый URL с @jpg = статичный JPEG
  if (nextQuestions[3]?.[0]?.answerUrl?.includes("8ea3f54ef99a2e90ed1ef1f34bcc085f.gif@jpg")) {
    const q = nextQuestions[3][0];
    nextQuestions[3][0] = {
      ...q,
      answerUrl: "https://images.cybersport.ru/images/as-is/plain/8e/8ea3f54ef99a2e90ed1ef1f34bcc085f.gif",
    };
  }

  // Маунты 100 — колесо в шапке
  if (nextQuestions[2]?.[0]) {
    nextQuestions[2][0] = {
      ...nextQuestions[2][0],
      headerUrl: "/wheel.png",
    };
  }

  // Зацени Look 200 / 400 — локальные картинки вопроса
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

  // Зацени Look 500 / Боссы 200 — ролики Якубовича в public
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

  // Фракции 400 — актуальный текст объявления
  if (nextQuestions[6]?.[3]) {
    nextQuestions[6][3] = {
      ...nextQuestions[6][3],
      text: '[4.Поиск спутников]: "Помогу с фармом «Тёмных ларцов» для репутации с фракцией <????>. Подробности в ПМ."\nО какой фракции идёт речь?',
    };
  }

  // События в WoW 100 / 400 / 500 — локальные картинки вопроса
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

function loadInitialState(): GameState {
  try {
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== String(DATA_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
    }
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    const players = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_STATE.players;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return restoreRaccoonCards({
        ...parsed,
        players,
        activeQuizCard: parsed.activeQuizCard ?? null,
        currentTurnSeat: Number.isInteger(parsed.currentTurnSeat)
          ? ((Number(parsed.currentTurnSeat) % 5) + 5) % 5
          : 0,
      });
    }
    return restoreRaccoonCards({ ...DEFAULT_STATE, players });
  } catch {
    return restoreRaccoonCards(DEFAULT_STATE);
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
      const basePlayers = incoming.players?.length ? incoming.players : DEFAULT_STATE.players;
      const { merged, hadRoster } = mergeSeatRosterIntoQuizPlayers([...basePlayers]);
      const hostResetTurn =
        hadRoster &&
        typeof localStorage !== "undefined" &&
        localStorage.getItem("player_role") === "host";
      const nextState = {
        ...incoming,
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
            used: incoming.questions?.[tIdx]?.[qIdx]?.used ?? defaultQ.used,
          }))
        ),
      };
      skipEmitRef.current = true;
      setState(nextState);
      if (hadRoster) {
        skipEmitRef.current = false;
        queueMicrotask(() => socketRef.current?.emit("update", nextState));
      }
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
    resetGame,
  };
}
