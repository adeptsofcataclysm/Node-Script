/** Shared quiz shape for all adepts boards (game-client + modal). */
export type AdeptsBoardId = 1 | 2 | 3;

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
