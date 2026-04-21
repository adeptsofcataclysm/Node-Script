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
    <div style={{ textAlign: "center", marginBottom: 22, userSelect: "none" }}>
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

      {/* Animated underline */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.7, ease: "easeOut" }}
        style={{
          height: 2,
          marginTop: 8,
          background: "linear-gradient(90deg, transparent 0%, #f1c40f 30%, #fff8c0 50%, #f1c40f 70%, transparent 100%)",
          borderRadius: 2,
          transformOrigin: "center",
        }}
      />

      {/* Continuous shimmer glow on both lines — full-width overlay trick */}
      <motion.div
        animate={{
          opacity: [0.4, 1, 0.4],
          filter: [
            "drop-shadow(0 0 8px rgba(241,196,15,0.3))",
            "drop-shadow(0 0 28px rgba(241,196,15,0.85)) drop-shadow(0 0 60px rgba(241,196,15,0.35))",
            "drop-shadow(0 0 8px rgba(241,196,15,0.3))",
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
