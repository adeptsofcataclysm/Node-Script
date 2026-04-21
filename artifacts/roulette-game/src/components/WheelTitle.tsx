import { motion } from "framer-motion";

export function WheelTitle() {
  const line1 = "КОЛЕСО";
  const line2 = "АДЕПТОВ";

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
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
      style={{ textAlign: "center", marginBottom: 16, userSelect: "none" }}
    >
      {/* Line 1 */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", justifyContent: "center", gap: 2 }}
      >
        {line1.split("").map((ch, i) => (
          <motion.span
            key={`l1-${i}`}
            variants={letter}
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(22px, 3.8vw, 46px)",
              fontWeight: "bold",
              color: "#f1c40f",
              letterSpacing: "6px",
              display: "inline-block",
              willChange: "transform",
            }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.div>

      {/* Line 2 — slightly delayed */}
      <motion.div
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.055, delayChildren: 0.45 } },
        }}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", justifyContent: "center", gap: 2 }}
      >
        {line2.split("").map((ch, i) => (
          <motion.span
            key={`l2-${i}`}
            variants={letter}
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(22px, 3.8vw, 46px)",
              fontWeight: "bold",
              color: "#f1c40f",
              letterSpacing: "6px",
              display: "inline-block",
              willChange: "transform",
            }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
