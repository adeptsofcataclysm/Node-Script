import { motion } from "framer-motion";

export function WheelTitle() {
  const text = "КОЛЕСО АДЕПТОВ";

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  };

  const letter = {
    hidden: { opacity: 0, y: -38, scale: 0.4, rotate: -12 },
    visible: {
      opacity: 1, y: 0, scale: 1, rotate: 0,
      transition: { type: "spring" as const, damping: 10, stiffness: 260 },
    },
  };

  return (
    <motion.div
      animate={{
        filter: [
          "drop-shadow(0 0 6px rgba(241,196,15,0.25))",
          "drop-shadow(0 0 24px rgba(241,196,15,0.8)) drop-shadow(0 0 50px rgba(241,196,15,0.3))",
          "drop-shadow(0 0 6px rgba(241,196,15,0.25))",
        ],
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: "100%", textAlign: "center", marginBottom: 16, userSelect: "none" }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, flexWrap: "nowrap" }}
      >
        {text.split("").map((ch, i) => (
          <motion.span
            key={i}
            variants={letter}
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(20px, 3.2vw, 42px)",
              fontWeight: "bold",
              color: ch === " " ? "transparent" : "#f1c40f",
              letterSpacing: ch === " " ? "0px" : "4px",
              width: ch === " " ? "clamp(8px, 1.2vw, 18px)" : undefined,
              display: "inline-block",
              willChange: "transform",
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
