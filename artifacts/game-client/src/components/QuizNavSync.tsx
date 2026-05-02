import { useEffect } from "react";
import { useLocation } from "wouter";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { buildQuizBoardUrl, getQuizBoardPhaseIndexForPathname } from "@/components/GamePhaseArrows";

/** Синхронизация перехода между досками по событию `phase` с `/quiz-nav` (ведущий тоже — см. `GamePhaseNav`). */
export function QuizNavSync() {
  const [location] = useLocation();

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();
      const onPhase = (payload: { boardIndex?: unknown }) => {
        const raw = payload?.boardIndex;
        const boardIndex = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > 3) return;

        const cur = getQuizBoardPhaseIndexForPathname(window.location.pathname);
        if (cur < 0) return;

        if (boardIndex === cur) return;
        window.location.assign(buildQuizBoardUrl(boardIndex));
      };

      s.on("phase", onPhase);
      detach = () => {
        s.off("phase", onPhase);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  useEffect(() => {
    if (getQuizBoardPhaseIndexForPathname(window.location.pathname) < 0) return;
    getQuizNavSocket().emit("requestPhase");
  }, [location]);

  return null;
}
