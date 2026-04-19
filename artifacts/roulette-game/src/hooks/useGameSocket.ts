import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const MAX_PLAYERS = 5;

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myIndex, setMyIndex] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
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
  const [roomFull, setRoomFull] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(Array.from({ length: MAX_PLAYERS }, (_, i) => [i, 0]))
  );
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    const s = io({ path: "/socket.io" });
    setSocket(s);

    s.on("assignedIndex", (index: number) => setMyIndex(index));

    s.on("updatePlayers", ({ count, playerNames, onlineStatus }: {
      count: number;
      playerNames: Record<string, string>;
      onlineStatus: Record<string, boolean>;
    }) => {
      setPlayerCount(count);
      setPlayerNames(playerNames);
      setOnlineStatus(onlineStatus);
    });

    s.on("sync", (state: any) => {
      setBulletPos(state.bulletPos);
      setCurrentPos(state.currentPos);
      setTurn(state.turn);
      setIsSpinning(state.isSpinning);
      setGameOver(state.gameOver);
      setPlayerCount(state.playerCount);
      setRoundCount(state.roundCount);
      if (state.playerNames) setPlayerNames(state.playerNames);
      if (state.onlineStatus) setOnlineStatus(state.onlineStatus);
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
      } else {
        setCurrentPos(result.pos);
        setScores((prev) => ({
          ...prev,
          [result.playerIndex]: (prev[result.playerIndex] ?? 0) + 1,
        }));
      }
    });

    s.on("nextTurn", ({ turn }: { turn: number }) => {
      setTurn(turn);
      setShotResult(null);
      setHasSpun(false);
    });

    s.on("rematch", (data?: { playerNames?: Record<string, string>; onlineStatus?: Record<string, boolean> }) => {
      setGameOver(false);
      setBulletPos(-1);
      setCurrentPos(0);
      setShotResult(null);
      setIsSpinning(false);
      setHasSpun(false);
      if (data?.playerNames) setPlayerNames(data.playerNames);
      if (data?.onlineStatus) setOnlineStatus(data.onlineStatus);
    });

    s.on("playerOffline", ({ playerIndex }: { playerIndex: number }) => {
      setOnlineStatus((prev) => ({ ...prev, [String(playerIndex)]: false }));
    });

    s.on("playerOnline", ({ playerIndex }: { playerIndex: number }) => {
      setOnlineStatus((prev) => ({ ...prev, [String(playerIndex)]: true }));
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

  const allSlotsReady = playerCount === MAX_PLAYERS &&
    Object.keys(playerNames).length === MAX_PLAYERS;

  return {
    myIndex,
    playerCount,
    playerNames,
    onlineStatus,
    turn,
    isSpinning,
    bulletPos,
    currentPos,
    gameOver,
    roundCount,
    shotResult,
    myName,
    roomFull,
    scores,
    hasSpun,
    maxPlayers: MAX_PLAYERS,
    allSlotsReady,
    connectAndSetName,
    spin,
    shoot,
    rematch,
  };
}
