import { motion } from "framer-motion";

interface DefeatScreenProps {
  playerName: string;
  onRematch: () => void;
}

export function DefeatScreen({ playerName, onRematch }: DefeatScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      {/* Atmospheric red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(150,0,0,0.35) 100%)",
        }}
      />

      {/* Drip lines */}
      {[15, 30, 50, 68, 82].map((left) => (
        <motion.div
          key={left}
          className="absolute top-0 pointer-events-none"
          style={{
            left: `${left}%`,
            width: 2,
            background: "linear-gradient(to bottom, #c0392b, transparent)",
            transformOrigin: "top",
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.8, delay: 0.4 + left * 0.008, ease: "easeIn" }}
        >
          <div style={{ height: `${30 + (left % 3) * 15}%` }} />
        </motion.div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-lg">

        {/* WASTED */}
        <motion.div
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, type: "spring" }}
          className="text-7xl font-black uppercase tracking-[8px] select-none"
          style={{
            color: "#e74c3c",
            textShadow: "0 0 40px #e74c3c, 0 0 80px rgba(231,76,60,0.4)",
            fontFamily: "monospace",
          }}
        >
          WASTED
        </motion.div>

        {/* Player name */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-lg font-mono uppercase tracking-[4px] text-center"
          style={{ color: "#9b59b6", textShadow: "0 0 16px #9b59b6" }}
        >
          Тьма поглотила {playerName}
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="w-full h-px"
          style={{ background: "linear-gradient(to right, transparent, #9b59b6, transparent)" }}
        />

        {/* Rematch */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="w-full"
        >
          <button
            onClick={onRematch}
            className="w-full py-3 font-mono text-xs uppercase tracking-[3px] transition-all duration-200"
            style={{
              background: "transparent",
              border: "1px solid #9b59b6",
              color: "#9b59b6",
              textShadow: "0 0 8px #9b59b6",
              boxShadow: "0 0 10px rgba(155,89,182,0.2)",
            }}
          >
            Покинуть стол
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
