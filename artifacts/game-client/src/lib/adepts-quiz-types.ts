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
  /** Wheel icon in header (+ «1 крутка») */
  headerUrl?: string;
};
