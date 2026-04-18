import { motion } from "framer-motion";

interface PlayerCardProps {
  name: string;
  isMyTurn: boolean;
  isMe: boolean;
  isDead: boolean;
}

export function PlayerCard({ name, isMyTurn, isMe, isDead }: PlayerCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg border-2 w-full max-w-[240px] flex flex-col items-center justify-center transition-colors duration-300 ${
        isMyTurn && !isDead ? "border-red-800 bg-zinc-900/80 shadow-[0_0_30px_rgba(153,27,27,0.15)]" : "border-zinc-800 bg-zinc-950"
      } ${isDead ? "opacity-50 grayscale" : ""}`}
    >
      <h3 className="font-serif text-2xl font-bold tracking-wider text-zinc-100 uppercase mb-2 truncate w-full text-center">
        {name}
      </h3>
      
      {isMe && (
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
          (You)
        </span>
      )}
      
      <div className="h-8 flex items-center justify-center">
        {isDead ? (
          <span className="text-4xl text-red-600 filter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] font-serif font-bold">DEAD</span>
        ) : isMyTurn ? (
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-3 py-1 bg-red-950/50 border border-red-900 text-red-500 text-xs font-mono uppercase tracking-widest rounded"
          >
            Turn
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}