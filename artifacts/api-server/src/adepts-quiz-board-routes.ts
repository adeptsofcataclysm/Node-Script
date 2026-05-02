import type { Express, RequestHandler } from "express";
import type { AdeptsQuizBoardPersisted } from "./lib/adepts-quiz-board-types";
import { requireAdeptsHostAuth } from "./lib/adepts-quiz-board-host-auth";
import {
  parsePersistedBoardId,
  patchQuestionCell,
  patchThemeName,
  readAdeptsQuizBoard,
  writeAdeptsQuizBoard,
  type AdeptsPersistedBoardId,
} from "./lib/adepts-quiz-board-store";

function withUsedFalse(board: AdeptsQuizBoardPersisted) {
  return {
    themes: board.themes,
    questions: board.questions.map((row) =>
      row.map((q) => ({ ...q, used: false as const }))
    ),
  };
}

function boardIdFromReq(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1]
): AdeptsPersistedBoardId | null {
  const raw = req.params["boardId"];
  const id = parsePersistedBoardId(raw);
  if (!id) {
    res.status(400).json({ ok: false, error: "boardId must be 1, 2, or 3" });
    return null;
  }
  return id;
}

function parsePutBody(
  body: unknown
): { ok: true; board: AdeptsQuizBoardPersisted } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON body required" };
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b["themes"]) || !Array.isArray(b["questions"])) {
    return { ok: false, error: "themes[] and questions[][] required" };
  }
  try {
    const themes = b["themes"].map((t) => String(t ?? "").trim().slice(0, 200));
    const questions = b["questions"].map((row: unknown) => {
      if (!Array.isArray(row)) throw new Error("Each questions row must be an array");
      return row.map((cell) => {
        if (!cell || typeof cell !== "object") {
          return { text: "", questionUrl: "", answerText: "", answerUrl: "" };
        }
        const c = cell as Record<string, unknown>;
        const base = {
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
        const out: Record<string, unknown> = { ...base };
        if (typeof c["splashUrl"] === "string") out["splashUrl"] = c["splashUrl"];
        if (c["splashVariant"] === "spiral" || c["splashVariant"] === "dedFly") {
          out["splashVariant"] = c["splashVariant"];
        }
        if (typeof c["splashAudioUrl"] === "string") out["splashAudioUrl"] = c["splashAudioUrl"];
        if (c["splashDismissHostOnly"] === true) out["splashDismissHostOnly"] = true;
        if (typeof c["headerUrl"] === "string") out["headerUrl"] = c["headerUrl"];
        if (typeof c["headerCornerUrl"] === "string") {
          out["headerCornerUrl"] = c["headerCornerUrl"];
        }
        return out;
      });
    });
    if (themes.length === 0) {
      return { ok: false, error: "At least one theme required" };
    }
    for (const row of questions) {
      if (row.length !== 5) {
        return { ok: false, error: "Each theme must have exactly 5 questions" };
      }
    }
    if (questions.length !== themes.length) {
      return { ok: false, error: "themes length must match questions rows" };
    }
    const board: AdeptsQuizBoardPersisted = {
      themes,
      questions: questions as AdeptsQuizBoardPersisted["questions"],
    };
    return { ok: true, board };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid board",
    };
  }
}

export function attachAdeptsQuizBoardRoutes(app: Express): void {
  const getBoard: RequestHandler = (req, res) => {
    let id: AdeptsPersistedBoardId;
    if (req.params["boardId"] !== undefined) {
      const parsed = boardIdFromReq(req, res);
      if (parsed === null) return;
      id = parsed;
    } else {
      id = 1;
    }
    try {
      const board = readAdeptsQuizBoard(id);
      res.json(withUsedFalse(board));
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : "Failed to read board",
      });
    }
  };

  /** Legacy: round 1 catalog without path segment. */
  app.get("/api/adepts-quiz-board", getBoard);
  app.get("/api/adepts-quiz-board/:boardId", getBoard);

  const putBoard: RequestHandler = (req, res) => {
    let id: AdeptsPersistedBoardId;
    if (req.params["boardId"] !== undefined) {
      const parsed = boardIdFromReq(req, res);
      if (parsed === null) return;
      id = parsed;
    } else {
      id = 1;
    }
    const parsed = parsePutBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ ok: false, error: parsed.error });
      return;
    }
    void writeAdeptsQuizBoard(id, parsed.board)
      .then(() => res.json(withUsedFalse(parsed.board)))
      .catch((e: unknown) => {
        res.status(500).json({
          ok: false,
          error: e instanceof Error ? e.message : "Write failed",
        });
      });
  };

  app.put("/api/adepts-quiz-board", requireAdeptsHostAuth, putBoard);
  app.put("/api/adepts-quiz-board/:boardId", requireAdeptsHostAuth, putBoard);

  const patchTheme: RequestHandler = (req, res) => {
    let id: AdeptsPersistedBoardId;
    if (req.params["boardId"] !== undefined) {
      const parsed = boardIdFromReq(req, res);
      if (parsed === null) return;
      id = parsed;
    } else {
      id = 1;
    }
    const body = req.body as Record<string, unknown> | null;
    const index = typeof body?.["index"] === "number" ? body["index"] : Number(body?.["index"]);
    const name = typeof body?.["name"] === "string" ? body["name"] : "";
    if (!Number.isInteger(index)) {
      res.status(400).json({ ok: false, error: "index must be an integer" });
      return;
    }
    void patchThemeName(id, index, name)
      .then((board) => res.json(withUsedFalse(board)))
      .catch((e: unknown) => {
        res.status(400).json({
          ok: false,
          error: e instanceof Error ? e.message : "Patch failed",
        });
      });
  };

  app.patch("/api/adepts-quiz-board/theme", requireAdeptsHostAuth, patchTheme);
  app.patch("/api/adepts-quiz-board/:boardId/theme", requireAdeptsHostAuth, patchTheme);

  const patchQuestion: RequestHandler = (req, res) => {
    let id: AdeptsPersistedBoardId;
    if (req.params["boardId"] !== undefined) {
      const parsed = boardIdFromReq(req, res);
      if (parsed === null) return;
      id = parsed;
    } else {
      id = 1;
    }
    const body = req.body as Record<string, unknown> | null;
    const themeIndex =
      typeof body?.["themeIndex"] === "number" ? body["themeIndex"] : Number(body?.["themeIndex"]);
    const questionIndex =
      typeof body?.["questionIndex"] === "number"
        ? body["questionIndex"]
        : Number(body?.["questionIndex"]);
    const patch = body?.["patch"];
    if (!Number.isInteger(themeIndex) || !Number.isInteger(questionIndex)) {
      res.status(400).json({ ok: false, error: "themeIndex and questionIndex must be integers" });
      return;
    }
    if (!patch || typeof patch !== "object") {
      res.status(400).json({ ok: false, error: "patch object required" });
      return;
    }
    void patchQuestionCell(id, themeIndex, questionIndex, patch as Record<string, unknown>)
      .then((board) => res.json(withUsedFalse(board)))
      .catch((e: unknown) => {
        res.status(400).json({
          ok: false,
          error: e instanceof Error ? e.message : "Patch failed",
        });
      });
  };

  app.patch("/api/adepts-quiz-board/question", requireAdeptsHostAuth, patchQuestion);
  app.patch(
    "/api/adepts-quiz-board/:boardId/question",
    requireAdeptsHostAuth,
    patchQuestion
  );
}
