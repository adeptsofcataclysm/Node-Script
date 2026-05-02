import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
import {
  getQuizPandoraNameForCurrentSeat,
  peekFromQuizPandoraSession,
} from "@/lib/quizPandoraRouletteClient";

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
  const [gameInProgress, setGameInProgress] = useState(false);
  const [slotReserved, setSlotReserved] = useState(false);
  const [nameBanned, setNameBanned] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(Array.from({ length: MAX_PLAYERS }, (_, i) => [i, 0]))
  );
  const [hasSpun, setHasSpun] = useState(false);
  const [rematchTrigger, setRematchTrigger] = useState(0);
  const [fateAnnounced, setFateAnnounced] = useState<{ name: string; text: string } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io({
      path: "/socket.io",
      query: { sessionId: getAdeptsSessionId() },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    setSocket(s);

    function resolveAutoPandoraName(): string {
      let n =
        sessionStorage.getItem("pandora_player_name")?.trim().slice(0, 20) ?? "";
      if (!n && peekFromQuizPandoraSession()) {
        n = getQuizPandoraNameForCurrentSeat();
        if (n) sessionStorage.setItem("pandora_player_name", n);
      }
      return n;
    }

    s.on("connect", () => {
      setConnected(true);
      const autoName = resolveAutoPandoraName();
      if (autoName) {
        setMyName(autoName);
        queueMicrotask(() => {
          s.emit("setName", autoName);
        });
      }
    });
    s.on("disconnect", () => setConnected(false));

    // On auto-reconnect: re-send name to reclaim offline slot
    s.io.on("reconnect", () => {
      const savedName = sessionStorage.getItem("pandora_player_name");
      if (savedName) {
        s.emit("setName", savedName);
      }
    });

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
      if (state.gameStarted) setGameStarted(true);
      if (state.playerNames) setPlayerNames(state.playerNames);
      if (state.onlineStatus) setOnlineStatus(state.onlineStatus);
      if (state.scores) setScores(state.scores);
    });

    s.on("startSpin", () => {
      setIsSpinning(true);
      setHasSpun(false);
      setGameStarted(true);
      setShotResult(null);
    });

    s.on("stopSpin", ({ roundCount, currentPos: pos }: { roundCount: number; currentPos?: number }) => {
      setIsSpinning(false);
      setHasSpun(true);
      setRoundCount(roundCount);
      if (pos !== undefined) setCurrentPos(pos);
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
      scores?: Record<number, number>;
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
      if (data?.scores !== undefined) {
        setScores(data.scores);
      } else if (data?.eliminatedIndex !== null && data?.eliminatedIndex !== undefined) {
        // fallback: clear eliminated player's score locally
        setScores((prev) => ({ ...prev, [data.eliminatedIndex!]: 0 }));
      }
      setRematchTrigger((n) => n + 1);
      setFateAnnounced(null);
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

    s.on("roomFull", () => setRoomFull(true));

    s.on("gameInProgress", (data: { playerNames: Record<string, string>; onlineStatus: Record<string, boolean> }) => {
      setPlayerNames(data.playerNames);
      setOnlineStatus(data.onlineStatus);
      let savedName =
        sessionStorage.getItem("pandora_player_name")?.trim().slice(0, 20) ?? "";
      if (!savedName && peekFromQuizPandoraSession()) {
        savedName = getQuizPandoraNameForCurrentSeat();
        if (savedName) sessionStorage.setItem("pandora_player_name", savedName);
      }
      if (savedName) {
        setMyName(savedName);
        s.emit("setName", savedName);
      } else {
        setGameInProgress(true);
      }
    });

    s.on("slotReserved", () => {
      setSlotReserved(true);
      setNameBanned(false);
      setMyName("");
      sessionStorage.removeItem("pandora_player_name");
      setGameInProgress(true);
    });

    s.on("nameBanned", () => {
      setNameBanned(true);
      setSlotReserved(false);
      setMyName("");
      sessionStorage.removeItem("pandora_player_name");
      setGameInProgress(true);
    });

    return () => { s.disconnect(); };
  }, []);

  const connectAndSetName = useCallback((name: string) => {
    setMyName(name);
    setSlotReserved(false);
    setNameBanned(false);
    sessionStorage.setItem("pandora_player_name", name);
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

  const submitFate = useCallback((text: string) => {
    if (socket) socket.emit("setFate", text);
  }, [socket]);

  // Game is ready when all 5 slots filled initially, OR after gameStarted (continues with fewer)
  const allSlotsReady = gameStarted ||
    (playerCount === MAX_PLAYERS && Object.keys(playerNames).length === MAX_PLAYERS);

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
    gameInProgress,
    slotReserved,
    nameBanned,
    scores,
    hasSpun,
    rematchTrigger,
    maxPlayers: MAX_PLAYERS,
    allSlotsReady,
    gameStarted,
    connected,
    connectAndSetName,
    spin,
    shoot,
    rematch,
    submitFate,
    fateAnnounced,
  };
}
