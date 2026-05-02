import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { requireAdeptsHostAuth } from "./lib/adepts-quiz-board-host-auth";
import { logger } from "./lib/logger";
import { setupAdepts } from "./adepts";
import { setupGame } from "./game";
import { setupWheel } from "./wheel";
import { setupQuiz } from "./quiz";
import { setupQuizNav } from "./quiz-nav";

const rawPort = process.env["PORT"] ?? "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
  pingInterval: 5000,   // ping every 5s — keeps proxy alive
  pingTimeout: 20000,   // wait 20s for pong before disconnecting
});

const { adminResetSession } = setupGame(io);
setupWheel(io);
setupQuiz(io);
setupQuizNav(io);
setupAdepts(io);

// Admin endpoint — full roulette reset for one show (`sessionId`, default `default`)
app.post("/api/admin/reset-roulette", requireAdeptsHostAuth, (req, res) => {
  const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>)["sessionId"] : undefined;
  const sessionId =
    typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 128) : "default";
  adminResetSession(sessionId);
  res.json({ ok: true, sessionId });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
