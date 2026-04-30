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
  players: LobbyQuizPollPlayerRow[];
  scoresByNick: Record<string, string>;
  onScoresByNickChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

/** Таблица зрителей/ведущих на странице лобби после входа (не на досках). */
export function LobbyQuizPlayersTable({
  className = "",
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
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-accent/30 bg-card/50 shadow-[inset_0_0_24px_hsla(280,65%,50%,0.06)] ${className}`}
    >
      <div className="border-b border-border/60 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
        В лобби
      </div>
      <div className="max-h-[min(40vh,320px)] min-h-[120px] overflow-auto">
        {players.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Пока никто не подключался к странице лобби
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="sticky top-0 z-[1] border-b border-border/50 bg-card/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <th className="px-3 py-2 font-semibold">Ник</th>
                <th className="px-3 py-2 font-semibold">Роль</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() =>
                      setAnswersSort((prev) =>
                        prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:text-foreground"
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
                  <td className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${p.online ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                        aria-label={p.online ? "online" : "offline"}
                      />
                      <span>{p.nick}</span>
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 ${p.role === "host" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {quizRoleLabel(p.role)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={scoresByNick[p.nick] ?? ""}
                      onChange={(e) =>
                        onScoresByNickChange((prev) => ({
                          ...prev,
                          [p.nick]: e.target.value,
                        }))
                      }
                      placeholder="Введите ответ"
                      className="w-full min-w-[130px] rounded-md border border-border/70 bg-background/40 px-2 py-1 text-xs text-foreground outline-none transition focus:border-primary/60"
                    />
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
