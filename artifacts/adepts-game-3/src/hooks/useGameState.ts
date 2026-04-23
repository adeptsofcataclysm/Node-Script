import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type Question = {
  text: string;
  questionUrl: string;
  answerText: string;
  answerUrl: string;
  used: boolean;
};

export type GameState = {
  players: Player[];
  themes: string[];
  questions: Question[][];
};

const DEFAULT_STATE: GameState = {
  players: Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    score: 0,
  })),
  themes: Array.from({ length: 8 }, (_, i) => `Theme ${i + 1}`),
  questions: Array.from({ length: 8 }, () =>
    Array.from({ length: 5 }, () => ({ text: "", questionUrl: "", answerText: "", answerUrl: "", used: false }))
  ),
};

const STORAGE_KEY = "adepts-game-3-state";
const PLAYERS_KEY = "adepts-shared-players";
const ROOM = "adepts-game-3";

function loadInitialState(): GameState {
  try {
    const storedPlayers = localStorage.getItem(PLAYERS_KEY);
    const players = storedPlayers ? JSON.parse(storedPlayers) : DEFAULT_STATE.players;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, players };
    }
    return { ...DEFAULT_STATE, players };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadInitialState);

  const socketRef = useRef<Socket | null>(null);
  const skipEmitRef = useRef(false);

  useEffect(() => {
    const socket = io("/quiz", {
      path: "/socket.io",
      query: { room: ROOM },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("sync", (incoming: GameState) => {
      skipEmitRef.current = true;
      setState(incoming);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(state.players));

    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      return;
    }

    socketRef.current?.emit("update", state);
  }, [state]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          skipEmitRef.current = true;
          setState(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === PLAYERS_KEY && e.newValue) {
        try {
          const players = JSON.parse(e.newValue);
          skipEmitRef.current = true;
          setState(prev => ({ ...prev, players }));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev, players: [...prev.players] };
      next.players[index] = { ...next.players[index], name };
      return next;
    });
  }, []);

  const updatePlayerScore = useCallback((index: number, score: number) => {
    setState((prev) => {
      const next = { ...prev, players: [...prev.players] };
      next.players[index] = { ...next.players[index], score };
      return next;
    });
  }, []);

  const updateThemeName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev, themes: [...prev.themes] };
      next.themes[index] = name;
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (themeIndex: number, questionIndex: number, data: Partial<Question>) => {
      setState((prev) => ({
        ...prev,
        questions: prev.questions.map((theme, tIdx) =>
          tIdx === themeIndex
            ? theme.map((q, qIdx) => (qIdx === questionIndex ? { ...q, ...data } : q))
            : theme
        ),
      }));
    },
    []
  );

  const resetScores = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({ ...p, score: 0 })),
    }));
  }, []);

  const resetGame = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
    resetGame,
  };
}
