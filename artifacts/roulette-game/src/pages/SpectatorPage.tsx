import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpectatorSocket } from "../hooks/useSpectatorSocket";
import { Cylinder } from "../components/Cylinder";
import { PlayerCard, PLAYER_COLORS } from "../components/PlayerCard";

const BG_URL = "url('https://thumbs.dreamstime.com/b/ilustraci%C3%B3n-digital-de-la-caja-pandora-con-luz-m%C3%A1gica-p%C3%BArpura-enciende-llamas-que-escapan-fantas%C3%ADa-esfera-brillante-energ%C3%ADa-385669089.jpg?w=768')";
const GHOST_URL = "https://s3-eu-west-1.amazonaws.com/wdildnproject2/toasty.png";

function playSpinTicks() {
  try { const a = new Audio("/spin.mp3"); a.volume = 1; a.play(); } catch (_) {}
}
function playClickSound() {
  try { const a = new Audio("/click.mp3"); a.volume = 1; a.play(); } catch (_) {}
}
function playBangSound() {
  try { const a = new Audio("/bang.mp3"); a.volume = 1; a.play(); } catch (_) {}
}
function playToasty() {
  try { const a = new Audio("/toasty.mp3"); a.volume = 0.85; a.play(); } catch (_) {}
}

export function SpectatorPage() {
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
  } = useSpectatorSocket();

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const gameReady = allSlotsReady;

  // Music: autoplay on gameReady, fallback via first interaction
  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.45;
    musicRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {});
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };

    if (gameReady) {
      audio.play().catch(() => {
        window.addEventListener("click", tryPlay);
        window.addEventListener("keydown", tryPlay);
      });
    } else {
      window.addEventListener("click", tryPlay);
      window.addEventListener("keydown", tryPlay);
    }

    return () => {
      audio.pause();
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [gameReady]);

  // Spin sound
  useEffect(() => {
    if (isSpinning) playSpinTicks();
  }, [isSpinning]);

  // Shot sounds
  useEffect(() => {
    if (shotResult) {
      if (shotResult.isBang) {
        playBangSound();
      } else {
        playClickSound();
      }
    }
  }, [shotResult]);

  // Stop music on BANG
  useEffect(() => {
    if (shotResult?.isBang && musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
  }, [shotResult]);

  // Restart music on rematch
  useEffect(() => {
    if (rematchTrigger > 0 && musicRef.current) {
      musicRef.current.currentTime = 0;
      musicRef.current.play().catch(() => {});
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
      playToasty();
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

      {/* Spectator badge */}
      <div
        className="fixed top-4 right-5 z-20 px-3 py-1 font-mono text-xs uppercase tracking-[3px]"
        style={{
          border: "1px solid #9b59b6",
          color: "#9b59b6",
          background: "rgba(0,0,0,0.7)",
          textShadow: "0 0 8px #9b59b6",
        }}
      >
        Наблюдатель
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

        {/* No controls — spectator only */}
        <p
          className="text-xs font-mono uppercase tracking-[4px]"
          style={{ color: "#555" }}
        >
          {gameReady && !gameOver ? "— только наблюдение —" : ""}
        </p>

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

              <p
                className="text-xs font-mono uppercase tracking-[3px]"
                style={{ color: "#555" }}
              >
                Ожидание следующего раунда...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
