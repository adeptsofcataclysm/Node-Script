import { useMemo, useState } from "react";
import { lobbyQuizAnswerCount } from "@/lib/lobbyQuizAnswerCount";

export type LobbyQuizPollPlayerRow = {
  nick: string;
  role: string;
  online: boolean;
};

function quizRoleLabel(role: string): string {
  return role === "host" ? "Ведущий" : "Зритель";
}

type Props = {
  className?: string;
  /** default — компактная высота; sidebar — список на всю высоту колонки */
  variant?: "default" | "sidebar";
  /** Кнопка в шапке карточки (ведущий в лобби) */
  onStartGame?: () => void;
  players: LobbyQuizPollPlayerRow[];
  scoresByNick: Record<string, string>;
  onScoresByNickChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

/** Таблица зрителей/ведущих на странице лобби после входа (не на досках). */
export function LobbyQuizPlayersTable({
  className = "",
  variant = "default",
  onStartGame,
  players,
  scoresByNick,
  onScoresByNickChange,
}: Props) {
  /** По умолчанию — как порядок мест за столом (от большего числа верных ответов). */
  const [answersSort, setAnswersSort] = useState<"none" | "asc" | "desc">("desc");

  const sortedPlayers = useMemo(() => {
    if (answersSort === "none") return players;

    return [...players].sort((a, b) => {
      const descending = lobbyQuizAnswerCount(scoresByNick[b.nick]) - lobbyQuizAnswerCount(scoresByNick[a.nick]);
      const cmp = answersSort === "asc" ? -descending : descending;
      if (cmp !== 0) return cmp;
      return a.nick.localeCompare(b.nick, "ru");
    });
  }, [players, scoresByNick, answersSort]);

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-accent/30 bg-card/50 shadow-[inset_0_0_24px_hsla(280,65%,50%,0.06)] ${
        variant === "sidebar" ? "w-fit max-w-full self-end" : "w-full"
      } ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card/90 px-2.5 py-1.5">
        <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-accent">
          В лобби
        </span>
        {onStartGame ? (
          <button
            type="button"
            onClick={onStartGame}
            className="shrink-0 rounded-lg border-2 border-primary/50 bg-primary/15 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm transition hover:bg-primary/25 hover:shadow-[0_0_12px_hsla(45,93%,47%,0.3)] sm:px-4 sm:text-xs"
          >
            Запуск игры
          </button>
        ) : null}
      </div>
      <div
        className={
          variant === "sidebar"
            ? "min-h-0 flex-1 overflow-x-auto overflow-y-auto"
            : "max-h-[min(40vh,320px)] min-h-[120px] overflow-auto"
        }
      >
        {players.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-snug text-muted-foreground">
            Пока никто не подключался к странице лобби
          </p>
        ) : (
          <table
            className={`border-collapse text-left text-[11px] leading-snug ${
              variant === "sidebar" ? "w-max max-w-full" : "w-full"
            }`}
          >
            <thead>
              <tr className="sticky top-0 z-[1] border-b border-border/50 bg-card/95 text-[8px] uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                <th className="px-2.5 py-1.5 font-semibold">Ник</th>
                <th className="px-2.5 py-1.5 font-semibold">Роль</th>
                <th className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() =>
                      setAnswersSort((prev) =>
                        prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                      )
                    }
                    className="inline-flex items-center gap-0.5 rounded px-0.5 py-0.5 transition hover:text-foreground"
                    title="Сортировать по количеству верных ответов"
                  >
                    <span>Количество верных ответов</span>
                    <span aria-hidden>{answersSort === "desc" ? "▼" : answersSort === "asc" ? "▲" : "↕"}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p) => (
                <tr key={p.nick} className="border-t border-border/40 text-foreground/90">
                  <td className="px-2.5 py-1.5 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${p.online ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                        aria-label={p.online ? "online" : "offline"}
                      />
                      <span>{p.nick}</span>
                    </span>
                  </td>
                  <td
                    className={`px-2.5 py-1.5 ${p.role === "host" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {quizRoleLabel(p.role)}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">
                    <div className="flex w-max max-w-full min-w-0 items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={scoresByNick[p.nick] ?? ""}
                        onChange={(e) =>
                          onScoresByNickChange((prev) => ({
                            ...prev,
                            [p.nick]: e.target.value,
                          }))
                        }
                        placeholder="Введите ответ"
                        className="w-1/2 min-w-0 shrink-0 rounded border border-border/70 bg-background/40 px-1.5 py-0.5 text-[10px] text-foreground outline-none transition focus:border-primary/60"
                      />
                      <button
                        type="button"
                        title="Добавить +1 к количеству верных ответов"
                        aria-label={`Добавить верный ответ для ${p.nick}`}
                        onClick={() =>
                          onScoresByNickChange((prev) => {
                            const cur = lobbyQuizAnswerCount(prev[p.nick]);
                            return { ...prev, [p.nick]: String(cur + 1) };
                          })
                        }
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-primary/45 bg-primary/15 text-sm font-bold leading-none text-primary shadow-sm transition hover:bg-primary/25 hover:border-primary/70"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
