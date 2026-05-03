import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpectatorSocket } from "../hooks/useSpectatorSocket";
import { useRole } from "@/hooks/useRole";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  QUIZ_PANDORA_FROM_QUIZ_KEY,
  QUIZ_PANDORA_RETURN_KEY,
} from "@/lib/quizPandoraRouletteClient";
import { Cylinder } from "../components/Cylinder";
import { PlayerCard, PLAYER_COLORS } from "../components/PlayerCard";
import { PandoraButton } from "@/components/PandoraButton";
import { playSound, preloadSounds, unlockSounds } from "../utils/sfx";

const BG_URL = "url('/pandora-bg.png')";
const GHOST_URL = "https://s3-eu-west-1.amazonaws.com/wdildnproject2/toasty.png";

export function SpectatorPage() {
  useEffect(() => { fetch("/api/track/spectate", { method: "POST" }).catch(() => {}); }, []);
  const { isHost } = useRole();
  const isMobile = useIsMobile();
  const [fromQuizPandora, setFromQuizPandora] = useState(false);

  useEffect(() => {
    try {
      setFromQuizPandora(sessionStorage.getItem(QUIZ_PANDORA_FROM_QUIZ_KEY) === "1");
    } catch {
      setFromQuizPandora(false);
    }
  }, []);
  const {
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
    maxPlayers,
    allSlotsReady,
    gameStarted,
    connected,
    hostPassTurn,
  } = useSpectatorSocket();

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const bangRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const gameReady = allSlotsReady;
  const currentTurnOffline =
    gameReady &&
    gameStarted &&
    !gameOver &&
    onlineStatus[String(turn)] === false;

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (musicRef.current) musicRef.current.volume = next ? 0 : 0.45;
    if (bangRef.current) bangRef.current.volume = next ? 0 : 1;
  };

  // Preload all sound effects eagerly on mount
  useEffect(() => { preloadSounds(); }, []);

  // Create music once on mount, play as soon as user interacts or gameReady
  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.45;
    musicRef.current = audio;

    const tryPlay = () => {
      // Unlock all sfx sounds on first user gesture (important for iOS Safari)
      unlockSounds();
      if (!mutedRef.current) audio.play().catch(() => {});
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
    window.addEventListener("click", tryPlay);
    window.addEventListener("keydown", tryPlay);

    return () => {
      audio.pause();
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, []); // once on mount

  // Start music when all players are ready
  useEffect(() => {
    if (gameReady && musicRef.current && !mutedRef.current) {
      musicRef.current.currentTime = 0;
      musicRef.current.play().catch(() => {});
    }
  }, [gameReady]);

  // Spin sound
  useEffect(() => {
    if (isSpinning && !mutedRef.current) playSound("spin");
  }, [isSpinning]);

  // Shot sounds + stop music on BANG
  useEffect(() => {
    if (!shotResult) return;
    if (shotResult.isBang) {
      // Stop main music
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
      // Play bang, keep reference so we can stop it on rematch
      const bang = new Audio("/bang.mp3");
      bang.volume = mutedRef.current ? 0 : 1;
      bang.play().catch(() => {});
      bangRef.current = bang;
    } else {
      if (!mutedRef.current) playSound("click");
    }
  }, [shotResult]);

  // Restart music on rematch, stop lingering bang
  useEffect(() => {
    if (rematchTrigger === 0) return;
    // Kill bang sound if still playing
    if (bangRef.current) {
      bangRef.current.pause();
      bangRef.current.currentTime = 0;
      bangRef.current = null;
    }
    // Restart main music
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
      if (!mutedRef.current) musicRef.current.play().catch(() => {});
    }
  }, [rematchTrigger]);

  // Ghost apparition
  const [showGhost, setShowGhost] = useState(false);
  const [ghostPos, setGhostPos] = useState({ top: "20%", left: "10%" });
  const turnsSinceGhost = useRef(0);
  const prevTurn = useRef<number | null>(null);

  useEffect(() => {
    if (!gameReady || gameOver) {
      prevTurn.current = null;
      return;
    }
    if (prevTurn.current === null) { prevTurn.current = turn; return; }
    if (prevTurn.current === turn) return;
    prevTurn.current = turn;
    turnsSinceGhost.current += 1;
    if (turnsSinceGhost.current >= 3 && Math.random() < 0.45) {
      turnsSinceGhost.current = 0;
      const positions = [
        { top: "8%", left: "5%" },
        { top: "8%", left: "68%" },
        { top: "60%", left: "5%" },
        { top: "60%", left: "68%" },
      ];
      setGhostPos(positions[Math.floor(Math.random() * positions.length)]);
      setShowGhost(true);
      if (!mutedRef.current) playSound("toasty");
      setTimeout(() => setShowGhost(false), 3100);
    }
  }, [turn, gameReady, gameOver]);

  useEffect(() => {
    if (gameOver) turnsSinceGhost.current = 0;
  }, [gameOver]);

  const turnPlayerName = playerNames[String(turn)] || `P${turn + 1}`;
  const turnColor = PLAYER_COLORS[turn] ?? "#9b59b6";
  const eliminatedName = shotResult?.isBang
    ? (playerNames[String(shotResult.playerIndex)] || `P${shotResult.playerIndex + 1}`)
    : null;

  return (
    <div className="game-root flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0" style={{ backgroundImage: BG_URL, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.25) contrast(1.2)" }} />
      <img src="/my-image.png" alt="" className="corner-logo" />

      {/* Bottom-right: ведущий — возврат на квиз после «Ящика Пандоры» с доски */}
      {isHost && fromQuizPandora && (
        <button
          type="button"
          onClick={() => {
            getQuizNavSocket().emit("hostPandoraRouletteReturn");
            setTimeout(() => {
              try {
                const stored = sessionStorage.getItem(QUIZ_PANDORA_RETURN_KEY);
                const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
                window.location.assign(
                  stored && stored.length > 0 ? stored : `${bp}/adepts-game/`,
                );
              } catch {
                const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
                window.location.assign(`${bp}/adepts-game/`);
              }
            }, 250);
          }}
          className="adepts-quiz-theme fixed bottom-[18px] right-[18px] z-30 cursor-pointer whitespace-nowrap rounded-lg border border-purple-500/60 bg-purple-950/70 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-purple-200 shadow-[0_0_20px_hsla(280,70%,50%,0.35)] backdrop-blur-sm transition hover:border-purple-400 hover:bg-purple-900/80 hover:shadow-[0_0_28px_hsla(280,70%,55%,0.45)]"
        >
          На доску квиза
        </button>
      )}

      {/* Bottom-right: legacy wheel link — только ведущий на /spectate (не зрители) */}
      {isHost && !fromQuizPandora && (
        <a
          href="https://node-script--gg22last.replit.app/adepts"
          style={{
            position: "fixed", bottom: 18, right: 18, zIndex: 30,
            padding: "9px 20px",
            border: "1px solid #f1c40f",
            background: "rgba(0,0,0,0.75)",
            color: "#f1c40f",
            fontFamily: "monospace", fontSize: 12,
            textTransform: "uppercase", letterSpacing: "3px",
            textDecoration: "none",
            textShadow: "0 0 10px rgba(241,196,15,0.6)",
            boxShadow: "0 0 14px rgba(241,196,15,0.15)",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          Колесо Адептов
        </a>
      )}

      {/* Top-left: spectator badge + avatar + text */}
      <div className="fixed top-4 left-4 z-30 flex flex-col items-center gap-1" style={{ width: 148 }}>
        <div
          className="px-3 py-1 font-mono text-xs uppercase tracking-[3px] w-full text-center"
          style={{
            border: "1px solid #9b59b6",
            color: "#9b59b6",
            background: "rgba(0,0,0,0.7)",
            textShadow: "0 0 8px #9b59b6",
          }}
        >
          Наблюдатель
        </div>
        <img
          src="/spectator-avatar.png"
          alt="spectator"
          style={{ width: "100%", borderRadius: "50%", display: "block", border: "1px solid #9b59b6", boxShadow: "0 0 8px rgba(155,89,182,0.5)" }}
        />
        <div
          className="font-mono text-center"
          style={{ fontSize: 13, color: "#9b59b6", lineHeight: 1.3, marginTop: 2 }}
        >
          {"\"Ненавижу, ебучее програмирование!\"\u00A0(с)"}
        </div>
      </div>

      {/* Top-right: mute button + online indicator */}
      <div className="fixed top-4 right-4 z-30 flex flex-col items-end gap-2">
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: connected ? "#2ecc71" : "#e74c3c" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c", boxShadow: connected ? "0 0 8px #2ecc71" : "0 0 8px #e74c3c" }} />
            {connected ? "Онлайн" : "Подключение..."}
          </div>
        )}
        <button
          onClick={toggleMute}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", opacity: muted ? 1 : 0.55 }}
          title={muted ? "Включить звук" : "Выключить звук"}
        >
          <img src="/mute.png" alt="mute" style={{ width: 38, height: 38, display: "block" }} />
        </button>
      </div>

      {/* BANG flash */}
      <AnimatePresence>
        {shotResult?.isBang && (
          <motion.div
            key="bang-flash"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: "rgba(231,76,60,0.4)", mixBlendMode: "screen" }}
          />
        )}
      </AnimatePresence>

      {/* Ghost apparition */}
      <AnimatePresence>
        {showGhost && (
          <motion.div
            key="ghost"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.85, 0.85, 0] }}
            transition={{ duration: 3, times: [0, 0.15, 0.75, 1] }}
            className="fixed z-30 pointer-events-none"
            style={{ top: ghostPos.top, left: ghostPos.left }}
          >
            <img
              src={GHOST_URL}
              alt=""
              style={{
                width: "180px",
                filter: "drop-shadow(0 0 18px rgba(155,89,182,0.9)) brightness(0.9) contrast(1.1)",
                borderRadius: "8px",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoreboard */}
      <div className="w-full max-w-3xl flex flex-wrap justify-center items-center gap-2 pt-6 pb-2 px-4 z-10">
        {Array.from({ length: maxPlayers }, (_, i) => (
          <PlayerCard
            key={i}
            name={playerNames[String(i)] || `P${i + 1}`}
            score={scores[i] ?? 0}
            isActive={turn === i && gameReady && !gameOver}
            playerIndex={i}
            isEliminated={gameOver && !!shotResult?.isBang && shotResult.playerIndex === i}
            isOffline={onlineStatus[String(i)] === false}
          />
        ))}
      </div>

      {/* Cylinder + turn announcer */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 pb-10">

        {/* Turn announcer */}
        <div className="h-8 flex items-center justify-center">
          {!gameReady ? (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-sm font-mono uppercase tracking-[3px]"
              style={{ color: "#9b59b6" }}
            >
              Ожидание игроков... ({playerCount}/{maxPlayers})
            </motion.p>
          ) : !gameOver ? (
            <motion.p
              key={`turn-${turn}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-bold uppercase tracking-[3px]"
              style={{ color: turnColor }}
            >
              Ход: {turnPlayerName}
            </motion.p>
          ) : null}
        </div>

        <Cylinder
          key={rematchTrigger}
          currentPos={currentPos}
          bulletPos={bulletPos}
          isSpinning={isSpinning}
          gameOver={gameOver}
        />

        {isHost && currentTurnOffline && !isSpinning ? (
          <div className="flex gap-5">
            <PandoraButton
              type="button"
              onClick={hostPassTurn}
              data-testid="button-host-pass-turn"
            >
              Передать ход
            </PandoraButton>
          </div>
        ) : (
          <p
            className="text-xs font-mono uppercase tracking-[4px]"
            style={{ color: "#555" }}
          >
            {gameReady && !gameOver ? "— только наблюдение —" : ""}
          </p>
        )}

      </div>

      {/* Game over overlay */}
      <AnimatePresence>
        {gameOver && shotResult?.isBang && (
          <motion.div
            key="result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center text-center px-6"
            style={{ background: "rgba(0,0,0,0.92)" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex flex-col items-center gap-6 w-full max-w-md"
            >
              <div
                className="text-6xl font-bold uppercase tracking-[6px]"
                style={{ color: "#e74c3c", textShadow: "0 0 30px #e74c3c" }}
              >
                WASTED
              </div>
              <h1
                className="text-2xl font-bold uppercase tracking-widest"
                style={{ color: "white", textShadow: "0 0 20px #9b59b6" }}
              >
                Игрока {eliminatedName} поглотила тьма!
              </h1>

              <AnimatePresence>
                {fateAnnounced && (
                  <motion.div
                    key="fate-box"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col gap-2"
                  >
                    <p className="text-xs font-mono uppercase tracking-[3px]" style={{ color: "#aaa" }}>
                      Судьба {fateAnnounced.name}:
                    </p>
                    <div
                      className="w-full p-4 text-sm font-mono text-left"
                      style={{
                        border: "1px solid #9b59b6",
                        color: "#ddd",
                        background: "rgba(155,89,182,0.08)",
                      }}
                    >
                      {fateAnnounced.text}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isHost && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  type="button"
                  onClick={() => getQuizNavSocket().emit("hostPandoraLottoOpen")}
                  className="w-full py-3 font-mono text-xs uppercase tracking-[3px] transition-all duration-200"
                  style={{
                    background: "transparent",
                    border: "1px solid #9b59b6",
                    color: "#9b59b6",
                    textShadow: "0 0 8px #9b59b6",
                    boxShadow: "0 0 16px rgba(155,89,182,0.25)",
                    cursor: "pointer",
                  }}
                >
                  Заменить игрока за столом
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
