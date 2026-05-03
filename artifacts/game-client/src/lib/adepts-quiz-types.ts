/** Shared quiz shape for all adepts boards (game-client + modal). */
export type AdeptsBoardId = 1 | 2 | 3 | 4;

export type AdeptsSuperTttMark = "X" | "O";

/** 25 ячеек (5×5), индекс row*5+col; победа — 4 в ряд. */
export type AdeptsSuperTttState = {
  cells: (AdeptsSuperTttMark | null)[];
  nextIsX: boolean;
  seatX: number;
  seatO: number;
};

export type AdeptsSuperTttWinner = {
  nick: string;
  atMs: number;
};

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
  splashUrl?: string;
  /** Спираль (енот) или полёт картинки слева в центр (dedFly) */
  splashVariant?: "spiral" | "dedFly";
  /** Музыка на время splash (dedFly и др.) */
  splashAudioUrl?: string;
  /** Закрыть splash по клику может только ведущий */
  splashDismissHostOnly?: boolean;
  /** Wheel icon in header (+ «1 крутка») */
  headerUrl?: string;
  /** Маленькая картинка в шапке рядом с очками (без splash и без сценария енота) */
  headerCornerUrl?: string;
};
