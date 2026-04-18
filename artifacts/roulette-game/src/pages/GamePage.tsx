import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSocket } from "../hooks/useGameSocket";
import { Cylinder } from "../components/Cylinder";
import { PlayerCard, PLAYER_COLORS } from "../components/PlayerCard";
import { Input } from "@/components/ui/input";

const BG_URL = "url('https://thumbs.dreamstime.com/b/ilustraci%C3%B3n-digital-de-la-caja-pandora-con-luz-m%C3%A1gica-p%C3%BArpura-enciende-llamas-que-escapan-fantas%C3%ADa-esfera-brillante-energ%C3%ADa-385669089.jpg?w=768')";

export function GamePage() {
  const [nameInput, setNameInput] = useState("");
  const {
    myIndex,
    playerCount,
    playerNames,
    turn,
    isSpinning,
    bulletPos,
    currentPos,
    gameOver,
    shotResult,
    myName,
    opponentLeft,
    roomFull,
    eliminated,
    winner,
    scores,
    hasSpun,
    maxPlayers,
    connectAndSetName,
    spin,
    shoot,
    rematch,
  } = useGameSocket();

  const gameReady = playerCount === maxPlayers;
  const isMyTurn =
    myIndex !== null &&
    myIndex === turn &&
    gameReady &&
    !eliminated.includes(myIndex) &&
    !gameOver;

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pandora-card text-center p-10 rounded-xl max-w-md w-full relative z-10"
        >
          <h1 className="text-5xl font-bold uppercase tracking-widest mb-1" style={{ color: "white" }}>
            PANDORA
          </h1>
          <p className="text-sm font-mono uppercase tracking-[5px] mb-8" style={{ color: "#9b59b6" }}>
            Roulette: {maxPlayers}-Player Mode
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter your alias"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="bg-black/60 border text-center font-mono uppercase tracking-wider h-12 rounded-none focus-visible:ring-0"
              style={{ borderColor: "#9b59b6", color: "white" }}
              maxLength={12}
              required
              data-testid="input-alias"
            />
            <PandoraButton type="submit" disabled={!nameInput.trim()} data-testid="button-enter-room">
              Enter Room
            </PandoraButton>
          </form>
        </motion.div>
      </div>
    );
  }

  const turnPlayerName = playerNames[String(turn)] || `P${turn + 1}`;
  const turnColor = PLAYER_COLORS[turn] ?? "#9b59b6";

  const winnerName = winner !== null ? (playerNames[String(winner)] || `P${winner + 1}`) : null;
  const eliminatedPlayerName = shotResult
    ? playerNames[String(shotResult.playerIndex)] || `P${shotResult.playerIndex + 1}`
    : null;

  return (
    <div className="game-root flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0" style={{ backgroundImage: BG_URL, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.25) contrast(1.2)" }} />

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

      {/* Scoreboard — 5 cards */}
      <div className="w-full max-w-3xl flex flex-wrap justify-center items-center gap-2 pt-6 pb-2 px-4 z-10">
        {Array.from({ length: maxPlayers }, (_, i) => (
          <PlayerCard
            key={i}
            name={playerNames[String(i)] || `P${i + 1}`}
            score={scores[i] ?? 0}
            isActive={turn === i && gameReady && !gameOver}
            playerIndex={i}
            isDead={!!shotResult?.isBang && shotResult.playerIndex === i && gameOver}
            isEliminated={eliminated.includes(i)}
          />
        ))}
      </div>

      {/* Cylinder + controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 pb-10">

        {/* Turn announcer */}
        <div className="h-8 flex items-center justify-center">
          {opponentLeft ? (
            <p className="text-sm font-mono uppercase tracking-widest" style={{ color: "#e74c3c" }}>
              A player left the table
            </p>
          ) : !gameReady ? (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-sm font-mono uppercase tracking-[3px]"
              style={{ color: "#9b59b6" }}
            >
              Waiting for players... ({playerCount}/{maxPlayers})
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
          currentPos={currentPos}
          bulletPos={bulletPos}
          isSpinning={isSpinning}
          gameOver={gameOver}
        />

        {/* Controls */}
        <div className="flex gap-5">
          <PandoraButton
            onClick={spin}
            disabled={!isMyTurn || isSpinning || gameOver}
            data-testid="button-spin"
          >
            Spin Cylinder
          </PandoraButton>
          <PandoraButton
            onClick={shoot}
            disabled={!isMyTurn || isSpinning || gameOver || !hasSpun}
            data-testid="button-shoot"
          >
            Fire
          </PandoraButton>
        </div>

      </div>

      {/* Result overlay — game over (last player standing) */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            key="result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center text-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex flex-col items-center gap-6"
            >
              {eliminatedPlayerName && (
                <p className="text-2xl font-mono uppercase tracking-widest" style={{ color: "#e74c3c" }}>
                  {eliminatedPlayerName} Eliminated
                </p>
              )}
              {winnerName && (
                <h1
                  className="text-4xl md:text-5xl font-bold uppercase tracking-widest"
                  style={{ color: "white", textShadow: "0 0 20px #9b59b6" }}
                >
                  {winnerName} Wins
                </h1>
              )}
              <PandoraButton onClick={rematch} data-testid="button-rematch">
                Rematch
              </PandoraButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mid-round elimination notice (bang but game not over) */}
      <AnimatePresence>
        {shotResult?.isBang && !gameOver && (
          <motion.div
            key={`elim-${shotResult.playerIndex}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-24 left-0 right-0 flex justify-center z-30 pointer-events-none"
          >
            <div
              className="px-6 py-3 font-mono uppercase tracking-widest text-sm"
              style={{ background: "rgba(0,0,0,0.85)", border: "1px solid #e74c3c", color: "#e74c3c" }}
            >
              {eliminatedPlayerName} is out
            </div>
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
