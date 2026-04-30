import { useEffect } from "react";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";
import { useRole } from "@/hooks/useRole";
import { buildQuizBoardUrl } from "@/components/GamePhaseArrows";
import { emitLobbyQuizPresence, notifyQuizPlayerLeft } from "@/lib/trackQuizPlayerPresence";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { LobbyQuizPlayersTable } from "@/components/LobbyQuizPlayersTable";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const CHAT_PLACEHOLDER = "тут док добавит эпический чат!";

function exitToLoginPage() {
  notifyQuizPlayerLeft();
  localStorage.removeItem("player_nick");
  localStorage.removeItem("player_role");
  window.location.replace(`${base}/`);
}

const lobbyExitButtonClass =
  "fixed bottom-6 right-6 z-[60] rounded-lg border border-border/80 bg-card/85 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground shadow-lg backdrop-blur-sm transition hover:border-primary/50 hover:text-foreground";

/** Лобби после логина: до старта игры темы квиза не показываются. */
export function AdeptsLobbyPage() {
  const { isSpectator } = useRole();
  const { lobbyState, emitStartGame } = useQuizLobbyState();

  useEffect(() => {
    if (lobbyState?.gameStarted) {
      window.location.replace(buildQuizBoardUrl(lobbyState.boardIndex));
    }
  }, [lobbyState]);

  useEffect(() => {
    const s = getQuizNavSocket();
    const onConnect = () => emitLobbyQuizPresence();
    s.on("connect", onConnect);
    emitLobbyQuizPresence();
    const id = setInterval(emitLobbyQuizPresence, 8000);
    return () => {
      s.off("connect", onConnect);
      clearInterval(id);
      notifyQuizPlayerLeft();
    };
  }, []);

  if (lobbyState?.gameStarted) {
    return (
      <div className="adepts-quiz-theme flex min-h-screen items-center justify-center text-muted-foreground">
        Переход на доску…
      </div>
    );
  }

  if (lobbyState == null) {
    return (
      <div className="adepts-quiz-theme flex min-h-screen items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (isSpectator) {
    return (
      <div className="adepts-quiz-theme relative flex min-h-screen flex-col items-center justify-center px-6 text-foreground">
        <div
          className="max-w-xl rounded-2xl border border-accent/30 bg-card/60 px-8 py-10 text-center shadow-[0_0_40px_hsla(280,65%,50%,0.12)]"
          style={{ fontFamily: "monospace" }}
        >
          <p className="text-lg leading-relaxed text-foreground/90 md:text-xl">{CHAT_PLACEHOLDER}</p>
        </div>
        <button type="button" onClick={exitToLoginPage} className={lobbyExitButtonClass}>
          Выход
        </button>
      </div>
    );
  }

  return (
    <div className="adepts-quiz-theme relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <header className="flex flex-shrink-0 items-center border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm">
        <h1 className="font-display text-2xl tracking-wider text-primary glow-text">
          САМЫЙ ДУШНЫЙ 3.0
        </h1>
        <span className="ml-4 rounded border border-primary/40 px-3 py-1.5 font-display text-sm tracking-wider text-primary/80">
          Лобби
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-start justify-center gap-8 lg:gap-10">
          <div className="flex w-full max-w-xs flex-shrink-0 flex-col items-center gap-6 text-center sm:max-w-sm">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Когда будете готовы начать игру, нажмите кнопку — вы и зрители перейдёте на первую квиз-доску.
            </p>
            <button
              type="button"
              onClick={() => emitStartGame()}
              className="rounded-xl border-2 border-primary/50 bg-primary/15 px-10 py-4 font-display text-lg font-bold tracking-wider text-primary shadow-[0_0_24px_hsla(45,93%,47%,0.25)] transition hover:bg-primary/25 hover:shadow-[0_0_32px_hsla(45,93%,47%,0.35)]"
            >
              Запуск игры
            </button>
          </div>
          <LobbyQuizPlayersTable className="w-full min-w-[min(100%,280px)] max-w-xl lg:max-w-md" />
        </div>
      </main>

      <button type="button" onClick={exitToLoginPage} className={lobbyExitButtonClass}>
        Выход
      </button>
    </div>
  );
}
