/** Ключи localStorage квиз-приложений — сброс при «перезагрузке игры». */
const ADEPTS_QUIZ_STORAGE_KEYS = [
  "adepts-game-state",
  "adepts-game-2-state",
  "adepts-game-3-state",
  "adepts-shared-players",
  "adepts-game-2-data-version",
  "adepts-game-3-data-version",
] as const;

export function clearAdeptsQuizClientStorage(): void {
  for (const key of ADEPTS_QUIZ_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
