import { useCallback, useEffect, useState } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { emitLobbyQuizPresence } from "@/lib/trackQuizPlayerPresence";
import { syncQuizLobbyClientAssignments } from "@/lib/quizLobbyClientAssignments";
import { LOBBY_EMOJI_REVEAL_LINE_COUNT } from "@/lib/lobbyEmojiRevealLines";

export type QuizLobbyStatePayload = {
  gameStarted: boolean;
  boardIndex: number;
  seatPlayerNicks: string[];
  /** −1 — пусто; 0..n−1 — одна строка эмодзи (каждое «Дальше» заменяет на следующую). */
  lobbyEmojiLineIndex: number;
};

function parseLobbyPayload(p: unknown): QuizLobbyStatePayload | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const gameStarted = Boolean(o.gameStarted);
  const raw = o.boardIndex;
  const boardIndex = typeof raw === "number" ? raw : Number(raw);
  const bi = Number.isInteger(boardIndex) && boardIndex >= 0 && boardIndex <= 2 ? boardIndex : 0;
  const sn = o["seatPlayerNicks"];
  const seatPlayerNicks = Array.isArray(sn)
    ? sn.map((x) => String(x ?? "").trim().slice(0, 64)).filter(Boolean).slice(0, 5)
    : [];
  const rawIdx = o["lobbyEmojiLineIndex"];
  const nIdx = typeof rawIdx === "number" ? rawIdx : Number(rawIdx);
  let lobbyEmojiLineIndex = -1;
  if (Number.isFinite(nIdx)) {
    const floored = Math.floor(nIdx);
    if (floored >= -1 && floored < LOBBY_EMOJI_REVEAL_LINE_COUNT) {
      lobbyEmojiLineIndex = floored;
    } else if (floored >= LOBBY_EMOJI_REVEAL_LINE_COUNT) {
      lobbyEmojiLineIndex = LOBBY_EMOJI_REVEAL_LINE_COUNT - 1;
    }
  }
  return { gameStarted, boardIndex: bi, seatPlayerNicks, lobbyEmojiLineIndex };
}

/** Состояние лобби / старта игры с сервера `/quiz-nav` */
export function useQuizLobbyState() {
  const [lobbyState, setLobbyState] = useState<QuizLobbyStatePayload | null>(null);

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();
      const onLobby = (payload: unknown) => {
        const next = parseLobbyPayload(payload);
        if (next) {
          syncQuizLobbyClientAssignments(next);
          setLobbyState(next);
        }
      };
      const onConnect = () => {
        emitLobbyQuizPresence();
        s.emit("requestPhase");
      };
      s.on("lobbyState", onLobby);
      s.on("connect", onConnect);
      detach = () => {
        s.off("lobbyState", onLobby);
        s.off("connect", onConnect);
      };
      if (s.connected) onConnect();
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  const emitStartGame = useCallback((seatPlayerNicks?: string[]) => {
    emitLobbyQuizPresence();
    getQuizNavSocket().emit("startGame", { seatPlayerNicks: seatPlayerNicks ?? [] });
  }, []);

  const emitLobbyEmojiNext = useCallback(() => {
    emitLobbyQuizPresence();
    getQuizNavSocket().emit("lobbyEmojiNext");
  }, []);

  const emitLobbyEmojiPrev = useCallback(() => {
    emitLobbyQuizPresence();
    getQuizNavSocket().emit("lobbyEmojiPrev");
  }, []);

  return { lobbyState, emitStartGame, emitLobbyEmojiNext, emitLobbyEmojiPrev };
}
