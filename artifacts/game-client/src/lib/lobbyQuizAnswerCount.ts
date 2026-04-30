/**
 * Значение «количество верных ответов» из ячейки таблицы лобби.
 * Пусто и нечисловые строки → 0 — так же ранжируются места 1–5 за столом.
 */
export function lobbyQuizAnswerCount(raw: string | undefined): number {
  const trimmed = String(raw ?? "").trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
