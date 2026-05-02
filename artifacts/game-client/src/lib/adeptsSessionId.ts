import { getAdeptsQuizSocketSessionIdFromPath } from "@/lib/adeptsQuizBoardRoute";

const LS_KEY = "adepts_session_id";

/** Same `sessionId` as `/quiz`, `/quiz-nav`, `/wheel`, roulette, and `/adepts` (default: `default`). */
export function getAdeptsSessionId(): string {
  const v = import.meta.env.VITE_ADEPTS_SESSION_ID;
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 128);
  try {
    const u = new URLSearchParams(window.location.search).get("sessionId");
    if (u?.trim()) return u.trim().slice(0, 128);
    const s = localStorage.getItem(LS_KEY)?.trim();
    /** Не трактовать «default» из LS как отдельный шоу-рум: иначе лобби/доски расходятся с клиентами без ключа. */
    if (s && s !== "default") return s.slice(0, 128);
    const fromPath = getAdeptsQuizSocketSessionIdFromPath(window.location.pathname);
    if (fromPath) return fromPath.slice(0, 128);
    if (s) return "default";
  } catch {
    /* ignore */
  }
  return "default";
}

export function setAdeptsSessionId(id: string): void {
  try {
    localStorage.setItem(LS_KEY, id.trim().slice(0, 128));
  } catch {
    /* ignore */
  }
}
