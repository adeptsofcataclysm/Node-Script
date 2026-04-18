import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSocket } from "../hooks/useGameSocket";
import { Cylinder } from "../components/Cylinder";
import { PlayerCard } from "../components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLAYER_COLORS = ["#3498db", "#e74c3c"] as const;

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
    scores,
    hasSpun,
    connectAndSetName,
    spin,
    shoot,
    rematch,
  } = useGameSocket();

  const isMyTurn = myIndex !== null && myIndex === turn && playerCount === 2;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      connectAndSetName(nameInput.trim());
    }
  };

  if (roomFull) {
    return (
      <div className="game-root flex items-center justify-center p-4">
        <div className="pandora-card text-center p-10 rounded-xl max-w-md w-full">
          <h2 className="text-3xl font-bold uppercase tracking-widest mb-4" style={{ color: "#9b59b6" }}>Room Full</h2>
          <p className="text-gray-400 font-mono text-sm">A game is already in progress.</p>
        </div>
      </div>
    );
  }

  if (!myName) {
    return (
      <div className="game-root flex items-center justify-center p-4">
        {/* Background image */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('https://thumbs.dreamstime.com/b/ilustraci%C3%B3n-digital-de-la-caja-pandora-con-luz-m%C3%A1gica-p%C3%BArpura-enciende-llamas-que-escapan-fantas%C3%ADa-esfera-brillante-energ%C3%ADa-385669089.jpg?w=768')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3) contrast(1.2)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pandora-card text-center p-10 rounded-xl max-w-md w-full relative z-10"
        >
          <h1 className="text-5xl font-bold uppercase tracking-widest mb-1" style={{ color: "white" }}>
            PANDORA
          </h1>
          <p className="text-sm font-mono uppercase tracking-[5px] mb-8" style={{ color: "#9b59b6" }}>
            Roulette: Duo Mode
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
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full h-12 font-bold uppercase tracking-widest border transition-all duration-200 disabled:opacity-10"
              style={{
                borderColor: "#9b59b6",
                background: "rgba(0,0,0,0.8)",
                color: "#9b59b6",
              }}
              onMouseEnter={(e) => {
                if (!nameInput.trim()) return;
                (e.currentTarget as HTMLButtonElement).style.background = "#9b59b6";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.8)";
                (e.currentTarget as HTMLButtonElement).style.color = "#9b59b6";
              }}
              data-testid="button-enter-room"
            >
              Enter Room
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const oppIndex = myIndex === 0 ? 1 : 0;
  const p0Name = playerNames["0"] || "Player 1";
  const p1Name = playerNames["1"] || "Player 2";

  const turnPlayerName = turn === 0 ? p0Name : p1Name;
  const turnColor = PLAYER_COLORS[turn];

  const winnerIndex = gameOver && shotResult
    ? shotResult.playerIndex === 0 ? 1 : 0
    : null;

  return (
    <div className="game-root flex flex-col items-center relative overflow-hidden">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('https://thumbs.dreamstime.com/b/ilustraci%C3%B3n-digital-de-la-caja-pandora-con-luz-m%C3%A1gica-p%C3%BArpura-enciende-llamas-que-escapan-fantas%C3%ADa-esfera-brillante-energ%C3%ADa-385669089.jpg?w=768')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.25) contrast(1.2)",
        }}
      />
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

      {/* Scoreboard */}
      <div className="w-full max-w-xl flex justify-around items-center pt-10 pb-4 px-4">
        <PlayerCard
          name={p0Name}
          score={scores[0] ?? 0}
          isActive={turn === 0 && playerCount === 2 && !gameOver}
          playerIndex={0}
          isDead={gameOver && shotResult?.playerIndex === 0}
        />
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9b59b6" }}>vs</span>
        </div>
        <PlayerCard
          name={p1Name}
          score={scores[1] ?? 0}
          isActive={turn === 1 && playerCount === 2 && !gameOver}
          playerIndex={1}
          isDead={gameOver && shotResult?.playerIndex === 1}
        />
      </div>

      {/* Cylinder + controls centered block */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 pb-10">

        {/* Turn announcer */}
        <div className="h-8 flex items-center justify-center">
          {opponentLeft ? (
            <p className="text-sm font-mono uppercase tracking-widest" style={{ color: "#e74c3c" }}>
              Opponent left the table
            </p>
          ) : playerCount < 2 ? (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-sm font-mono uppercase tracking-[3px]"
              style={{ color: "#9b59b6" }}
            >
              Waiting for opponent...
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

      {/* Result overlay */}
      <AnimatePresence>
        {gameOver && shotResult && (
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
              <h1
                className="text-4xl md:text-5xl font-bold uppercase tracking-widest"
                style={{ color: "white", textShadow: "0 0 20px #9b59b6" }}
              >
                {shotResult.playerIndex === 0 ? p0Name : p1Name} Eliminated
              </h1>
              {winnerIndex !== null && (
                <p className="text-2xl font-bold uppercase tracking-widest" style={{ color: "#9b59b6" }}>
                  {winnerIndex === 0 ? p0Name : p1Name} Wins
                </p>
              )}
              <PandoraButton onClick={rematch} data-testid="button-rematch">
                Rematch
              </PandoraButton>
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
  "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="px-9 py-5 font-bold uppercase tracking-widest border transition-all duration-200 disabled:opacity-10 disabled:cursor-not-allowed"
      style={{
        borderColor: "#9b59b6",
        background: "rgba(0,0,0,0.8)",
        color: "#9b59b6",
      }}
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
