import type { Express } from "express";
import { listQuizPlayersOnline, removeQuizPlayer } from "./quiz-players-registry";

const visitCounts: Record<string, number> = {};

/**
 * Регистрирует счётчики заходов и квиз-реестр до `app.use("/api", router)`,
 * иначе запросы уйдут в роутер и не попадут сюда.
 */
export function attachVisitTrackRoutes(app: Express): void {
  /** Список игроков строится по WebSocket `/quiz-nav` (quizPlayerPresence), не по HTTP. */
  app.post("/api/track/quiz-player", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/track/quiz-player-leave", (req, res) => {
    const nick = String(req.body?.nick ?? "").trim().slice(0, 64);
    if (!nick) {
      res.status(400).json({ ok: false, error: "nick required" });
      return;
    }
    removeQuizPlayer(nick);
    res.json({ ok: true });
  });

  app.post("/api/track/:page", (req, res) => {
    const page = req.params["page"] ?? "unknown";
    visitCounts[page] = (visitCounts[page] ?? 0) + 1;
    res.json({ ok: true, count: visitCounts[page] });
  });

  app.get("/api/admin/visit-counts", (_req, res) => {
    res.json(visitCounts);
  });

  app.get("/api/admin/quiz-players", (_req, res) => {
    res.json({ players: listQuizPlayersOnline() });
  });
}
