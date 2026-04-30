import type { Server } from "socket.io";
import { logger } from "./lib/logger";

const MAX_BOARD = 2;

/** Last selected quiz board (0..2), shared with late-joining clients */
let lastBoardIndex: number | null = null;

export function setupQuizNav(io: Server) {
  const ns = io.of("/quiz-nav");

  ns.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Quiz nav client connected");

    if (lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD) {
      socket.emit("phase", { boardIndex: lastBoardIndex });
    }

    socket.on("hostNavigate", (payload: { boardIndex?: unknown }) => {
      const raw = payload?.boardIndex;
      const boardIndex = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > MAX_BOARD) {
        return;
      }
      lastBoardIndex = boardIndex;
      socket.broadcast.emit("phase", { boardIndex });
    });

    socket.on("requestPhase", () => {
      if (lastBoardIndex !== null && lastBoardIndex >= 0 && lastBoardIndex <= MAX_BOARD) {
        socket.emit("phase", { boardIndex: lastBoardIndex });
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Quiz nav client disconnected");
    });
  });
}
