import { motion } from "framer-motion";
import { FortuneWheel } from "../components/FortuneWheel";
import { Mallet } from "../components/Mallet";
import { ResultOverlay } from "../components/ResultOverlay";
import { WheelTitle } from "../components/WheelTitle";
import { useWheelSocket } from "../hooks/useWheelSocket";
import { useWheelSounds } from "../hooks/useWheelSounds";

export function ViewerPage() {
  const { connected, isSpinning, spinData, result, initialRotation, dismissResult } = useWheelSocket(true);
  useWheelSounds(isSpinning, result);

  return (
    <div style={{ minHeight: "100vh", background: "#2d3e50", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      {/* Mode badge */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 30, padding: "6px 18px", border: "1px solid #3498db", background: "rgba(0,0,0,0.6)", borderRadius: 4, fontFamily: "monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "4px", color: "#3498db", textShadow: "0 0 12px rgba(52,152,219,0.7)" }}>
        Зритель
      </div>

      {/* Connection indicator */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 30, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: connected ? "#2ecc71" : "#e74c3c" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c", boxShadow: connected ? "0 0 8px #2ecc71" : "0 0 8px #e74c3c" }} />
        {connected ? "Онлайн" : "Подключение..."}
      </div>

      {/* Wheel centered — same layout as HostPage */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "clamp(320px, 52vw, 620px)" }}
      >
        <WheelTitle />
        <div style={{ width: "100%", aspectRatio: "1" }}>
          <FortuneWheel spinData={spinData} isSpinning={isSpinning} initialRotation={initialRotation} />
        </div>

        {/* Spinning hint below wheel */}
        <motion.div
          animate={isSpinning
            ? { opacity: [0.5, 1, 0.5], color: "#f1c40f" }
            : { opacity: 0 }
          }
          transition={{ duration: 1, repeat: isSpinning ? Infinity : 0 }}
          style={{ fontFamily: "monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "5px", marginTop: 14 }}
        >
          ⟳ Вращается...
        </motion.div>
      </motion.div>

      {/* Mallet — visible but fully non-interactive */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          position: "absolute",
          right: "clamp(16px, 2vw, 40px)",
          top: "50%",
          transform: "translateY(-60%)",
          zIndex: 20,
          pointerEvents: "none",
          userSelect: "none",
          filter: "brightness(0.6) saturate(0.7)",
        }}
      >
        <Mallet onClick={() => {}} disabled={true} />
      </motion.div>

      {/* Back link */}
      <a
        href="https://node-script--gg22last.replit.app/spectate"
        style={{
          position: "absolute", bottom: 18, right: 18, zIndex: 30,
          padding: "9px 20px",
          border: "1px solid #9b59b6",
          background: "rgba(0,0,0,0.75)",
          color: "#c39bd3",
          fontFamily: "monospace", fontSize: 12,
          textTransform: "uppercase", letterSpacing: "3px",
          textDecoration: "none",
          textShadow: "0 0 10px rgba(155,89,182,0.6)",
          boxShadow: "0 0 14px rgba(155,89,182,0.15)",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        ← Рулетка
      </a>

      <ResultOverlay result={result} onDismiss={dismissResult} />
    </div>
  );
}
