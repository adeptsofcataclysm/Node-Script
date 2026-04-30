import { useEffect } from "react";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { clearAdeptsQuizClientStorage } from "@/lib/clearAdeptsQuizClientStorage";
import { notifyQuizPlayerLeft } from "@/lib/trackQuizPlayerPresence";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Реакция на команду ведущего: выход всех на страницу ввода ника + сброс локального состояния квиза. */
export function QuizReturnToLoginSync() {
  useEffect(() => {
    const s = getQuizNavSocket();
    const onReturnToLogin = () => {
      notifyQuizPlayerLeft();
      clearAdeptsQuizClientStorage();
      localStorage.removeItem("player_nick");
      localStorage.removeItem("player_role");
      window.location.replace(`${base}/`);
    };
    s.on("returnToLogin", onReturnToLogin);
    return () => {
      s.off("returnToLogin", onReturnToLogin);
    };
  }, []);

  return null;
}
