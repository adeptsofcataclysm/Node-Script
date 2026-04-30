import { lobbyQuizAnswerCount } from "@/lib/lobbyQuizAnswerCount";

function compareDescendingAnswersThenNick(
  scoresByNick: Record<string, string>,
  aNick: string,
  bNick: string
): number {
  const diff = lobbyQuizAnswerCount(scoresByNick[bNick]) - lobbyQuizAnswerCount(scoresByNick[aNick]);
  if (diff !== 0) return diff;
  return aNick.localeCompare(bNick, "ru");
}

/**
 * До пяти ников зрителей (не ведущего): место 1 — максимум верных ответов,
 * далее по убыванию; одинаковый счёт — по нику. Пустые ячейки считаются как 0.
 */
export function computeTopSeatNicks(
  rows: { nick: string; role: string }[],
  scoresByNick: Record<string, string>
): string[] {
  const pool = rows.filter((r) => r.role === "spectator");
  return [...pool]
    .sort((a, b) => compareDescendingAnswersThenNick(scoresByNick, a.nick, b.nick))
    .slice(0, 5)
    .map((r) => r.nick);
}
