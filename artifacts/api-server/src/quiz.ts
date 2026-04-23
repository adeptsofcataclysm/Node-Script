import { Server } from "socket.io";
import { logger } from "./lib/logger";

type QuizState = Record<string, unknown>;

export function setupQuiz(io: Server) {
  const quizNs = io.of("/quiz");
  const roomStates: Record<string, QuizState> = {};

  quizNs.on("connection", (socket) => {
    const room = (socket.handshake.query.room as string) || "default";
    socket.join(room);

    logger.info({ room, socketId: socket.id }, "Quiz client connected");

    if (roomStates[room]) {
      socket.emit("sync", roomStates[room]);
    }

    socket.on("update", (state: QuizState) => {
      roomStates[room] = state;
      socket.to(room).emit("sync", state);
    });

    socket.on("disconnect", () => {
      logger.info({ room, socketId: socket.id }, "Quiz client disconnected");
    });
  });
}
