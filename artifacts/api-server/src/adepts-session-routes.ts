import type { Express, RequestHandler } from "express";
import { requireAdeptsHostAuth } from "./lib/adepts-quiz-board-host-auth";
import { parseAdeptsPhase } from "./lib/adepts-session-fsm";
import {
  createAdeptsSession,
  ensureAdeptsSession,
  getAdeptsSession,
  transitionAdeptsSession,
} from "./lib/adepts-session-store";

function sessionIdFromReq(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): string | null {
  const param = req.params["sessionId"];
  const raw = (Array.isArray(param) ? param[0] : param)?.trim();
  if (!raw) {
    res.status(400).json({ ok: false, error: "sessionId required" });
    return null;
  }
  return raw;
}

export function attachAdeptsSessionRoutes(app: Express): void {
  app.post("/api/sessions", (_req, res) => {
    const session = createAdeptsSession();
    res.status(201).json({
      ok: true,
      sessionId: session.id,
      version: session.version,
      session,
    });
  });

  app.get("/api/sessions/:sessionId", (req, res) => {
    const id = sessionIdFromReq(req, res);
    if (!id) return;
    ensureAdeptsSession(id);
    const session = getAdeptsSession(id);
    if (!session) {
      res.status(404).json({ ok: false, error: "Session not found" });
      return;
    }
    res.json({
      ok: true,
      sessionId: session.id,
      version: session.version,
      session,
    });
  });

  app.post("/api/sessions/:sessionId/transition", requireAdeptsHostAuth, (req, res) => {
    const id = sessionIdFromReq(req, res);
    if (!id) return;
    ensureAdeptsSession(id);
    const body = req.body;
    const to =
      body && typeof body === "object"
        ? parseAdeptsPhase((body as Record<string, unknown>)["to"])
        : null;
    if (!to) {
      res.status(400).json({
        ok: false,
        error: 'Body must include a valid "to" phase object (see AdeptsPhase kinds).',
      });
      return;
    }
    const result = transitionAdeptsSession(id, to);
    if (!result.ok) {
      const status = result.error === "Session not found" ? 404 : 409;
      res.status(status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      sessionId: result.session.id,
      version: result.session.version,
      session: result.session,
    });
  });
}
