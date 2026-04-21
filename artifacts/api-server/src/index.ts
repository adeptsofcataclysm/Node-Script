import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { setupGame } from "./game";
import { setupWheel } from "./wheel";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

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
  pingInterval: 10000,  // ping every 10s — keeps proxy alive
  pingTimeout: 30000,   // wait 30s for pong before disconnecting
});

const { adminReset } = setupGame(io);
setupWheel(io);

// Admin endpoint — full roulette reset
app.post("/api/admin/reset-roulette", (_req, res) => {
  adminReset();
  res.json({ ok: true });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
