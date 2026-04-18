import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSocket } from "../hooks/useGameSocket";
import { Cylinder } from "../components/Cylinder";
import { PlayerCard } from "../components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 border border-zinc-800 bg-zinc-900 rounded-lg text-center">
          <h2 className="text-3xl font-serif text-red-600 mb-4">Room Full</h2>
          <p className="text-zinc-400 font-mono text-sm">There is already a game in progress.</p>
        </div>
      </div>
    );
  }

  if (!myName) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm rounded-lg text-center relative z-10"
        >
          <h1 className="text-5xl font-serif font-bold text-zinc-100 mb-2 tracking-tighter">ROULETTE</h1>
          <p className="text-zinc-500 font-mono text-xs tracking-widest mb-8 uppercase">A game of chance</p>
          
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter your alias"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-center font-mono uppercase tracking-wider h-12 rounded-none focus-visible:ring-1 focus-visible:ring-red-900 focus-visible:border-red-900"
                maxLength={12}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-red-900 hover:bg-red-800 text-zinc-100 rounded-none font-mono uppercase tracking-widest transition-all duration-300"
              disabled={!nameInput.trim()}
            >
              Enter Room
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const oppIndex = myIndex === 0 ? 1 : 0;
  const myNameDisplay = playerNames[String(myIndex)] || myName;
  const oppNameDisplay = playerNames[String(oppIndex)] || "Waiting...";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden text-zinc-100">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Cinematic Flash Effects */}
      <AnimatePresence>
        {shotResult && (
          <motion.div
            key={`flash-${Date.now()}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              shotResult.isBang ? "bg-red-600 mix-blend-screen" : "bg-white mix-blend-overlay"
            }`}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center justify-between p-6 md:p-12 relative z-10">
        {/* Header / Status */}
        <header className="w-full text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold tracking-widest opacity-80">ROULETTE</h1>
          <div className="h-6">
            {opponentLeft ? (
              <p className="text-red-500 font-mono text-sm uppercase tracking-widest">Opponent abandoned the table</p>
            ) : playerCount < 2 ? (
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">Waiting for opponent...</p>
            ) : null}
          </div>
        </header>

        {/* Players & Cylinder Area */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 my-8">
          <div className="order-2 md:order-1 w-full md:w-auto flex justify-center">
            <PlayerCard 
              name={myNameDisplay}
              isMyTurn={turn === myIndex && playerCount === 2}
              isMe={true}
              isDead={gameOver && shotResult?.playerIndex === myIndex}
            />
          </div>
          
          <div className="order-1 md:order-2">
            <Cylinder 
              currentPos={currentPos} 
              bulletPos={bulletPos} 
              isSpinning={isSpinning} 
              gameOver={gameOver} 
            />
          </div>

          <div className="order-3 w-full md:w-auto flex justify-center">
            <PlayerCard 
              name={oppNameDisplay}
              isMyTurn={turn === oppIndex && playerCount === 2}
              isMe={false}
              isDead={gameOver && shotResult?.playerIndex === oppIndex}
            />
          </div>
        </div>

        {/* Action Area */}
        <div className="h-32 flex flex-col items-center justify-center w-full max-w-md">
          {shotResult && !isSpinning && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-2xl font-serif font-bold tracking-widest uppercase mb-6 ${shotResult.isBang ? "text-red-500" : "text-zinc-400"}`}
            >
              {shotResult.isBang ? "BANG." : "Click."}
            </motion.div>
          )}

          {gameOver ? (
            <Button
              onClick={rematch}
              className="px-12 py-6 bg-red-900 hover:bg-red-800 text-zinc-100 font-mono uppercase tracking-widest border border-red-700 shadow-[0_0_20px_rgba(153,27,27,0.3)] rounded-none"
            >
              Play Again
            </Button>
          ) : isMyTurn && !isSpinning && !gameOver ? (
            <div className="flex gap-4 w-full">
              {bulletPos === -1 && (
                <Button
                  onClick={spin}
                  className="flex-1 py-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono uppercase tracking-widest border border-zinc-700 rounded-none"
                >
                  Spin Cylinder
                </Button>
              )}
              {bulletPos !== -1 && (
                <Button
                  onClick={shoot}
                  className="flex-1 py-8 bg-red-950 hover:bg-red-900 text-red-100 font-serif text-xl font-bold tracking-widest border border-red-800 shadow-[0_0_20px_rgba(153,27,27,0.2)] hover:shadow-[0_0_30px_rgba(153,27,27,0.4)] rounded-none transition-all"
                >
                  PULL TRIGGER
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}