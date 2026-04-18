import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const MAX_PLAYERS = 5;

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myIndex, setMyIndex] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [turn, setTurn] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bulletPos, setBulletPos] = useState(-1);
  const [currentPos, setCurrentPos] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [shotResult, setShotResult] = useState<{
    isBang: boolean;
    playerIndex: number;
    pos: number;
  } | null>(null);
  const [myName, setMyName] = useState("");
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(Array.from({ length: MAX_PLAYERS }, (_, i) => [i, 0]))
  );
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    const s = io({ path: "/socket.io" });
    setSocket(s);

    s.on("assignedIndex", (index: number) => setMyIndex(index));

    s.on("updatePlayers", ({ count, playerNames }: { count: number; playerNames: Record<string, string> }) => {
      setPlayerCount(count);
      setPlayerNames(playerNames);
    });

    s.on("sync", (state: any) => {
      setBulletPos(state.bulletPos);
      setCurrentPos(state.currentPos);
      setTurn(state.turn);
      setIsSpinning(state.isSpinning);
      setGameOver(state.gameOver);
      setPlayerCount(state.playerCount);
      setRoundCount(state.roundCount);
    });

    s.on("startSpin", () => {
      setIsSpinning(true);
      setHasSpun(false);
      setShotResult(null);
    });

    s.on("stopSpin", ({ roundCount }: { roundCount: number }) => {
      setIsSpinning(false);
      setHasSpun(true);
      setRoundCount(roundCount);
    });

    s.on("shotResult", (result: { isBang: boolean; playerIndex: number; pos: number }) => {
      setShotResult(result);
      if (result.isBang) {
        setGameOver(true);
        setBulletPos(result.pos);
        // everyone except the eliminated player gets +1 survival point
        setScores((prev) => {
          const next = { ...prev };
          for (let i = 0; i < MAX_PLAYERS; i++) {
            if (i !== result.playerIndex) {
              next[i] = (next[i] ?? 0) + 1;
            }
          }
          return next;
        });
      } else {
        setCurrentPos(result.pos);
      }
    });

    s.on("nextTurn", ({ turn }: { turn: number }) => {
      setTurn(turn);
      setHasSpun(false);
      setShotResult(null);
    });

    s.on("rematch", () => {
      setGameOver(false);
      setBulletPos(-1);
      setCurrentPos(0);
      setShotResult(null);
      setIsSpinning(false);
      setHasSpun(false);
    });

    s.on("opponentLeft", () => {
      setOpponentLeft(true);
      setGameOver(false);
      setShotResult(null);
      setHasSpun(false);
    });

    s.on("roomFull", () => setRoomFull(true));

    return () => { s.disconnect(); };
  }, []);

  const connectAndSetName = useCallback((name: string) => {
    setMyName(name);
    if (socket) socket.emit("setName", name);
  }, [socket]);

  const spin = useCallback(() => {
    if (socket) socket.emit("spin");
  }, [socket]);

  const shoot = useCallback(() => {
    if (socket) socket.emit("shoot");
  }, [socket]);

  const rematch = useCallback(() => {
    if (socket) socket.emit("rematch");
  }, [socket]);

  return {
    myIndex,
    playerCount,
    playerNames,
    turn,
    isSpinning,
    bulletPos,
    currentPos,
    gameOver,
    roundCount,
    shotResult,
    myName,
    opponentLeft,
    roomFull,
    scores,
    hasSpun,
    maxPlayers: MAX_PLAYERS,
    connectAndSetName,
    spin,
    shoot,
    rematch,
  };
}
