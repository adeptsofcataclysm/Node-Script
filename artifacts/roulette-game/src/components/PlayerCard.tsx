import { motion } from "framer-motion";

interface PlayerCardProps {
  name: string;
  score: number;
  isActive: boolean;
  playerIndex: number;
  isDead: boolean;
}

const PLAYER_COLORS = ["#3498db", "#e74c3c"] as const;

export function PlayerCard({ name, score, isActive, playerIndex, isDead }: PlayerCardProps) {
  const color = PLAYER_COLORS[playerIndex] ?? "#9b59b6";

  return (
    <motion.div
      animate={
        isActive && !isDead
          ? { scale: 1.15, opacity: 1 }
          : { scale: 1, opacity: isDead ? 0.4 : 0.5 }
      }
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center p-6 rounded-xl min-w-[140px]"
      style={{
        boxShadow: isActive && !isDead ? `0 0 20px ${color}` : "none",
        background: isActive && !isDead ? `rgba(${playerIndex === 0 ? "52,152,219" : "231,76,60"},0.08)` : "transparent",
        border: `1px solid ${isActive && !isDead ? color : "transparent"}`,
        transition: "box-shadow 0.4s, background 0.4s, border 0.4s",
      }}
    >
      <div
        className="text-sm font-bold uppercase tracking-[3px] mb-2"
        style={{ color }}
      >
        {name || `Player ${playerIndex + 1}`}
      </div>
      <div className="text-6xl font-bold text-white" data-testid={`score-player-${playerIndex}`}>
        {score}
      </div>
      {isDead && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2 text-xs font-mono uppercase tracking-widest"
          style={{ color: "#e74c3c" }}
        >
          Eliminated
        </motion.div>
      )}
    </motion.div>
  );
}
