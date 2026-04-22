import { useState, useEffect, useCallback } from "react";

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type Question = {
  text: string;
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
    Array.from({ length: 5 }, () => ({ text: "", answerText: "", answerUrl: "", used: false }))
  ),
};

const STORAGE_KEY = "adepts-game-2-state";

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to load state", err);
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev };
      next.players = [...prev.players];
      next.players[index] = { ...next.players[index], name };
      return next;
    });
  }, []);

  const updatePlayerScore = useCallback((index: number, score: number) => {
    setState((prev) => {
      const next = { ...prev };
      next.players = [...prev.players];
      next.players[index] = { ...next.players[index], score };
      return next;
    });
  }, []);

  const updateThemeName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const next = { ...prev };
      next.themes = [...prev.themes];
      next.themes[index] = name;
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (themeIndex: number, questionIndex: number, data: Partial<Question>) => {
      setState((prev) => {
        const next = { ...prev };
        next.questions = prev.questions.map((theme, tIdx) =>
          tIdx === themeIndex
            ? theme.map((q, qIdx) =>
                qIdx === questionIndex ? { ...q, ...data } : q
              )
            : theme
        );
        return next;
      });
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
