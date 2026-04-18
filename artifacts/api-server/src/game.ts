import { type Server, type Socket } from "socket.io";
import { logger } from "./lib/logger";

interface GameState {
  bulletPos: number;
  currentPos: number;
  players: string[];
  playerNamesByIndex: Record<number, string>;
  turn: number;
  isSpinning: boolean;
  gameOver: boolean;
  roundCount: number;
}

function createFreshState(): GameState {
  return {
    bulletPos: -1,
    currentPos: 0,
    players: [],
    playerNamesByIndex: {},
    turn: 0,
    isSpinning: false,
    gameOver: false,
    roundCount: 0,
  };
}

export function setupGame(io: Server) {
  const gameState: GameState = createFreshState();

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Player connected");

    if (gameState.players.length >= 2) {
      socket.emit("roomFull");
      socket.disconnect(true);
      return;
    }

    const playerIndex = gameState.players.length;
    gameState.players.push(socket.id);

    socket.emit("assignedIndex", playerIndex);
    io.emit("updatePlayers", {
      count: gameState.players.length,
      playerNames: { ...gameState.playerNamesByIndex },
    });

    socket.emit("sync", {
      bulletPos: gameState.bulletPos,
      currentPos: gameState.currentPos,
      turn: gameState.turn,
      isSpinning: gameState.isSpinning,
      gameOver: gameState.gameOver,
      playerCount: gameState.players.length,
      roundCount: gameState.roundCount,
    });

    socket.on("setName", (name: string) => {
      const safeName = String(name).slice(0, 20).trim() || `Player ${playerIndex + 1}`;
      gameState.playerNamesByIndex[playerIndex] = safeName;
      io.emit("updatePlayers", {
        count: gameState.players.length,
        playerNames: { ...gameState.playerNamesByIndex },
      });
    });

    socket.on("spin", () => {
      if (gameState.players[gameState.turn] !== socket.id) return;
      if (gameState.isSpinning) return;
      if (gameState.players.length < 2) return;
      if (gameState.gameOver) return;

      gameState.isSpinning = true;
      gameState.bulletPos = Math.floor(Math.random() * 6);
      gameState.currentPos = 0;
      gameState.roundCount += 1;

      io.emit("startSpin");

      setTimeout(() => {
        gameState.isSpinning = false;
        io.emit("stopSpin", { roundCount: gameState.roundCount });
      }, 2500);
    });

    socket.on("shoot", () => {
      if (gameState.players[gameState.turn] !== socket.id) return;
      if (gameState.isSpinning) return;
      if (gameState.bulletPos === -1) return;
      if (gameState.gameOver) return;

      const isBang = gameState.currentPos === gameState.bulletPos;

      io.emit("shotResult", {
        isBang,
        playerIndex: gameState.turn,
        pos: gameState.currentPos,
        shooterId: socket.id,
      });

      if (isBang) {
        gameState.gameOver = true;
        gameState.bulletPos = -1;
      } else {
        gameState.currentPos = (gameState.currentPos + 1) % 6;
        gameState.turn = (gameState.turn + 1) % 2;
        io.emit("nextTurn", { turn: gameState.turn });
      }
    });

    socket.on("rematch", () => {
      if (!gameState.gameOver) return;
      const savedNames = { ...gameState.playerNamesByIndex };
      const savedPlayers = [...gameState.players];

      gameState.bulletPos = -1;
      gameState.currentPos = 0;
      gameState.turn = 0;
      gameState.isSpinning = false;
      gameState.gameOver = false;
      gameState.roundCount = 0;
      gameState.playerNamesByIndex = savedNames;
      gameState.players = savedPlayers;

      io.emit("rematch");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Player disconnected");
      const disconnectedIndex = gameState.players.indexOf(socket.id);
      gameState.players = gameState.players.filter((id) => id !== socket.id);
      if (disconnectedIndex !== -1) {
        delete gameState.playerNamesByIndex[disconnectedIndex];
      }

      if (gameState.players.length < 2) {
        gameState.bulletPos = -1;
        gameState.currentPos = 0;
        gameState.turn = 0;
        gameState.isSpinning = false;
        gameState.gameOver = false;
        gameState.roundCount = 0;
      }

      io.emit("updatePlayers", {
        count: gameState.players.length,
        playerNames: { ...gameState.playerNamesByIndex },
      });
      io.emit("opponentLeft");
    });
  });
}
