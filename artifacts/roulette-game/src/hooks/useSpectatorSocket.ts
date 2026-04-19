import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const MAX_PLAYERS = 5;

export function useSpectatorSocket() {
  const [playerCount, setPlayerCount] = useState(0);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [turn, setTurn] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bulletPos, setBulletPos] = useState(-1);
  const [currentPos, setCurrentPos] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shotResult, setShotResult] = useState<{
    isBang: boolean;
    playerIndex: number;
    pos: number;
  } | null>(null);
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(Array.from({ length: MAX_PLAYERS }, (_, i) => [i, 0]))
  );
  const [rematchTrigger, setRematchTrigger] = useState(0);
  const [fateAnnounced, setFateAnnounced] = useState<{ name: string; text: string } | null>(null);
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    const s = io({ path: "/socket.io", query: { spectator: "1" } });

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
      if (state.playerNames) setPlayerNames(state.playerNames);
      if (state.onlineStatus) setOnlineStatus(state.onlineStatus);
    });

    s.on("startSpin", () => {
      setIsSpinning(true);
      setHasSpun(false);
      setShotResult(null);
    });

    s.on("stopSpin", () => {
      setIsSpinning(false);
      setHasSpun(true);
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

    s.on("rematch", (data?: {
      playerNames?: Record<string, string>;
      onlineStatus?: Record<string, boolean>;
      turn?: number;
      count?: number;
      eliminatedIndex?: number | null;
    }) => {
      setGameOver(false);
      setBulletPos(-1);
      setCurrentPos(0);
      setShotResult(null);
      setIsSpinning(false);
      setHasSpun(false);
      if (data?.playerNames) setPlayerNames(data.playerNames);
      if (data?.onlineStatus) setOnlineStatus(data.onlineStatus);
      if (data?.turn !== undefined) setTurn(data.turn);
      if (data?.count !== undefined) setPlayerCount(data.count);
      if (data?.eliminatedIndex !== null && data?.eliminatedIndex !== undefined) {
        setScores((prev) => ({ ...prev, [data.eliminatedIndex!]: 0 }));
      }
      setFateAnnounced(null);
      setRematchTrigger((n) => n + 1);
    });

    s.on("playerOffline", ({ playerIndex }: { playerIndex: number }) => {
      setOnlineStatus((prev) => ({ ...prev, [String(playerIndex)]: false }));
    });

    s.on("playerOnline", ({ playerIndex }: { playerIndex: number }) => {
      setOnlineStatus((prev) => ({ ...prev, [String(playerIndex)]: true }));
    });

    s.on("fateAnnounced", (data: { name: string; text: string }) => {
      setFateAnnounced(data);
    });

    return () => { s.disconnect(); };
  }, []);

  const allSlotsReady =
    playerCount === MAX_PLAYERS &&
    Object.keys(playerNames).length === MAX_PLAYERS;

  return {
    playerCount,
    playerNames,
    onlineStatus,
    turn,
    isSpinning,
    bulletPos,
    currentPos,
    gameOver,
    shotResult,
    scores,
    rematchTrigger,
    fateAnnounced,
    hasSpun,
    maxPlayers: MAX_PLAYERS,
    allSlotsReady,
  };
}
