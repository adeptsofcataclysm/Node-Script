import { useEffect } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { clearAdeptsQuizClientStorage } from "@/lib/clearAdeptsQuizClientStorage";
import { SEAT_ROSTER_SESSION_KEY } from "@/lib/quizLobbyClientAssignments";
import { notifyQuizPlayerLeft } from "@/lib/trackQuizPlayerPresence";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Реакция на команду ведущего: выход всех на страницу ввода ника + сброс локального состояния квиза. */
export function QuizReturnToLoginSync() {
  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();
      const onReturnToLogin = () => {
        notifyQuizPlayerLeft();
        clearAdeptsQuizClientStorage();
        try {
          sessionStorage.removeItem(SEAT_ROSTER_SESSION_KEY);
        } catch {
          /* ignore */
        }
        localStorage.removeItem("player_seat_index");
        localStorage.removeItem("player_nick");
        localStorage.removeItem("player_role");
        window.location.replace(`${base}/`);
      };
      s.on("returnToLogin", onReturnToLogin);
      detach = () => {
        s.off("returnToLogin", onReturnToLogin);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  return null;
}
