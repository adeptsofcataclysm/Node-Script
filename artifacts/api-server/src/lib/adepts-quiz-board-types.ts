/** Persisted question shape (no runtime `used` flag in the JSON file). */
export type AdeptsQuizQuestionPersisted = {
  text: string;
  questionUrl: string;
  answerText: string;
  answerUrl: string;
  splashUrl?: string;
  splashVariant?: "spiral" | "dedFly";
  splashAudioUrl?: string;
  splashDismissHostOnly?: boolean;
  headerUrl?: string;
  headerCornerUrl?: string;
};

export type AdeptsQuizBoardPersisted = {
  themes: string[];
  questions: AdeptsQuizQuestionPersisted[][];
};
