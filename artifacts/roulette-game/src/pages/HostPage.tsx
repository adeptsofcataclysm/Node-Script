import { useState } from "react";
import { motion } from "framer-motion";
import { FortuneWheel } from "../components/FortuneWheel";
import { Mallet } from "../components/Mallet";
import { ResultOverlay } from "../components/ResultOverlay";
import { useWheelSocket } from "../hooks/useWheelSocket";

export function HostPage() {
  const { connected, isSpinning, spinData, result, initialRotation, spin, dismissResult } = useWheelSocket(false);
  const [copied, setCopied] = useState<"watch" | null>(null);

  const watchUrl = window.location.origin + "/watch";

  const copyUrl = (url: string, key: "watch") => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

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

      {/* Viewer URL block — absolute bottom center */}
      <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#aaa", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 2 }}>
          Ссылка для зрителей
        </div>
        <button
          onClick={() => copyUrl(watchUrl, "watch")}
          title="Нажмите, чтобы скопировать"
          style={{
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(52,152,219,0.7)",
            borderRadius: 4,
            padding: "8px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 13, color: "#3498db", letterSpacing: "1px", wordBreak: "break-all" }}>
            {watchUrl}
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: copied === "watch" ? "#2ecc71" : "#888", letterSpacing: "1px", flexShrink: 0, minWidth: 60, transition: "color 0.2s" }}>
            {copied === "watch" ? "✓ скопировано" : "копировать"}
          </span>
        </button>
      </div>

      <ResultOverlay result={result} onDismiss={dismissResult} />
    </div>
  );
}
