import type { Question } from "@/lib/adepts-quiz-types";

/**
 * Ячейка «только колесо» без вопроса на карточке — на доске как перевёрнутая;
 * её открывает ведущий, игрок с ходом — нет.
 */
export function isAdeptsWheelFaceDownCell(q: Question): boolean {
  if (!q.headerUrl?.trim()) return false;
  const hasPrompt =
    Boolean(q.text?.trim()) ||
    Boolean(q.questionUrl?.trim()) ||
    Boolean(q.splashUrl?.trim());
  return !hasPrompt;
}
