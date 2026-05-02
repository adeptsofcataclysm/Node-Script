import { useCallback, useEffect, useState } from "react";
import { ADEPTS_QUIZ_ASSIGNMENTS_EVENT } from "@/lib/quizLobbyClientAssignments";

/**
 * Роль текущего клиента после лобби-синхронизации (`player_role` в localStorage).
 * Подписка на событие — чтобы после восстановления ника место «игрок/зритель» обновилось без перезагрузки.
 */
export function useRole() {
  const [, setBump] = useState(0);
  const rerender = useCallback(() => setBump((x) => x + 1), []);

  useEffect(() => {
    const handler = () => rerender();
    window.addEventListener(ADEPTS_QUIZ_ASSIGNMENTS_EVENT, handler);
    return () => window.removeEventListener(ADEPTS_QUIZ_ASSIGNMENTS_EVENT, handler);
  }, [rerender]);

  const roleRaw = localStorage.getItem("player_role");
  const role = roleRaw?.trim().toLowerCase() ?? "";
  const isHost = role === "host";
  const isSeatPlayer = role === "player";
  const isSpectator = role === "spectator";
  return { isHost, isSeatPlayer, isSpectator };
}
