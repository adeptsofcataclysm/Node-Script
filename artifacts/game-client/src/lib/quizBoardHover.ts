/** Ячейка доски под курсором ведущего / игрока с ходом — синхронно всем клиентам. */
export type QuizBoardHoverCell = {
  themeIndex: number;
  questionIndex: number;
} | null;
