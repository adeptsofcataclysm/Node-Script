import { useEffect } from "react";
import { motion } from "framer-motion";
import { FortuneWheel } from "@/components/FortuneWheel";
import { Mallet } from "@/components/Mallet";
import { ResultOverlay } from "@/components/ResultOverlay";
import { WheelTitle } from "@/components/WheelTitle";
import { useWheelSocket } from "@/hooks/useWheelSocket";
import { useWheelSounds } from "@/hooks/useWheelSounds";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRole } from "@/hooks/useRole";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

type Props = { viewerMode: boolean };

export function QuizAdeptsWheelPage({ viewerMode }: Props) {
  const { connected, isSpinning, spinData, result, initialRotation, spin, dismissResult } =
    useWheelSocket(viewerMode);
  const { playMalletGrab, playMalletSwing } = useWheelSounds(isSpinning, result);
  const isMobile = useIsMobile();
  const { isHost } = useRole();

  useEffect(() => {
    fetch(viewerMode ? "/api/track/watch" : "/api/track/host", { method: "POST" }).catch(() => {});
  }, [viewerMode]);

  const badgeLabel = viewerMode ? "Зритель" : isHost ? "Ведущий" : "Ваш ход";
  const badgeBorder = viewerMode ? "#3498db" : isHost ? "#f1c40f" : "#2ecc71";
  const badgeColor = viewerMode ? "#3498db" : isHost ? "#f1c40f" : "#2ecc71";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#2d3e50",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 30,
          padding: "6px 18px",
          border: `1px solid ${badgeBorder}`,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "4px",
          color: badgeColor,
          textShadow: viewerMode
            ? "0 0 12px rgba(52,152,219,0.7)"
            : isHost
              ? "0 0 12px rgba(241,196,15,0.7)"
              : "0 0 12px rgba(46,204,113,0.7)",
        }}
      >
        {badgeLabel}
      </div>

      {isHost && !viewerMode && (
        <button
          type="button"
          onClick={() => getQuizNavSocket().emit("hostAdeptsWheelReturn")}
          className="adepts-quiz-theme fixed bottom-[18px] right-[18px] z-30 cursor-pointer whitespace-nowrap rounded-lg border border-primary/50 bg-primary/15 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-primary glow-text shadow-[0_0_20px_hsla(45,93%,47%,0.22)] backdrop-blur-sm transition hover:border-primary hover:bg-primary/25 hover:shadow-[0_0_28px_hsla(45,93%,47%,0.4)]"
        >
          Самый Душный
        </button>
      )}

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "monospace",
          fontSize: 11,
          color: connected ? "#2ecc71" : "#e74c3c",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#2ecc71" : "#e74c3c",
            boxShadow: connected ? "0 0 8px #2ecc71" : "0 0 8px #e74c3c",
          }}
        />
        {connected ? "Онлайн" : "Подключение..."}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: isMobile ? "min(90vw, 420px)" : "clamp(320px, 52vw, 620px)",
          paddingTop: isMobile ? 56 : 0,
        }}
      >
        <WheelTitle compact={isMobile} />
        <div style={{ width: "100%", aspectRatio: "1" }}>
          <FortuneWheel spinData={spinData} isSpinning={isSpinning} initialRotation={initialRotation} />
        </div>

        {!isMobile && (
          <motion.div
            animate={
              isSpinning ? { opacity: [0.5, 1, 0.5], color: "#f1c40f" } : { opacity: 0 }
            }
            transition={{ duration: 1, repeat: isSpinning ? Infinity : 0 }}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "5px",
              marginTop: 14,
            }}
          >
            ⟳ Вращается...
          </motion.div>
        )}

        {viewerMode && isMobile && (
          <p
            style={{
              marginTop: 16,
              fontFamily: "monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              textAlign: "center",
              letterSpacing: "0.12em",
            }}
          >
            Возврат на доску — кнопка у ведущего на колесе
          </p>
        )}

        {!viewerMode && isMobile && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={spin}
            disabled={isSpinning || !connected}
            style={{
              marginTop: 20,
              padding: "16px 0",
              width: "100%",
              background: isSpinning || !connected ? "rgba(241,196,15,0.08)" : "rgba(241,196,15,0.12)",
              border: `2px solid ${isSpinning || !connected ? "rgba(241,196,15,0.3)" : "#f1c40f"}`,
              borderRadius: 8,
              color: isSpinning || !connected ? "rgba(241,196,15,0.4)" : "#f1c40f",
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "4px",
              textTransform: "uppercase",
              cursor: isSpinning || !connected ? "not-allowed" : "pointer",
              boxShadow: isSpinning || !connected ? "none" : "0 0 18px rgba(241,196,15,0.25)",
            }}
          >
            {isSpinning ? "⟳ Вращается..." : "⊕ Вращать"}
          </motion.button>
        )}
      </motion.div>

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
            ...(viewerMode
              ? { pointerEvents: "none" as const, userSelect: "none" as const }
              : {}),
          }}
        >
          {viewerMode ? (
            <Mallet onClick={() => {}} disabled={true} hideHints={true} />
          ) : (
            <Mallet
              onClick={spin}
              disabled={isSpinning || !connected}
              onGrab={playMalletGrab}
              onSwing={playMalletSwing}
            />
          )}
        </motion.div>
      )}

      <ResultOverlay
        result={result}
        onDismiss={dismissResult}
        allowDismiss={!viewerMode}
      />
    </div>
  );
}
