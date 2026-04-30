import { useCallback, useEffect, useState } from "react";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

export type QuizLobbyStatePayload = {
  gameStarted: boolean;
  boardIndex: number;
};

function parseLobbyPayload(p: unknown): QuizLobbyStatePayload | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const gameStarted = Boolean(o.gameStarted);
  const raw = o.boardIndex;
  const boardIndex = typeof raw === "number" ? raw : Number(raw);
  const bi = Number.isInteger(boardIndex) && boardIndex >= 0 && boardIndex <= 2 ? boardIndex : 0;
  return { gameStarted, boardIndex: bi };
}

/** Состояние лобби / старта игры с сервера `/quiz-nav` */
export function useQuizLobbyState() {
  const [lobbyState, setLobbyState] = useState<QuizLobbyStatePayload | null>(null);

  useEffect(() => {
    const s = getQuizNavSocket();
    const onLobby = (payload: unknown) => {
      const next = parseLobbyPayload(payload);
      if (next) setLobbyState(next);
    };
    s.on("lobbyState", onLobby);
    return () => {
      s.off("lobbyState", onLobby);
    };
  }, []);

  const emitStartGame = useCallback(() => {
    getQuizNavSocket().emit("startGame");
  }, []);

  return { lobbyState, emitStartGame };
}
