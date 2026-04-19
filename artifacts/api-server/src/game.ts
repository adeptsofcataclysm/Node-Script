import { type Server, type Socket } from "socket.io";
import { logger } from "./lib/logger";

const MAX_PLAYERS = 5;

interface GameState {
  bulletPos: number;
  currentPos: number;
  playerSockets: Record<number, string>;
  playerNamesByIndex: Record<number, string>;
  connectedCount: number;
  turn: number;
  isSpinning: boolean;
  gameOver: boolean;
  roundCount: number;
}

function createFreshState(): GameState {
  return {
    bulletPos: -1,
    currentPos: 0,
    playerSockets: {},
    playerNamesByIndex: {},
    connectedCount: 0,
    turn: 0,
    isSpinning: false,
    gameOver: false,
    roundCount: 0,
  };
}

export function setupGame(io: Server) {
  let gameState: GameState = createFreshState();

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Player connected");

    if (gameState.connectedCount >= MAX_PLAYERS) {
      socket.emit("roomFull");
      socket.disconnect(true);
      return;
    }

    const playerIndex = gameState.connectedCount;
    gameState.playerSockets[playerIndex] = socket.id;
    gameState.connectedCount += 1;

    socket.emit("assignedIndex", playerIndex);
    io.emit("updatePlayers", {
      count: gameState.connectedCount,
      playerNames: { ...gameState.playerNamesByIndex },
    });

    socket.emit("sync", {
      bulletPos: gameState.bulletPos,
      currentPos: gameState.currentPos,
      turn: gameState.turn,
      isSpinning: gameState.isSpinning,
      gameOver: gameState.gameOver,
      playerCount: gameState.connectedCount,
      roundCount: gameState.roundCount,
    });

    socket.on("setName", (name: string) => {
      const safeName = String(name).slice(0, 20).trim() || `Player ${playerIndex + 1}`;
      gameState.playerNamesByIndex[playerIndex] = safeName;
      io.emit("updatePlayers", {
        count: gameState.connectedCount,
        playerNames: { ...gameState.playerNamesByIndex },
      });
    });

    socket.on("spin", () => {
      if (gameState.playerSockets[gameState.turn] !== socket.id) return;
      if (gameState.isSpinning) return;
      if (gameState.connectedCount < MAX_PLAYERS) return;
      if (gameState.gameOver) return;

      gameState.isSpinning = true;
      gameState.bulletPos = Math.floor(Math.random() * 6);
      gameState.currentPos = 0;
      gameState.roundCount += 1;

      io.emit("startSpin");

      setTimeout(() => {
        gameState.isSpinning = false;
        io.emit("stopSpin", { roundCount: gameState.roundCount });
      }, 1700);
    });

    socket.on("shoot", () => {
      if (gameState.playerSockets[gameState.turn] !== socket.id) return;
      if (gameState.isSpinning) return;
      if (gameState.bulletPos === -1) return;
      if (gameState.gameOver) return;

      const isBang = gameState.currentPos === gameState.bulletPos;
      const shooterIndex = gameState.turn;

      if (isBang) {
        gameState.gameOver = true;
        gameState.bulletPos = -1;
        io.emit("shotResult", {
          isBang: true,
          playerIndex: shooterIndex,
          pos: gameState.currentPos,
        });
      } else {
        gameState.currentPos = (gameState.currentPos + 1) % 6;
        gameState.turn = (gameState.turn + 1) % MAX_PLAYERS;
        io.emit("shotResult", {
          isBang: false,
          playerIndex: shooterIndex,
          pos: gameState.currentPos,
        });
        io.emit("nextTurn", { turn: gameState.turn });
      }
    });

    socket.on("rematch", () => {
      if (!gameState.gameOver) return;
      const savedNames = { ...gameState.playerNamesByIndex };
      const savedSockets = { ...gameState.playerSockets };
      const savedCount = gameState.connectedCount;

      gameState = createFreshState();
      gameState.playerNamesByIndex = savedNames;
      gameState.playerSockets = savedSockets;
      gameState.connectedCount = savedCount;

      io.emit("rematch");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Player disconnected");

      delete gameState.playerSockets[playerIndex];
      gameState.connectedCount -= 1;

      gameState.bulletPos = -1;
      gameState.currentPos = 0;
      gameState.turn = 0;
      gameState.isSpinning = false;
      gameState.gameOver = false;
      gameState.roundCount = 0;

      io.emit("updatePlayers", {
        count: gameState.connectedCount,
        playerNames: { ...gameState.playerNamesByIndex },
      });
      io.emit("opponentLeft");
    });
  });
}
