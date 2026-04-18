import { motion } from "framer-motion";

interface PlayerCardProps {
  name: string;
  score: number;
  isActive: boolean;
  playerIndex: number;
  isDead: boolean;
  isEliminated: boolean;
}

export const PLAYER_COLORS = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
] as const;

export function PlayerCard({ name, score, isActive, playerIndex, isDead, isEliminated }: PlayerCardProps) {
  const color = PLAYER_COLORS[playerIndex] ?? "#9b59b6";

  return (
    <motion.div
      animate={
        isEliminated
          ? { scale: 0.88, opacity: 0.3 }
          : isActive && !isDead
          ? { scale: 1.15, opacity: 1 }
          : { scale: 1, opacity: isDead ? 0.4 : 0.6 }
      }
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center p-4 rounded-xl min-w-[105px]"
      style={{
        boxShadow: isActive && !isDead && !isEliminated ? `0 0 20px ${color}` : "none",
        background: isActive && !isDead && !isEliminated
          ? `rgba(${playerIndex === 0 ? "52,152,219" : playerIndex === 1 ? "231,76,60" : playerIndex === 2 ? "46,204,113" : playerIndex === 3 ? "243,156,18" : "155,89,182"},0.08)`
          : "transparent",
        border: `1px solid ${isActive && !isDead && !isEliminated ? color : "transparent"}`,
        transition: "box-shadow 0.4s, background 0.4s, border 0.4s",
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-[2px] mb-2"
        style={{ color: isEliminated ? "#555" : color }}
      >
        {name || `P${playerIndex + 1}`}
      </div>
      <div
        className="text-4xl font-bold"
        style={{ color: isEliminated ? "#444" : "white" }}
        data-testid={`score-player-${playerIndex}`}
      >
        {score}
      </div>
      {isEliminated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "#e74c3c" }}
        >
          Out
        </motion.div>
      )}
      {isDead && !isEliminated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "#e74c3c" }}
        >
          Bang
        </motion.div>
      )}
    </motion.div>
  );
}
