import { useEffect } from "react";
import { motion } from "framer-motion";
import { FortuneWheel } from "../components/FortuneWheel";
import { Mallet } from "../components/Mallet";
import { ResultOverlay } from "../components/ResultOverlay";
import { WheelTitle } from "../components/WheelTitle";
import { useWheelSocket } from "../hooks/useWheelSocket";
import { useWheelSounds } from "../hooks/useWheelSounds";
import { useIsMobile } from "../hooks/useIsMobile";

export function ViewerPage() {
  const { connected, isSpinning, spinData, result, initialRotation, dismissResult } = useWheelSocket(true);
  useWheelSounds(isSpinning, result);
  useEffect(() => { fetch("/api/track/watch", { method: "POST" }).catch(() => {}); }, []);
  const isMobile = useIsMobile();

  return (
    <div style={{ minHeight: "100vh", background: "#2d3e50", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflowX: "hidden" }}>

      {/* Mode badge */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 30, padding: "6px 18px", border: "1px solid #3498db", background: "rgba(0,0,0,0.6)", borderRadius: 4, fontFamily: "monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "4px", color: "#3498db", textShadow: "0 0 12px rgba(52,152,219,0.7)" }}>
        Зритель
      </div>

      {/* Connection indicator */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 30, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: connected ? "#2ecc71" : "#e74c3c" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c", boxShadow: connected ? "0 0 8px #2ecc71" : "0 0 8px #e74c3c" }} />
        {connected ? "Онлайн" : "Подключение..."}
      </div>

      {/* Wheel centered */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          width: isMobile ? "min(90vw, 420px)" : "clamp(320px, 52vw, 620px)",
          paddingTop: isMobile ? 56 : 0,
        }}
      >
        <WheelTitle compact={isMobile} />
        <div style={{ width: "100%", aspectRatio: "1" }}>
          <FortuneWheel spinData={spinData} isSpinning={isSpinning} initialRotation={initialRotation} />
        </div>

        {/* Spinning hint below wheel — desktop only */}
        {!isMobile && (
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
        )}
      </motion.div>

      {/* Mallet — hidden on mobile */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, x: 40, y: -115 }}
          animate={{ opacity: 1, x: 0, y: -115 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            position: "absolute",
            left: "calc(50% + clamp(155px, 25vw, 305px) + 8px)",
            top: "50%",
            zIndex: 20,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <Mallet onClick={() => {}} disabled={true} hideHints={true} />
        </motion.div>
      )}

      <ResultOverlay result={result} onDismiss={dismissResult} allowDismiss={false} />
    </div>
  );
}
