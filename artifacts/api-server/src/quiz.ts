import { Server } from "socket.io";
import { cloneQuizRelay } from "./lib/adepts-quiz-room-store";
import { readSocketSessionId } from "./lib/socket-session-id";
import { logger } from "./lib/logger";

/** Authoritative `/quiz` sync is driven by `/adepts` commands (no client `update`). */
export function setupQuiz(io: Server) {
  const quizNs = io.of("/quiz");
  quizNs.on("connection", (socket) => {
    const sessionId = readSocketSessionId(socket);
    socket.join(sessionId);

    logger.info({ sessionId, socketId: socket.id }, "Quiz client connected");

    socket.emit("sync", cloneQuizRelay(sessionId));

    socket.on("disconnect", () => {
      logger.info({ sessionId, socketId: socket.id }, "Quiz client disconnected");
    });
  });
}
