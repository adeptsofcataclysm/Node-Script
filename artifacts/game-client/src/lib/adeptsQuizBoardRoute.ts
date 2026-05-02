import type { AdeptsBoardId } from "@/lib/adepts-quiz-types";

function stripBase(pathname: string, base: string): string {
  const b = base.replace(/\/$/, "");
  if (!b) return pathname || "/";
  if (pathname.startsWith(b)) {
    const rest = pathname.slice(b.length) || "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname || "/";
}

function normalize(p: string): string {
  if (p === "/" || p === "") return "/";
  return p.replace(/\/+$/, "") || "/";
}

/** Socket / relay room id — unchanged for server compatibility. */
export function getAdeptsQuizSocketSessionIdFromPath(fullPathname: string): string | null {
  let p = fullPathname;
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    p = stripBase(fullPathname, base);
  } catch {
    /* ignore */
  }
  const rel = normalize(p);

  /**
   * Один socket-room для лобби и всех «раундов» (`/adepts-game`, `/adepts-game/2`, …).
   * Иначе `quiz-nav` / `AdeptsQuizBoardGuard` видят пустой `navBySession` для `adepts-game-2` и шлют
   * `gameStarted: false` на доске 2/3 при том, что игра уже запущена в `adepts-game` → цикл лобби ↔ доска.
   */
  if (/^\/adepts-lobby(?:\/|$)/.test(rel)) return "adepts-game";
  if (/^\/adepts-game(?:\/|$|-)/.test(rel)) return "adepts-game";
  return null;
}

export function getAdeptsBoardIdFromPath(fullPathname: string): AdeptsBoardId {
  let p = fullPathname;
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    p = stripBase(fullPathname, base);
  } catch {
    /* ignore */
  }
  const rel = normalize(p);

  if (rel.startsWith("/adepts-game-3") || /^\/adepts-game\/3(?:\/|$)/.test(rel)) return 3;
  if (rel.startsWith("/adepts-game-2") || /^\/adepts-game\/2(?:\/|$)/.test(rel)) return 2;
  if (/^\/adepts-game\/1(?:\/|$)/.test(rel)) return 1;
  if (/^\/adepts-game(?:\/|$)/.test(rel)) return 1;
  return 1;
}

/** Canonical paths under `/adepts-game` (relative to router base). */
export const QUIZ_BOARD_PHASE_HREFS = ["/adepts-game/", "/adepts-game/2/", "/adepts-game/3/"] as const;

export function buildQuizBoardUrl(boardIndex: number): string {
  const b = import.meta.env.BASE_URL.replace(/\/$/, "");
  const href = QUIZ_BOARD_PHASE_HREFS[boardIndex];
  if (href === undefined) return `${b}/`;
  return b + href;
}

export function getQuizBoardPhaseIndexForPathname(fullPathname: string): number {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const rel = stripBase(fullPathname, base);
  return phaseIndexForPath(rel);
}

function phaseIndexForPath(relPath: string): number {
  const norm = normalize(relPath);
  /** Longer paths first: `/adepts-game/2` must not match prefix of round 1 (`/adepts-game/` + …). */
  for (let i = QUIZ_BOARD_PHASE_HREFS.length - 1; i >= 0; i--) {
    const key = normalize(QUIZ_BOARD_PHASE_HREFS[i]!);
    if (norm === key) return i;
    if (key !== "/" && norm.startsWith(`${key}/`)) return i;
  }
  return -1;
}
