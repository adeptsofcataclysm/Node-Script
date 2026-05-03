import {
  defaultQuizRelayPayload,
  pointValueForQuestionIndex,
  type AdeptsDonationLogEntry,
  type AdeptsQuizRelayPayload,
  type AdeptsRelayActiveCard,
  type AdeptsSuperTttState,
} from "./adepts-quiz-relay-types";

const ACTIVE_QUIZ_RELAY_PATCH_KEYS = [
  "splashDismissed",
  "splashDedFlyExitStarted",
  "splashPassHoverSeat",
  "splashSeatPassUsed",
] as const;

function parseActiveQuizRelayPatch(patch: unknown): Partial<AdeptsRelayActiveCard> {
  if (!patch || typeof patch !== "object") return {};
  const p = patch as Record<string, unknown>;
  const out: Partial<AdeptsRelayActiveCard> = {};
  for (const key of ACTIVE_QUIZ_RELAY_PATCH_KEYS) {
    if (!(key in p)) continue;
    const v = p[key];
    if (key === "splashPassHoverSeat") {
      if (v === null) {
        out.splashPassHoverSeat = null;
      } else if (typeof v === "number") {
        const n = Math.floor(v);
        if (Number.isInteger(n) && n >= 0 && n <= 4) out.splashPassHoverSeat = n;
      }
      continue;
    }
    if (typeof v === "boolean") {
      (out as Record<string, boolean>)[key] = v;
    }
  }
  return out;
}

const rooms = new Map<string, AdeptsQuizRelayPayload>();

export function getQuizRelayOrDefault(sessionId: string): AdeptsQuizRelayPayload {
  let s = rooms.get(sessionId);
  if (!s) {
    s = defaultQuizRelayPayload(sessionId);
    rooms.set(sessionId, s);
  }
  if (!Array.isArray(s.donationLog)) {
    s.donationLog = [];
  }
  if (s.hideDonationsTableOnBoard3 === undefined) {
    s.hideDonationsTableOnBoard3 = false;
  }
  return s;
}

export function cloneQuizRelay(sessionId: string): AdeptsQuizRelayPayload {
  return structuredClone(getQuizRelayOrDefault(sessionId));
}

export function setQuizRelayFull(sessionId: string, payload: AdeptsQuizRelayPayload): void {
  const base = getQuizRelayOrDefault(sessionId);

  const incomingBoardId =
    typeof (payload as Record<string, unknown>)["boardId"] === "number"
      ? (payload as Record<string, unknown>)["boardId"] as number
      : null;
  const boardChanged = incomingBoardId !== null && incomingBoardId !== base.boardId;

  base.boardRoom = sessionId;
  if (incomingBoardId !== null) base.boardId = incomingBoardId;
  base.players = structuredClone(payload.players);
  base.activeQuizCard = payload.activeQuizCard ? structuredClone(payload.activeQuizCard) : null;
  base.currentTurnSeat = payload.currentTurnSeat;
  base.quizBoardHoverCell = payload.quizBoardHoverCell ?? null;
  base.questionUsedGrid = structuredClone(payload.questionUsedGrid);
  if (payload.dataVersion !== undefined) base.dataVersion = payload.dataVersion;

  const rawLog = (payload as Record<string, unknown>)["donationLog"];
  if (Array.isArray(rawLog)) {
    const next: AdeptsDonationLogEntry[] = [];
    for (const row of rawLog) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const name = typeof o.name === "string" ? o.name.trim().slice(0, 64) : "";
      const amtRaw = o.amount;
      const amt = typeof amtRaw === "number" ? amtRaw : Number(amtRaw);
      const siRaw = o.seatIndex;
      const seatIndex =
        typeof siRaw === "number" && Number.isInteger(siRaw) && siRaw >= 0 && siRaw <= 4
          ? siRaw
          : undefined;
      if (!id || !Number.isFinite(amt) || !Number.isInteger(amt)) continue;
      next.push({ id, name: name || "Игрок", amount: amt, ...(seatIndex !== undefined ? { seatIndex } : {}) });
    }
    base.donationLog = next;
  } else if (!base.donationLog) {
    base.donationLog = [];
  }

  if (payload.catalogIncluded && payload.themes && payload.questions) {
    base.catalogIncluded = true;
    base.themes = structuredClone(payload.themes);
    base.questions = structuredClone(payload.questions);
  } else if (boardChanged) {
    // Board changed — clear the previous board's catalog so it is not served to new clients
    base.catalogIncluded = false;
    delete base.themes;
    delete base.questions;
  }
  /** Каждый lean-relay от ведущего несёт `themes` — обновляем подписи без полного каталога. */
  if (Array.isArray(payload.themes) && payload.themes.length > 0) {
    base.themes = payload.themes.map((x) => String(x ?? "").trim().slice(0, 64));
  }
  if (typeof payload.hideDonationsTableOnBoard3 === "boolean") {
    base.hideDonationsTableOnBoard3 = payload.hideDonationsTableOnBoard3;
  }

  /**
   * Титры на квиз-досках 3 и 4: relay с доски 1 или 2 не несёт полей титров — сбрасываем,
   * чтобы при переходе между досками титры не оставались «включёнными» на сервере.
   */
  if (incomingBoardId === 1 || incomingBoardId === 2) {
    base.creditsRollActive = false;
    delete base.creditsRollStartedAt;
  } else {
    const pExtra = payload as Record<string, unknown>;
    if ("creditsRollActive" in pExtra) {
      base.creditsRollActive = pExtra["creditsRollActive"] === true;
      if (!base.creditsRollActive) {
        delete base.creditsRollStartedAt;
      }
    }
    if (
      "creditsRollStartedAt" in pExtra &&
      typeof pExtra["creditsRollStartedAt"] === "number" &&
      Number.isFinite(pExtra["creditsRollStartedAt"])
    ) {
      base.creditsRollStartedAt = Math.floor(pExtra["creditsRollStartedAt"] as number);
    }
  }

  if (incomingBoardId !== null && incomingBoardId !== 4) {
    delete base.superTtt;
    delete base.superTttWinner;
    delete base.superBoardFourKeyOpenerSeat;
  } else {
    const pExtra = payload as Record<string, unknown>;
    if ("superTtt" in pExtra) {
      const st = pExtra["superTtt"];
      if (st === null) {
        base.superTtt = null;
      } else if (st && typeof st === "object") {
        const o = st as Record<string, unknown>;
        const cellsRaw = o["cells"];
        const rawNx = o["nextIsX"];
        const nextIsX = rawNx === false ? false : true;
        const sx = Number(o["seatX"]);
        const so = Number(o["seatO"]);
        if (
          Array.isArray(cellsRaw) &&
          cellsRaw.length === 25 &&
          Number.isInteger(sx) &&
          sx >= 0 &&
          sx <= 4 &&
          Number.isInteger(so) &&
          so >= 0 &&
          so <= 4
        ) {
          const cells: AdeptsSuperTttState["cells"] = cellsRaw.map((c) =>
            c === "X" || c === "O" ? c : null,
          ) as AdeptsSuperTttState["cells"];
          base.superTtt = {
            cells,
            nextIsX,
            seatX: ((sx % 5) + 5) % 5,
            seatO: ((so % 5) + 5) % 5,
          };
        }
      }
    }
    if ("superTttWinner" in pExtra) {
      const w = pExtra["superTttWinner"];
      if (w === null) {
        base.superTttWinner = null;
      } else if (w && typeof w === "object") {
        const wo = w as Record<string, unknown>;
        const nick = typeof wo["nick"] === "string" ? wo["nick"].trim().slice(0, 64) : "";
        const atMs = typeof wo["atMs"] === "number" ? Math.floor(wo["atMs"]) : NaN;
        if (nick && Number.isFinite(atMs)) {
          base.superTttWinner = { nick, atMs };
        }
      }
    }
    if ("superBoardFourKeyOpenerSeat" in pExtra) {
      const k = pExtra["superBoardFourKeyOpenerSeat"];
      if (k === null) {
        delete base.superBoardFourKeyOpenerSeat;
      } else if (typeof k === "number" && Number.isInteger(k) && k >= 0 && k <= 4) {
        base.superBoardFourKeyOpenerSeat = ((k % 5) + 5) % 5;
      }
    }
  }
  // (lean relay, same board) → keep existing catalog intact so clients that connect later
  // still receive the most recently edited catalog for this board.
}

function seatsSortedByScoreDesc(players: AdeptsQuizRelayPayload["players"]): number[] {
  return players
    .map((p, i) => ({ i, score: Math.floor(Number(p.score)) || 0 }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.i);
}

/**
 * Сетка 2×2 (тема 0): индексы 0…3 идут слева направо, сверху вниз — 0 верх-лево, 1 верх-право.
 * Кто **открыл** верхнюю правую клетку (pickCell), тот играет ○ в крестиках-ноликах.
 */
const SUPER_GAME_TOP_RIGHT_QUESTION_INDEX = 1;

function boardFourTopSeat(players: AdeptsQuizRelayPayload["players"]): number | null {
  const o = seatsSortedByScoreDesc(players);
  return o.length > 0 ? o[0]! : null;
}

/** Очередь открытия призов: все кроме лидера по очкам (2-й, 3-й, … по очкам), с циклом при <4 игроках. */
function boardFourOpeningSeatSequence(players: AdeptsQuizRelayPayload["players"]): number[] {
  const o = seatsSortedByScoreDesc(players);
  if (o.length === 0) return [0];
  const rest = o.slice(1);
  return rest.length > 0 ? rest : [...o];
}

function boardFourTurnSeatForUsedCount(players: AdeptsQuizRelayPayload["players"], usedCount: number): number {
  const seq = boardFourOpeningSeatSequence(players);
  return seq[usedCount % seq.length] ?? 0;
}

function superTttFourInRowWinner(cells: (null | string)[]): "X" | "O" | null {
  if (!Array.isArray(cells) || cells.length !== 25) return null;
  const win4 = (a: number, b: number, c: number, d: number) => {
    const v = cells[a];
    if (v !== "X" && v !== "O") return null;
    if (v === cells[b] && v === cells[c] && v === cells[d]) return v as "X" | "O";
    return null;
  };
  for (let r = 0; r < 5; r++) {
    const b = r * 5;
    for (let o = 0; o <= 1; o++) {
      const w = win4(b + o, b + o + 1, b + o + 2, b + o + 3);
      if (w) return w;
    }
  }
  for (let c = 0; c < 5; c++) {
    for (let o = 0; o <= 1; o++) {
      const w = win4(c + o * 5, c + (o + 1) * 5, c + (o + 2) * 5, c + (o + 3) * 5);
      if (w) return w;
    }
  }
  for (let o = 0; o <= 1; o++) {
    const w = win4(o * 6, o * 6 + 6, o * 6 + 12, o * 6 + 18);
    if (w) return w;
  }
  for (let o = 0; o <= 1; o++) {
    const w = win4(
      o * 5 + (4 - o),
      (o + 1) * 5 + (3 - o),
      (o + 2) * 5 + (2 - o),
      (o + 3) * 5 + (1 - o),
    );
    if (w) return w;
  }
  return null;
}

/** Доска 4: порядок открытия карточек по очкам; после 4-го хода — инициализация крестиков-ноликов. */
export function syncSuperGameBoardFourState(sessionId: string): void {
  const s = getQuizRelayOrDefault(sessionId);
  if (s.boardId !== 4) return;
  const row = s.questionUsedGrid[0];
  if (!row || row.length < 4) return;

  const usedCount = row.slice(0, 4).filter(Boolean).length;
  const order = seatsSortedByScoreDesc(s.players);

  if (usedCount < 4) {
    s.superTtt = null;
    s.superTttWinner = null;
    s.currentTurnSeat = boardFourTurnSeatForUsedCount(s.players, usedCount);
    return;
  }

  if (s.superTtt && s.superTtt.cells.length !== 25) {
    s.superTtt = null;
  }
  if (!s.superTtt) {
    const top = order[0];
    if (top === undefined) return;
    let seatO: number;
    const rawKey = s.superBoardFourKeyOpenerSeat;
    if (typeof rawKey === "number" && Number.isInteger(rawKey) && rawKey >= 0 && rawKey <= 4) {
      seatO = ((rawKey % 5) + 5) % 5;
    } else {
      seatO = order[1] ?? top;
    }
    if (seatO === top && order.length > 1) {
      seatO = order[1]!;
    }
    s.superTtt = {
      cells: Array.from({ length: 25 }, () => null),
      nextIsX: true,
      seatX: top,
      seatO,
    };
  }
}

/** Ведущий ушёл с доски 4: сброс четырёх призовых клеток и супер-игры, чтобы при следующем заходе снова были карточки. */
export function applyBoard4LeaveReset(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (s.boardId !== 4) return { ok: true };
  const row = s.questionUsedGrid[0];
  if (!row) return { ok: false, error: "bad grid" };
  for (let i = 0; i < 4 && i < row.length; i++) {
    row[i] = false;
  }
  s.superTtt = null;
  s.superTttWinner = null;
  delete s.superBoardFourKeyOpenerSeat;
  s.activeQuizCard = null;
  s.quizBoardHoverCell = null;
  syncSuperGameBoardFourState(sessionId);
  return { ok: true };
}

/**
 * Доска 4: игрок с ходом закрыл открытую карточку (после pickCell) — помечает клетку и снимает activeQuizCard.
 */
export function applyCloseSuperGameCard(
  sessionId: string,
  seat: number,
  themeIndex: number,
  questionIndex: number,
  opts?: { hostBypass?: boolean },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (s.boardId !== 4) return { ok: false, error: "not board 4" };
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };
  const t = Math.floor(themeIndex);
  const q = Math.floor(questionIndex);
  if (c.themeIndex !== t || c.questionIndex !== q) return { ok: false, error: "card mismatch" };
  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  const seatN = ((Math.floor(seat) % 5) + 5) % 5;
  if (!opts?.hostBypass && seatN !== turn) return { ok: false, error: "not your turn" };
  if (!s.questionUsedGrid[t] || q < 0 || q >= s.questionUsedGrid[t]!.length) {
    return { ok: false, error: "bad grid" };
  }
  if (s.questionUsedGrid[t]![q]) return { ok: false, error: "already used" };
  s.questionUsedGrid[t]![q] = true;
  s.activeQuizCard = null;
  s.quizBoardHoverCell = null;
  syncSuperGameBoardFourState(sessionId);
  return { ok: true };
}

export function applySuperTttPick(
  sessionId: string,
  seat: number,
  cellIndex: number,
  opts?: { hostBypass?: boolean },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (s.boardId !== 4) return { ok: false, error: "not board 4" };
  const ttt = s.superTtt;
  if (!ttt) return { ok: false, error: "no super ttt" };
  if (s.superTttWinner) return { ok: false, error: "game finished" };

  const ci = Math.floor(cellIndex);
  if (!Number.isInteger(ci) || ci < 0 || ci > 24) return { ok: false, error: "bad cell" };

  const seatN = ((Math.floor(seat) % 5) + 5) % 5;
  const wantX = ttt.nextIsX;
  const expectedSeat = wantX ? ttt.seatX : ttt.seatO;
  if (!opts?.hostBypass && seatN !== expectedSeat) return { ok: false, error: "not your turn" };

  if (ttt.cells[ci] != null) {
    return { ok: false, error: "cell taken" };
  }

  const mark = wantX ? "X" : "O";
  const nextCells = [...ttt.cells] as AdeptsSuperTttState["cells"];
  nextCells[ci] = mark;
  const winnerMark = superTttFourInRowWinner(nextCells);
  const boardFull = nextCells.length === 25 && nextCells.every((c) => c === "X" || c === "O");
  const toggledNext = !wantX;

  s.superTtt = { ...ttt, cells: nextCells, nextIsX: toggledNext };

  if (winnerMark === "X") {
    const p = s.players[ttt.seatX];
    s.superTttWinner = {
      nick: String(p?.name ?? "Игрок").trim() || "Игрок",
      atMs: Date.now(),
    };
  } else if (winnerMark === "O") {
    const p = s.players[ttt.seatO];
    s.superTttWinner = {
      nick: String(p?.name ?? "Игрок").trim() || "Игрок",
      atMs: Date.now(),
    };
  } else if (boardFull) {
    /* ничья — без оверлея победителя */
  }
  return { ok: true };
}

/** Доска 4: ведущий сбрасывает клетки и оверлей победителя; ход снова у ✕. */
export function applySuperTttResetBoard(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (s.boardId !== 4) return { ok: false, error: "not board 4" };
  const ttt = s.superTtt;
  if (!ttt) return { ok: false, error: "no super ttt" };
  s.superTttWinner = null;
  s.superTtt = {
    ...ttt,
    cells: Array.from({ length: 25 }, () => null),
    nextIsX: true,
  };
  return { ok: true };
}

/** Снова показать таблицу пожертвований на 3-й доске (вход на страницу похорон). */
export function clearHideDonationsTableOnBoard3(sessionId: string): void {
  getQuizRelayOrDefault(sessionId).hideDonationsTableOnBoard3 = false;
}

export function applyHostQuizRelay(sessionId: string, payload: unknown): { ok: true } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") return { ok: false, error: "payload required" };
  const p = payload as AdeptsQuizRelayPayload;
  if (!Array.isArray(p.players) || !Array.isArray(p.questionUsedGrid)) {
    return { ok: false, error: "invalid relay" };
  }
  setQuizRelayFull(sessionId, { ...p, boardRoom: sessionId });
  syncSuperGameBoardFourState(sessionId);
  return { ok: true };
}

/**
 * Board hover highlight: ведущий или игрок, чей seat совпадает с currentTurnSeat.
 */
export function applyQuizBoardHover(
  sessionId: string,
  opts: { isHost: boolean; playerSeat: number | null },
  cell: { themeIndex: number; questionIndex: number } | null,
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  let authSeatN: number | null = null;
  if (opts.playerSeat !== null && opts.playerSeat !== undefined) {
    const n = Math.floor(Number(opts.playerSeat));
    if (Number.isInteger(n) && n >= 0 && n <= 4) authSeatN = ((n % 5) + 5) % 5;
  }
  const allowed = opts.isHost || (authSeatN !== null && authSeatN === turn);
  if (!allowed) return { ok: false, error: "not authorized" };

  if (cell === null) {
    s.quizBoardHoverCell = null;
    return { ok: true };
  }
  const t = cell.themeIndex;
  const q = cell.questionIndex;
  if (!Number.isInteger(t) || !Number.isInteger(q)) return { ok: false, error: "bad cell" };
  if (t < 0 || t >= s.questionUsedGrid.length) return { ok: false, error: "bad themeIndex" };
  const row = s.questionUsedGrid[t];
  if (!row || q < 0 || q >= row.length) return { ok: false, error: "bad questionIndex" };
  if (row[q]) return { ok: false, error: "cell already used" };
  s.quizBoardHoverCell = { themeIndex: t, questionIndex: q };
  return { ok: true };
}

/**
 * Merge whitelisted `activeQuizCard` fields from the current player (seat === turn) or host.
 * Used so splash / raccoon UI syncs to all clients — non-host relay does not send `hostQuizRelay`.
 */
export function applyActiveQuizPatch(
  sessionId: string,
  opts: {
    isHost: boolean;
    playerSeat: number | null;
    patch: unknown;
    nextTurnSeat?: unknown;
  },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };

  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  let authSeatN: number | null = null;
  if (opts.playerSeat !== null && opts.playerSeat !== undefined) {
    const n = Math.floor(Number(opts.playerSeat));
    if (Number.isInteger(n) && n >= 0 && n <= 4) authSeatN = ((n % 5) + 5) % 5;
  }

  const allowed = opts.isHost || (authSeatN !== null && authSeatN === turn);
  if (!allowed) return { ok: false, error: "not authorized" };

  const filtered = parseActiveQuizRelayPatch(opts.patch);
  let nextTurnN: number | null = null;
  if (opts.nextTurnSeat !== undefined && opts.nextTurnSeat !== null) {
    const nt = typeof opts.nextTurnSeat === "number" ? opts.nextTurnSeat : Number(opts.nextTurnSeat);
    const n = Math.floor(nt);
    if (!Number.isInteger(n) || n < 0 || n > 4) return { ok: false, error: "bad nextTurnSeat" };
    nextTurnN = ((n % 5) + 5) % 5;
  }

  if (Object.keys(filtered).length === 0 && nextTurnN === null) {
    return { ok: false, error: "empty patch" };
  }

  const merged: AdeptsRelayActiveCard = { ...c, ...filtered };

  if (nextTurnN !== null) {
    if (merged.splashSeatPassUsed !== true) {
      return { ok: false, error: "nextTurnSeat requires splashSeatPassUsed" };
    }
    s.currentTurnSeat = nextTurnN;
  }

  s.activeQuizCard = merged;
  return { ok: true };
}

export function applyPickCell(
  sessionId: string,
  seat: number,
  themeIndex: number,
  questionIndex: number,
  opts?: { hostBypass?: boolean },
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const t = Math.floor(themeIndex);
  const q = Math.floor(questionIndex);
  if (!Number.isFinite(t) || !Number.isFinite(q)) return { ok: false, error: "bad index" };
  if (t < 0 || t >= s.questionUsedGrid.length) return { ok: false, error: "bad themeIndex" };
  const row = s.questionUsedGrid[t];
  if (!row || q < 0 || q >= row.length) return { ok: false, error: "bad questionIndex" };
  if (row[q]) return { ok: false, error: "cell already used" };
  const turn = ((s.currentTurnSeat % 5) + 5) % 5;
  const seatN = ((seat % 5) + 5) % 5;
  if (!opts?.hostBypass && turn !== seatN) return { ok: false, error: "not your turn" };
  if (s.activeQuizCard) return { ok: false, error: "card already open" };

  if (s.boardId === 4 && !s.superTtt) {
    const top = boardFourTopSeat(s.players);
    if (top !== null && seatN === top) {
      return { ok: false, error: "leader skips card phase" };
    }
    if (t === 0 && q === SUPER_GAME_TOP_RIGHT_QUESTION_INDEX) {
      s.superBoardFourKeyOpenerSeat = seatN;
    }
  }

  const card: AdeptsRelayActiveCard = {
    themeIndex: t,
    questionIndex: q,
    stage: "question",
    splashDismissed: false,
    splashDedFlyExitStarted: false,
    splashSeatPassUsed: false,
    splashPassHoverSeat: null,
  };
  s.activeQuizCard = card;
  /** Ведущий часто держит hover на той же ячейке — иначе в `sync` остаётся `quizBoardHoverCell` как у клика игрока с `null` (расхождение UI). */
  s.quizBoardHoverCell = null;
  return { ok: true };
}

export function applyHostRevealAnswer(sessionId: string): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  if (!s.activeQuizCard) return { ok: false, error: "no active card" };
  if (s.activeQuizCard.stage !== "question") return { ok: false, error: "question not open" };
  s.activeQuizCard = { ...s.activeQuizCard, stage: "answer" };
  return { ok: true };
}

export function applyHostJudgeAnswer(
  sessionId: string,
  result: "correct" | "wrong",
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };
  if (c.stage !== "answer") return { ok: false, error: "answer not revealed" };
  const pts = pointValueForQuestionIndex(c.questionIndex);
  const seat = ((s.currentTurnSeat % 5) + 5) % 5;
  const p = s.players[seat];
  if (!p) return { ok: false, error: "bad seat" };

  if (result === "correct") {
    p.score += pts;
    s.questionUsedGrid[c.themeIndex][c.questionIndex] = true;
    s.activeQuizCard = null;
  } else {
    p.score -= pts;
    s.currentTurnSeat = (seat + 1) % 5;
    s.activeQuizCard = null;
  }
  return { ok: true };
}

export function applyHostAdjustScore(sessionId: string, seat: number, delta: number): void {
  const s = getQuizRelayOrDefault(sessionId);
  const i = ((seat % 5) + 5) % 5;
  const p = s.players[i];
  if (!p) return;
  p.score += delta;
}

export function applyHostSetTurn(sessionId: string, seat: number): void {
  const s = getQuizRelayOrDefault(sessionId);
  s.currentTurnSeat = ((seat % 5) + 5) % 5;
}

export function applyHostClearActiveCard(sessionId: string): void {
  const s = getQuizRelayOrDefault(sessionId);
  s.activeQuizCard = null;
}

export function initQuizRoomForSession(sessionId: string): void {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, defaultQuizRelayPayload(sessionId));
  }
}

/** Clears played cells and open card — call when the host ends the round (e.g. return to login). */
export function resetQuizRoomForSession(sessionId: string): void {
  rooms.set(sessionId, defaultQuizRelayPayload(sessionId));
}

/** Имена мест 0–4 из лобби при «Запуск игры» — сразу в relay, чтобы все клиенты увидели ники в `sync`. */
export function applySeatNickRosterToQuizRelay(sessionId: string, seatNicks: string[]): void {
  const s = getQuizRelayOrDefault(sessionId);
  const row = [...seatNicks.map((x) => String(x ?? "").trim().slice(0, 64))];
  while (row.length < 5) row.push("");
  for (let i = 0; i < 5; i++) {
    const p = s.players[i];
    if (!p) continue;
    const nick = row[i] ?? "";
    p.name = nick.length > 0 ? nick : `Игрок ${i + 1}`;
  }
}

/**
 * Карточка на 400 (индекс вопроса 3): клик ведущего по «деду» (dedFly) — +2× сумма пожертвования на **место**
 * (0–4) из журнала. Текущий игрок на месте получает очки. Название темы на сервере не проверяем (часто пусто
 * или другое написание). Строки без `seatIndex` игнорируются.
 */
export function applyHostMounts400DedDonationDoubleReward(
  sessionId: string,
  themeIndex: number,
  questionIndex: number,
): { ok: true } | { ok: false; error: string } {
  const s = getQuizRelayOrDefault(sessionId);
  const c = s.activeQuizCard;
  if (!c) return { ok: false, error: "no active card" };
  const t = Math.floor(themeIndex);
  const q = Math.floor(questionIndex);
  if (c.themeIndex !== t || c.questionIndex !== q) return { ok: false, error: "card mismatch" };
  if (pointValueForQuestionIndex(q) !== 400) return { ok: false, error: "not 400" };

  const log = s.donationLog ?? [];
  const bonusBySeat = new Map<number, number>();

  for (const e of log) {
    const amt = Math.floor(Number(e.amount));
    if (!Number.isFinite(amt) || amt < 1) continue;
    const si = e.seatIndex;
    if (typeof si !== "number" || !Number.isInteger(si) || si < 0 || si > 4) continue;
    const seat = ((si % 5) + 5) % 5;
    const bonus = amt * 2;
    bonusBySeat.set(seat, (bonusBySeat.get(seat) ?? 0) + bonus);
  }

  for (const [seat, add] of bonusBySeat) {
    const p = s.players[seat];
    if (p) p.score += add;
  }
  s.hideDonationsTableOnBoard3 = true;
  return { ok: true };
}

export function applyPlayerDonation(
  sessionId: string,
  seat: number,
  amount: number,
): { ok: true } | { ok: false; error: string } {
  const seatN = ((Math.floor(seat) % 5) + 5) % 5;
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, error: "amount" };
  const s = getQuizRelayOrDefault(sessionId);
  const p = s.players[seatN];
  if (!p) return { ok: false, error: "player" };
  if (p.score < 0 || amount > p.score) return { ok: false, error: "no funds" };

  const name = String(p.name ?? "").trim().slice(0, 64) || `Игрок ${seatN + 1}`;
  const nameKey = name.trim().toLowerCase();
  if (!s.donationLog) s.donationLog = [];

  let mergeLegacy = 0;
  s.donationLog = s.donationLog.filter((e) => {
    if (typeof e.seatIndex === "number") return true;
    if (String(e.name ?? "").trim().toLowerCase() === nameKey) {
      mergeLegacy += e.amount;
      return false;
    }
    return true;
  });

  p.score -= amount;

  const addTotal = amount + mergeLegacy;
  const existing = s.donationLog.find(
    (e) => typeof e.seatIndex === "number" && e.seatIndex === seatN,
  );
  if (existing) {
    existing.amount += addTotal;
    existing.name = name;
  } else {
    const id = `d-seat-${seatN}-${Date.now()}`;
    s.donationLog.push({ id, name, amount: addTotal, seatIndex: seatN });
  }
  return { ok: true };
}

export function __resetQuizRoomsForTests(): void {
  rooms.clear();
}
