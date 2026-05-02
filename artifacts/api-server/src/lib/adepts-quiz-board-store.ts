import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdeptsQuizBoardPersisted,
  AdeptsQuizQuestionPersisted,
} from "./adepts-quiz-board-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Persisted quiz boards: round 1–3 match `AdeptsBoardId` in the game client. */
export type AdeptsPersistedBoardId = 1 | 2 | 3;

const QUESTION_KEYS: (keyof AdeptsQuizQuestionPersisted)[] = [
  "text",
  "questionUrl",
  "answerText",
  "answerUrl",
  "splashUrl",
  "splashVariant",
  "splashAudioUrl",
  "splashDismissHostOnly",
  "headerUrl",
  "headerCornerUrl",
];

export function parsePersistedBoardId(raw: unknown): AdeptsPersistedBoardId | null {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

function seedFilePath(boardId: AdeptsPersistedBoardId): string {
  return path.join(__dirname, `default-adepts-quiz-board-${boardId}.json`);
}

/**
 * Per-board JSON path. Board 1 honors legacy `ADEPTS_QUIZ_DATA_PATH` if set.
 * Boards 2–3 use `ADEPTS_QUIZ_DATA_DIR` when set, else `data/adepts-quiz-board-<n>.json` under cwd.
 */
export function persistedDataFilePath(boardId: AdeptsPersistedBoardId): string {
  const legacy = process.env["ADEPTS_QUIZ_DATA_PATH"]?.trim();
  if (boardId === 1 && legacy) return path.resolve(legacy);
  const dir = process.env["ADEPTS_QUIZ_DATA_DIR"]?.trim();
  if (dir) return path.resolve(dir, `adepts-quiz-board-${boardId}.json`);
  return path.resolve(process.cwd(), "data", `adepts-quiz-board-${boardId}.json`);
}

function parseBoardJson(raw: string): AdeptsQuizBoardPersisted {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== "object") throw new Error("Invalid board JSON");
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o["themes"]) || !Array.isArray(o["questions"])) {
    throw new Error("Board must have themes[] and questions[][]");
  }
  const themes = o["themes"].map((t) => String(t ?? "").slice(0, 200));
  const questions = o["questions"].map((row) => {
    if (!Array.isArray(row)) throw new Error("Each theme row must be an array");
    return row.map((cell) => normalizeQuestion(cell));
  });
  if (themes.length === 0) throw new Error("At least one theme required");
  for (const row of questions) {
    if (row.length !== 5) throw new Error("Each theme must have exactly 5 questions");
  }
  if (questions.length !== themes.length) {
    throw new Error("themes and questions row counts must match");
  }
  return { themes, questions };
}

function normalizeQuestion(cell: unknown): AdeptsQuizQuestionPersisted {
  if (!cell || typeof cell !== "object") {
    return {
      text: "",
      questionUrl: "",
      answerText: "",
      answerUrl: "",
    };
  }
  const c = cell as Record<string, unknown>;
  const out: AdeptsQuizQuestionPersisted = {
    text: typeof c["text"] === "string" ? c["text"] : String(c["text"] ?? ""),
    questionUrl:
      typeof c["questionUrl"] === "string"
        ? c["questionUrl"]
        : String(c["questionUrl"] ?? ""),
    answerText:
      typeof c["answerText"] === "string"
        ? c["answerText"]
        : String(c["answerText"] ?? ""),
    answerUrl:
      typeof c["answerUrl"] === "string"
        ? c["answerUrl"]
        : String(c["answerUrl"] ?? ""),
  };
  if (typeof c["splashUrl"] === "string") out.splashUrl = c["splashUrl"];
  if (c["splashVariant"] === "spiral" || c["splashVariant"] === "dedFly") {
    out.splashVariant = c["splashVariant"];
  }
  if (typeof c["splashAudioUrl"] === "string") out.splashAudioUrl = c["splashAudioUrl"];
  if (c["splashDismissHostOnly"] === true) out.splashDismissHostOnly = true;
  if (typeof c["headerUrl"] === "string") out.headerUrl = c["headerUrl"];
  if (typeof c["headerCornerUrl"] === "string") out.headerCornerUrl = c["headerCornerUrl"];
  return out;
}

function mergeQuestionPatch(
  base: AdeptsQuizQuestionPersisted,
  patch: Record<string, unknown>
): AdeptsQuizQuestionPersisted {
  const next: AdeptsQuizQuestionPersisted = { ...base };
  for (const key of QUESTION_KEYS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    if (key === "splashVariant") {
      if (v === "spiral" || v === "dedFly") next.splashVariant = v;
      else if (v === null || v === "") delete next.splashVariant;
      continue;
    }
    if (key === "splashDismissHostOnly") {
      if (v === true) next.splashDismissHostOnly = true;
      else delete next.splashDismissHostOnly;
      continue;
    }
    if (typeof v === "string") {
      const s =
        key === "text" || key === "answerText"
          ? v
          : v.slice(0, 2048);
      (next as Record<string, unknown>)[key] = s;
    }
  }
  return next;
}

function ensurePersistedFileFromSeed(boardId: AdeptsPersistedBoardId): void {
  const target = persistedDataFilePath(boardId);
  if (existsSync(target)) return;
  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });
  const seed = readFileSync(seedFilePath(boardId), "utf8");
  parseBoardJson(seed);
  writeFileSync(target, seed, "utf8");
}

let writeChain: Promise<void> = Promise.resolve();

function runExclusive<T>(fn: () => T): Promise<T> {
  const run = writeChain.then(fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function readAdeptsQuizBoard(boardId: AdeptsPersistedBoardId): AdeptsQuizBoardPersisted {
  ensurePersistedFileFromSeed(boardId);
  const target = persistedDataFilePath(boardId);
  const raw = readFileSync(target, "utf8");
  return parseBoardJson(raw);
}

export function writeAdeptsQuizBoard(
  boardId: AdeptsPersistedBoardId,
  board: AdeptsQuizBoardPersisted
): Promise<void> {
  return runExclusive(() => {
    const target = persistedDataFilePath(boardId);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(board, null, 2), "utf8");
  });
}

export function patchThemeName(
  boardId: AdeptsPersistedBoardId,
  index: number,
  name: string
): Promise<AdeptsQuizBoardPersisted> {
  return runExclusive(() => {
    const board = readAdeptsQuizBoard(boardId);
    if (!Number.isInteger(index) || index < 0 || index >= board.themes.length) {
      throw new Error("Invalid theme index");
    }
    const themes = [...board.themes];
    themes[index] = name.trim().slice(0, 200);
    const next = { ...board, themes };
    const target = persistedDataFilePath(boardId);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
}

export function patchQuestionCell(
  boardId: AdeptsPersistedBoardId,
  themeIndex: number,
  questionIndex: number,
  patch: Record<string, unknown>
): Promise<AdeptsQuizBoardPersisted> {
  return runExclusive(() => {
    const board = readAdeptsQuizBoard(boardId);
    if (
      !Number.isInteger(themeIndex) ||
      themeIndex < 0 ||
      themeIndex >= board.questions.length
    ) {
      throw new Error("Invalid theme index");
    }
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= 5) {
      throw new Error("Invalid question index");
    }
    const row = [...board.questions[themeIndex]!];
    const base = row[questionIndex]!;
    row[questionIndex] = mergeQuestionPatch(base, patch);
    const questions = board.questions.map((r, i) => (i === themeIndex ? row : [...r]));
    const next = { ...board, questions };
    const target = persistedDataFilePath(boardId);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
}
