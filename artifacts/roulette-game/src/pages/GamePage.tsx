import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSocket } from "../hooks/useGameSocket";
import { useIsMobile } from "../hooks/useIsMobile";
import { Cylinder } from "../components/Cylinder";
import { DefeatScreen } from "../components/DefeatScreen";
import { PlayerCard, PLAYER_COLORS } from "../components/PlayerCard";
import { Input } from "@/components/ui/input";

const BG_URL = "url('https://thumbs.dreamstime.com/b/ilustraci%C3%B3n-digital-de-la-caja-pandora-con-luz-m%C3%A1gica-p%C3%BArpura-enciende-llamas-que-escapan-fantas%C3%ADa-esfera-brillante-energ%C3%ADa-385669089.jpg?w=768')";
const GHOST_URL = "https://s3-eu-west-1.amazonaws.com/wdildnproject2/toasty.png";
function playSpinTicks() {
  try {
    const audio = new Audio("/spin.mp3");
    audio.volume = 1;
    audio.play();
  } catch (_) {}
}
function playClickSound() {
  try {
    const audio = new Audio("/click.mp3"); // Холостой выстрел
    audio.volume = 1;
    audio.play();
  } catch (_) {}
}
function playBangSound() {
  try {
    const audio = new Audio("/bang.mp3"); // Смертельный выстрел
    audio.volume = 1.0;
    audio.play();
  } catch (_) {}
}
function playToasty() {
  try {
    const audio = new Audio("/toasty.mp3");
    audio.volume = 0.85;
    audio.play();
  } catch (_) {}
}

export function GamePage() {
  useEffect(() => { fetch("/api/track/game", { method: "POST" }).catch(() => {}); }, []);
  const isMobile = useIsMobile();
  const [nameInput, setNameInput] = useState("");
  const [showCestLaVie, setShowCestLaVie] = useState(false);
  const wasEliminatedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (musicRef.current) musicRef.current.volume = next ? 0 : 0.45;
  };
  const {
    myIndex,
    playerCount,
    playerNames,
    onlineStatus,
    turn,
    isSpinning,
    bulletPos,
    currentPos,
    gameOver,
    shotResult,
    myName,
    roomFull,
    gameInProgress,
    slotReserved,
    nameBanned,
    scores,
    hasSpun,
    rematchTrigger,
    maxPlayers,
    allSlotsReady,
    gameStarted,
    connected,
    connectAndSetName,
    spin,
    shoot,
    rematch,
    submitFate,
    fateAnnounced,
  } = useGameSocket();
  // Звук кручения барабана
  useEffect(() => {
    if (isSpinning && !mutedRef.current) playSpinTicks();
  }, [isSpinning]);

  // Звук выстрела (результат)
  useEffect(() => {
    if (shotResult) {
      if (shotResult.isBang) {
        if (!mutedRef.current) playBangSound();
      } else {
        if (!mutedRef.current) playClickSound();
      }
    }
  }, [shotResult]);

  // Track elimination so we can show C'est la vie on rematch
  useEffect(() => {
    if (gameOver && shotResult?.isBang && shotResult.playerIndex === myIndex) {
      wasEliminatedRef.current = true;
    }
  }, [gameOver, shotResult, myIndex]);
  // Apparition state
  const [showGhost, setShowGhost] = useState(false);
  const [ghostPos, setGhostPos] = useState({ top: "20%", left: "10%" });
  const turnsSinceGhost = useRef(0);
  const prevTurn = useRef<number | null>(null);

  const gameReady = allSlotsReady;
  const isMyTurn = myIndex !== null && myIndex === turn && gameReady && !gameOver;

  // Detect turn changes and maybe trigger ghost
  useEffect(() => {
    if (!gameReady || gameOver) {
      prevTurn.current = null;
      return;
    }
    if (prevTurn.current === null) {
      prevTurn.current = turn;
      return;
    }
    if (prevTurn.current === turn) return;
    prevTurn.current = turn;

    turnsSinceGhost.current += 1;

    if (turnsSinceGhost.current >= 3 && Math.random() < 0.45) {
      turnsSinceGhost.current = 0;

      // Random screen position (avoid center where cylinder is)
      const positions = [
        { top: "8%", left: "5%" },
        { top: "8%", left: "68%" },
        { top: "60%", left: "5%" },
        { top: "60%", left: "68%" },
        { top: "35%", left: "2%" },
        { top: "35%", left: "72%" },
      ];
      setGhostPos(positions[Math.floor(Math.random() * positions.length)]);
      setShowGhost(true);
      if (!mutedRef.current) playToasty();

      setTimeout(() => setShowGhost(false), 3000);
    }
  }, [turn, gameReady, gameOver]);

  // Reset counter on rematch
  useEffect(() => {
    if (!gameOver) {
      turnsSinceGhost.current = 0;
    }
  }, [gameOver]);

  // Restart music on rematch; show C'est la vie to eliminated player
  useEffect(() => {
    if (rematchTrigger > 0) {
      if (wasEliminatedRef.current) {
        setShowCestLaVie(true);
        wasEliminatedRef.current = false;
      }
      if (musicRef.current) {
        musicRef.current.currentTime = 0;
        if (!mutedRef.current) musicRef.current.play().catch(() => {});
      }
    }
  }, [rematchTrigger]);

  // Stop music on any shot
  useEffect(() => {
    if (shotResult?.isBang && musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
  }, [shotResult]);

  // Music: start when all players ready, stop when someone leaves
  useEffect(() => {
    if (!musicRef.current) {
      const audio = new Audio("/music.mp3");
      audio.loop = true;
      audio.volume = 0.45;
      musicRef.current = audio;
    }
    const audio = musicRef.current;

    if (gameReady) {
      const tryPlay = () => { if (!mutedRef.current) audio.play().catch(() => {}); };
      tryPlay();
      // Browsers may block autoplay — retry on first user interaction
      const onInteract = () => {
        if (!mutedRef.current) audio.play().catch(() => {});
        document.removeEventListener("click", onInteract);
        document.removeEventListener("keydown", onInteract);
      };
      document.addEventListener("click", onInteract);
      document.addEventListener("keydown", onInteract);
      return () => {
        document.removeEventListener("click", onInteract);
        document.removeEventListener("keydown", onInteract);
        audio.pause();
      };
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [gameReady]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) connectAndSetName(nameInput.trim());
  };

  if (roomFull) {
    return (
      <div className="game-root flex items-center justify-center p-4">
        <div className="pandora-card text-center p-10 rounded-xl max-w-md w-full">
          <h2 className="text-3xl font-bold uppercase tracking-widest mb-4" style={{ color: "#9b59b6" }}>
            Room Full
          </h2>
          <p className="text-gray-400 font-mono text-sm">A game is already in progress.</p>
        </div>
      </div>
    );
  }

  if (!myName) {
    return (
      <div className="game-root flex items-center justify-center p-4">
        <div className="fixed inset-0 z-0" style={{ backgroundImage: BG_URL, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.3) contrast(1.2)" }} />
        <img src="/my-image.png" alt="" className="corner-logo" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pandora-card text-center p-10 rounded-xl max-w-md w-full relative z-10"
        >
          <h1 className="text-5xl font-bold uppercase tracking-widest mb-1" style={{ color: "white" }}>
            ЯЩИК ПАНДОРЫ
          </h1>
          <p className="text-sm font-mono uppercase tracking-[5px] mb-8" style={{ color: "#9b59b6" }}>
           маму ебал, как я люблю кодить
          </p>

          {gameInProgress && (
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#f39c12" }}>
              Игра идёт. Введите своё прежнее имя для возврата.
            </p>
          )}
          {slotReserved && (
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#e74c3c" }}>
              Этот ник не зарезервирован. Введите своё прежнее имя.
            </p>
          )}
          {nameBanned && (
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#e74c3c" }}>
              Этот игрок выбыл из игры. Войдите под другим именем.
            </p>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              type="text"
              placeholder={gameInProgress ? "Ваше прежнее имя" : "Введите своё имя"}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="bg-black/60 border text-center font-mono uppercase tracking-wider h-12 rounded-none focus-visible:ring-0"
              style={{ borderColor: (slotReserved || nameBanned) ? "#e74c3c" : "#9b59b6", color: "white" }}
              maxLength={12}
              required
              data-testid="input-alias"
            />
            <PandoraButton type="submit" disabled={!nameInput.trim()} data-testid="button-enter-room">
              {gameInProgress ? "Вернуться" : "Открыть ящик"}
            </PandoraButton>
          </form>
        </motion.div>
      </div>
    );
  }

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

      {/* Top-right: mute + online indicator */}
      <div className="fixed z-30 flex flex-col items-end gap-2" style={{ top: 16, right: 16 }}>
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

      {/* Cylinder + controls */}
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
              {isMyTurn ? "Your Turn" : `${turnPlayerName}'s Turn`}
            </motion.p>
          ) : null}
        </div>

        {/* Cylinder */}
        <Cylinder
          key={rematchTrigger}
          currentPos={currentPos}
          bulletPos={bulletPos}
          isSpinning={isSpinning}
          gameOver={gameOver}
        />

        {/* Controls */}
        <div className="flex gap-5">
          <PandoraButton onClick={spin} disabled={!isMyTurn || isSpinning || hasSpun || gameOver} data-testid="button-spin">
            Крутить
          </PandoraButton>
          <PandoraButton onClick={shoot} disabled={!isMyTurn || isSpinning || !hasSpun || gameOver} data-testid="button-shoot">
            Испытать судьбу
          </PandoraButton>
        </div>

      </div>

      {/* Defeat screen — shown only to the eliminated player */}
      <AnimatePresence>
        {gameOver && shotResult?.isBang && myIndex !== null && shotResult.playerIndex === myIndex && (
          <DefeatScreen
            key="defeat-screen"
            playerName={eliminatedName}
          />
        )}
      </AnimatePresence>

      {/* Game over overlay — shown to surviving players */}
      <AnimatePresence>
        {gameOver && shotResult?.isBang && (myIndex === null || shotResult.playerIndex !== myIndex) && (
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

              {/* Fate announcement */}
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
                        boxShadow: "inset 0 0 16px rgba(155,89,182,0.1)",
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

      {/* C'est la vie — shown to eliminated player after rematch */}
      <AnimatePresence>
        {showCestLaVie && (
          <motion.div
            key="cest-la-vie"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: "#000" }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 px-10 py-12"
              style={{
                border: "1px solid #333",
                background: "#0a0a0a",
                maxWidth: 420,
                width: "90%",
              }}
            >
              <div
                className="font-black italic text-center"
                style={{
                  fontSize: "clamp(2.8rem, 10vw, 5rem)",
                  color: "#fff",
                  letterSpacing: "-1px",
                  textShadow: "0 0 40px rgba(255,255,255,0.08)",
                  fontFamily: "Georgia, serif",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                C'est la vie
              </div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                className="w-full h-px"
                style={{ background: "linear-gradient(to right, transparent, #333, transparent)" }}
              />

              <p
                className="font-mono text-xs uppercase tracking-[3px] text-center"
                style={{ color: "#333" }}
              >
                Таков жребий
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PandoraButton({
  children,
  onClick,
  disabled,
  type = "button",
  "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  "data-testid"?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full px-9 py-4 font-bold uppercase tracking-widest border transition-all duration-200 disabled:opacity-10 disabled:cursor-not-allowed"
      style={{ borderColor: "#9b59b6", background: "rgba(0,0,0,0.8)", color: "#9b59b6" }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = "#9b59b6";
        (e.currentTarget as HTMLButtonElement).style.color = "white";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.8)";
        (e.currentTarget as HTMLButtonElement).style.color = "#9b59b6";
      }}
    >
      {children}
    </button>
  );
}
