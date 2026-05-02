import { getQuizNavSocket } from "@/hooks/quizNavSocket";

const LOBBY_SCOPE = "lobby" as const;

/**
 * Присутствие на странице лобби после входа (`/adepts-lobby`), не на досках квиза.
 */
export function emitLobbyQuizPresence(): void {
  try {
    const s = getQuizNavSocket();
    const nick = localStorage.getItem("player_nick")?.trim();
    if (!nick) {
      s.emit("quizPlayerPresence", {});
      return;
    }
    const role =
      localStorage.getItem("player_role")?.trim().toLowerCase() === "host" ? "host" : "spectator";
    s.emit("quizPlayerPresence", { nick, role, scope: LOBBY_SCOPE });
  } catch {
    /* ignore */
  }
}

/** Снять учёт лобби с этого сокета (выход, уход со страницы лобби). */
export function notifyQuizPlayerLeft(): void {
  try {
    getQuizNavSocket().emit("quizPlayerPresence", {});
  } catch {
    /* ignore */
  }
}
