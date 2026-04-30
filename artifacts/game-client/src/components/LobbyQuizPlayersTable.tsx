import { useEffect, useState } from "react";

type QuizPlayerRow = {
  nick: string;
  role: string;
  firstSeen: number;
  lastSeen: number;
};

function formatQuizTs(ms: number): string {
  try {
    return new Date(ms).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function quizRoleLabel(role: string): string {
  return role === "host" ? "Ведущий" : "Зритель";
}

/** Таблица зрителей/ведущих на странице лобби после входа (не на досках). */
export function LobbyQuizPlayersTable({ className = "" }: { className?: string }) {
  const [players, setPlayers] = useState<QuizPlayerRow[]>([]);

  useEffect(() => {
    const load = () =>
      fetch("/api/admin/quiz-players")
        .then((r) => r.json())
        .then((d: { players?: QuizPlayerRow[] }) =>
          setPlayers(Array.isArray(d.players) ? d.players : [])
        )
        .catch(() => {});
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

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
            Сейчас никого нет на странице лобби после входа
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="sticky top-0 z-[1] border-b border-border/50 bg-card/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <th className="px-3 py-2 font-semibold">Ник</th>
                <th className="px-3 py-2 font-semibold">Роль</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Первый заход</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Активность</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.nick} className="border-t border-border/40 text-foreground/90">
                  <td className="px-3 py-2 font-semibold">{p.nick}</td>
                  <td
                    className={`px-3 py-2 ${p.role === "host" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {quizRoleLabel(p.role)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {formatQuizTs(p.firstSeen)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {formatQuizTs(p.lastSeen)}
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
