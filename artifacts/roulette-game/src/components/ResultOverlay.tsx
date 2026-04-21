import { motion, AnimatePresence } from "framer-motion";
import { SEGMENTS } from "../wheelSegments";
import type { WheelResultData } from "../hooks/useWheelSocket";

const BASE_URL = import.meta.env.BASE_URL as string;

interface ResultOverlayProps {
  result: WheelResultData | null;
  onDismiss: () => void;
}

export function ResultOverlay({ result, onDismiss }: ResultOverlayProps) {
  if (!result) return null;

  const seg = SEGMENTS[result.segmentIndex];
  const accentColor = seg?.color ?? "#f1c40f";
  const imageSrc = seg?.image ? `${BASE_URL}wheel-assets/${seg.image}` : null;
  const description = seg?.description ?? "";

  const isWide = seg?.imgW && seg?.imgH && seg.imgW / seg.imgH > 1.8;
  const imgMaxW = isWide ? "min(90vw, 900px)" : "min(70vw, 560px)";
  const imgMaxH = "50vh";

  const isJackpot = seg?.label === "ДЖЕКПОТ";

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key="result-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.92)",
            cursor: "pointer",
          }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              textAlign: "center",
              padding: "36px 48px 40px",
              border: `3px solid ${accentColor}`,
              background: "#111e2b",
              borderRadius: 16,
              boxShadow: `0 0 100px ${accentColor}44`,
              maxWidth: isWide ? "min(94vw, 960px)" : "min(82vw, 660px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            {/* Image */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt={result.label}
                style={{
                  maxWidth: imgMaxW,
                  maxHeight: imgMaxH,
                  objectFit: "contain",
                  borderRadius: 8,
                  display: "block",
                }}
              />
            )}

            {/* Label */}
            <h2 style={{
              fontFamily: "monospace",
              fontSize: isJackpot ? "clamp(40px, 8vw, 80px)" : "clamp(26px, 4.5vw, 50px)",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "4px",
              color: accentColor,
              textShadow: `0 0 40px ${accentColor}`,
              lineHeight: 1.1,
              margin: 0,
            }}>
              {result.label}
            </h2>

            {/* Description */}
            {description && (
              <p style={{
                fontFamily: "'Arial', sans-serif",
                fontSize: "clamp(14px, 2vw, 22px)",
                color: "#ddd",
                lineHeight: 1.5,
                margin: 0,
                maxWidth: "560px",
              }}>
                {description}
              </p>
            )}

            {/* Close button */}
            <button
              onClick={onDismiss}
              style={{
                marginTop: 4,
                fontFamily: "monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "3px",
                color: "#888",
                background: "transparent",
                border: "1px solid #444",
                padding: "10px 32px",
                borderRadius: 4,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                const btn = e.target as HTMLButtonElement;
                btn.style.borderColor = "#aaa";
                btn.style.color = "#ccc";
              }}
              onMouseLeave={(e) => {
                const btn = e.target as HTMLButtonElement;
                btn.style.borderColor = "#444";
                btn.style.color = "#888";
              }}
            >
              Отлично!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
