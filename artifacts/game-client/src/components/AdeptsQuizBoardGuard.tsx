import { useEffect, type ReactNode } from "react";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG } from "@/lib/quizAdeptsWheelClient";
import { normalizeAdeptsSocketRole } from "@/lib/adeptsCommandSocket";

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

  const gameStarted = lobbyState?.gameStarted === true;
  useEffect(() => {
    if (!gameStarted) return;
    // If the host navigated back from the wheel via the 250 ms fallback timeout
    // (rather than via the server's adeptsWheelReturn event), the
    // hostAdeptsWheelReturn socket event may never have reached the server —
    // the page unloaded while the event was still queued.  Re-emit it from the
    // board socket before requesting wheel state so the server clears
    // adeptsWheelActive = false first.  Both emits are queued synchronously and
    // processed in order on the server (Node.js single-threaded event loop), so
    // requestAdeptsWheelState always sees the already-cleared state.
    try {
      const closeFlag = sessionStorage.getItem(QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG);
      if (closeFlag && normalizeAdeptsSocketRole() === "host") {
        getQuizNavSocket().emit("hostAdeptsWheelReturn");
      }
    } catch {
      /* ignore */
    }
    getQuizNavSocket().emit("requestAdeptsWheelState");
    getQuizNavSocket().emit("requestPandoraRouletteState");
    getQuizNavSocket().emit("requestPandoraLottoState");
  }, [gameStarted]);

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
