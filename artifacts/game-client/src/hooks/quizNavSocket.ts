import { io, type Socket } from "socket.io-client";

let quizNavSocket: Socket | null = null;

export function getQuizNavSocket(): Socket {
  if (!quizNavSocket) {
    quizNavSocket = io("/quiz-nav", {
      path: "/socket.io",
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
  }
  return quizNavSocket;
}
