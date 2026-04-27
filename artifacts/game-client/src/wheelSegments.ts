export const SEGMENTS = [
  {
    label: "ВАЙП",
    color: "#e74c3c", textColor: "#fff",
    image: "vaip.png", imgW: 1300, imgH: 600,
    description: "ПРИЧИНА ТРЯСКИ: ВАЙП! ОЧКИ ВСЕХ ИГРОКОВ ОБНУЛЯЮТСЯ!",
  },
  {
    label: "-100",
    color: "#e67e22", textColor: "#fff",
    image: "100minus.png", imgW: 500, imgH: 500,
    description: "Внезапная плата за участие. Ты отдаёшь 100 очков.",
  },
  {
    label: "СВАП",
    color: "#3498db", textColor: "#fff",
    image: "svap.gif", imgW: 300, imgH: 500,
    description: "Свапнись очками с любым игроком стола на выбор.",
  },
  {
    label: "+100",
    color: "#2ecc71", textColor: "#fff",
    image: "100plus.png", imgW: 500, imgH: 500,
    description: "А нет, это не чирик. Это 100 очков!",
  },
  {
    label: "Рассказать стишок",
    color: "#8e44ad", textColor: "#fff",
    image: "stishokYakubovich.png", imgW: 320, imgH: 320,
    description: "Рассказывайт стишок, дорогой. За это получишь баллы!",
  },
  {
    label: "-500",
    color: "#c0392b", textColor: "#fff",
    image: "500propil.png", imgW: 700, imgH: 450,
    description: "Ты пропил 500 очков. Увы.",
  },
  {
    label: "ДЖЕКПОТ",
    color: "#f1c40f", textColor: "#2c3e50",
    image: "jakpotgif.gif", imgW: 500, imgH: 500,
    description: "",
  },
  {
    label: "-300",
    color: "#d35400", textColor: "#fff",
    image: "minus300.gif", imgW: 600, imgH: 450,
    description: "От тебя уходят 300 очков. Какая жалость(",
  },
  {
    label: "+500",
    color: "#27ae60", textColor: "#fff",
    image: "500plus.gif", imgW: 600, imgH: 450,
    description: "Лови 500 очков!",
  },
  {
    label: "ДЕРЖИ ВОРА",
    color: "#2471a3", textColor: "#fff",
    image: "500thief.gif", imgW: 500, imgH: 500,
    description: "Тебе удалось украсть у лидера стола 500 очков!",
  },
  {
    label: "+300",
    color: "#1abc9c", textColor: "#fff",
    image: "300plus.gif", imgW: 500, imgH: 500,
    description: "Котейка принёс тебе 300 очков.",
  },
];

export const NUM_SEGMENTS = SEGMENTS.length;
export const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
