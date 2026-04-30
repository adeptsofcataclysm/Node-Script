import { useEffect, type ReactNode } from "react";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Пока игра не запущена ведущим — квиз-доски недоступны, редирект в лобби. */
export function AdeptsQuizBoardGuard({ children }: { children: ReactNode }) {
  const { lobbyState } = useQuizLobbyState();

  useEffect(() => {
    if (lobbyState == null) return;
    if (!lobbyState.gameStarted) {
      window.location.replace(`${base}/adepts-lobby/`);
    }
  }, [lobbyState]);

  if (lobbyState == null) {
    return (
      <div className="adepts-quiz-theme flex min-h-screen items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (!lobbyState.gameStarted) {
    return null;
  }

  return <>{children}</>;
}
