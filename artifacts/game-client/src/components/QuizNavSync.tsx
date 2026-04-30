import { useEffect } from "react";
import { useLocation } from "wouter";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { buildQuizBoardUrl, getQuizBoardPhaseIndexForPathname } from "@/components/GamePhaseArrows";

/** Синхронизирует переход между квиз-досками для зрителя по событию ведущего (`/quiz-nav`). */
export function QuizNavSync() {
  const [location] = useLocation();

  useEffect(() => {
    const spectator = localStorage.getItem("player_role") === "spectator";
    if (!spectator) return;

    const s = getQuizNavSocket();
    const onPhase = (payload: { boardIndex?: unknown }) => {
      const raw = payload?.boardIndex;
      const boardIndex = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > 2) return;

      const cur = getQuizBoardPhaseIndexForPathname(window.location.pathname);
      if (cur < 0) return;

      if (boardIndex === cur) return;
      window.location.assign(buildQuizBoardUrl(boardIndex));
    };

    s.on("phase", onPhase);
    return () => {
      s.off("phase", onPhase);
    };
  }, []);

  useEffect(() => {
    const spectator = localStorage.getItem("player_role") === "spectator";
    if (!spectator) return;
    if (getQuizBoardPhaseIndexForPathname(window.location.pathname) < 0) return;
    getQuizNavSocket().emit("requestPhase");
  }, [location]);

  return null;
}
