/** Ячейка доски под курсором ведущего или игрока с ходом — синхронно всем (через relay / hostSetHover). */
export type QuizBoardHoverCell = {
  themeIndex: number;
  questionIndex: number;
} | null;
