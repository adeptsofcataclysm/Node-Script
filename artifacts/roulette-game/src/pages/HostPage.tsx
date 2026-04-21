import { motion } from "framer-motion";
import { FortuneWheel } from "../components/FortuneWheel";
import { Mallet } from "../components/Mallet";
import { ResultOverlay } from "../components/ResultOverlay";
import { useWheelSocket } from "../hooks/useWheelSocket";

export function HostPage() {
  const { connected, isSpinning, spinData, result, initialRotation, spin, dismissResult } = useWheelSocket(false);

  return (
    <div style={{ minHeight: "100vh", background: "#2d3e50", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      {/* Mode badge */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 30, padding: "6px 18px", border: "1px solid #f1c40f", background: "rgba(0,0,0,0.6)", borderRadius: 4, fontFamily: "monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "4px", color: "#f1c40f", textShadow: "0 0 12px rgba(241,196,15,0.7)" }}>
        Ведущий
      </div>

      {/* Connection indicator */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 30, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: connected ? "#2ecc71" : "#e74c3c" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c", boxShadow: connected ? "0 0 8px #2ecc71" : "0 0 8px #e74c3c" }} />
        {connected ? "Онлайн" : "Подключение..."}
      </div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ fontFamily: "monospace", fontSize: "clamp(16px, 2.5vw, 26px)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "8px", color: "#f1c40f", textShadow: "0 0 20px rgba(241,196,15,0.5)", marginBottom: 20, textAlign: "center" }}
      >
        Колесо Адептов
      </motion.h1>

      {/* Wheel + Mallet row */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ width: "clamp(300px, 48vw, 560px)", aspectRatio: "1" }}>
          <FortuneWheel spinData={spinData} isSpinning={isSpinning} initialRotation={initialRotation} />
        </div>

        <div style={{ marginTop: 24, flexShrink: 0 }}>
          <Mallet onClick={spin} disabled={isSpinning || !connected} />
        </div>
      </motion.div>

      {/* Viewer URL hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 1 }}
        style={{ marginTop: 14, fontFamily: "monospace", fontSize: 11, color: "#aaa", letterSpacing: "2px", textTransform: "uppercase" }}
      >
        Зрители: /watch
      </motion.p>

      <ResultOverlay result={result} onDismiss={dismissResult} />
    </div>
  );
}
