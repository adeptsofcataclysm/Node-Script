import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
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

const { adminReset } = setupGame(io);
setupWheel(io);
setupQuiz(io);
setupQuizNav(io);

// Admin endpoint — full roulette reset
app.post("/api/admin/reset-roulette", (_req, res) => {
  adminReset();
  res.json({ ok: true });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
