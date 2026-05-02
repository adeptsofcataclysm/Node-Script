import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";

type WithActiveQuiz = {
  activeQuizCard: { themeIndex: number; questionIndex: number } | null;
  questions: { used: boolean }[][];
  quizBoardHoverCell?: QuizBoardHoverCell | null;
};

/**
 * Standard card: after a correct score the cell is marked used and the question card must
 * close so the Player can pick the next cell (vision). A late `setState` that only touches
 * `questions` can otherwise spread a stale `activeQuizCard` back in after `onClose`.
 */
export function withClosedActiveQuizIfCellUsed<T extends WithActiveQuiz>(state: T): T {
  const c = state.activeQuizCard;
  if (!c) return state;
  const q = state.questions[c.themeIndex]?.[c.questionIndex];
  if (q?.used) {
    return { ...state, activeQuizCard: null, quizBoardHoverCell: null };
  }
  return state;
}
