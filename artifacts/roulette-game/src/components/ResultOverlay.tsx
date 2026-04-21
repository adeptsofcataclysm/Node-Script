import { motion, AnimatePresence } from "framer-motion";
import { SEGMENTS } from "../wheelSegments";
import { WinAnimation } from "./WinAnimation";
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
  const isWipe    = seg?.label === "ВАЙП";
  const isPositive = ["+100", "+300", "+500", "Рассказать стишок", "ДЕРЖИ ВОРА"].includes(seg?.label ?? "");
  const isNegative = ["-100", "-300", "-500"].includes(seg?.label ?? "");

  return (
    <AnimatePresence>
      {result && (
        <>
          <WinAnimation label={result.label} />

          {/* Backdrop */}
          <motion.div
            key="result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.88)",
              cursor: "pointer",
            }}
          >
            {/* ── Shake wrapper (wipe only) ───────────────────────── */}
            <motion.div
              animate={isWipe ? {
                x: [0, -14, 14, -10, 10, -6, 6, -3, 3, -1, 1, 0],
              } : { x: 0 }}
              transition={isWipe ? {
                x: { delay: 0.5, duration: 0.75, ease: "easeInOut" },
              } : {}}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >

              {/* ── Card ─────────────────────────────────────────── */}
              <motion.div
                initial={{ scale: 0.55, opacity: 0, y: 30, rotate: isJackpot ? -4 : 0 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 13, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  textAlign: "center",
                  padding: "36px 48px 40px",
                  border: `3px solid ${accentColor}`,
                  background: isJackpot
                    ? "linear-gradient(160deg, #1a1200, #111e2b 60%)"
                    : isWipe
                    ? "linear-gradient(160deg, #1a0011, #111e2b 60%)"
                    : "#111e2b",
                  borderRadius: 16,
                  maxWidth: isWide ? "min(94vw, 960px)" : "min(82vw, 660px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 18,
                  position: "relative",
                  overflow: "hidden",
                }}
              >

                {/* Jackpot static glow */}
                {isJackpot && (
                  <motion.div
                    animate={{ boxShadow: [
                      "0 0 60px rgba(241,196,15,0.4), 0 0 120px rgba(241,196,15,0.2)",
                      "0 0 100px rgba(241,196,15,0.8), 0 0 200px rgba(241,196,15,0.4)",
                      "0 0 60px rgba(241,196,15,0.4), 0 0 120px rgba(241,196,15,0.2)",
                    ]}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute", inset: -3, borderRadius: 18,
                      pointerEvents: "none", zIndex: 0,
                    }}
                  />
                )}

                {/* Wipe pulsing red border glow */}
                {isWipe && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, boxShadow: [
                      "0 0 40px rgba(231,76,60,0.5), inset 0 0 30px rgba(231,76,60,0.1)",
                      "0 0 120px rgba(231,76,60,0.95), 0 0 60px rgba(142,68,173,0.6), inset 0 0 60px rgba(231,76,60,0.25)",
                      "0 0 40px rgba(231,76,60,0.5), inset 0 0 30px rgba(231,76,60,0.1)",
                    ]}}
                    transition={{
                      opacity: { duration: 0.2 },
                      boxShadow: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
                    }}
                    style={{
                      position: "absolute", inset: -3, borderRadius: 18,
                      border: "3px solid #e74c3c",
                      pointerEvents: "none", zIndex: 0,
                    }}
                  />
                )}

                {/* Jackpot shimmer sweep */}
                {isJackpot && (
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }}
                    style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(105deg, transparent 30%, rgba(241,196,15,0.18) 50%, transparent 70%)",
                      pointerEvents: "none", zIndex: 1,
                    }}
                  />
                )}

                {/* Image */}
                {imageSrc && (
                  <motion.img
                    src={imageSrc}
                    alt={result.label}
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.15, type: "spring", damping: 14, stiffness: 180 }}
                    style={{
                      maxWidth: imgMaxW,
                      maxHeight: imgMaxH,
                      objectFit: "contain",
                      borderRadius: 8,
                      display: "block",
                      position: "relative",
                      zIndex: 2,
                      filter: isJackpot
                        ? "drop-shadow(0 0 24px #f1c40f)"
                        : isWipe
                        ? "drop-shadow(0 0 16px #e74c3c)"
                        : undefined,
                    }}
                  />
                )}

                {/* Label */}
                <motion.h2
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    scale: isJackpot ? [1, 1.08, 1] : isWipe ? [1, 1.05, 1] : 1,
                    textShadow: isJackpot
                      ? [
                          `0 0 40px ${accentColor}`,
                          `0 0 80px ${accentColor}, 0 0 20px #fff`,
                          `0 0 40px ${accentColor}`,
                        ]
                      : isWipe
                      ? [
                          `0 0 30px #e74c3c`,
                          `0 0 70px #e74c3c, 0 0 30px #8e44ad`,
                          `0 0 30px #e74c3c`,
                        ]
                      : `0 0 40px ${accentColor}`,
                  }}
                  transition={{
                    delay: 0.1,
                    scale: (isJackpot || isWipe)
                      ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.4 },
                    opacity: { duration: 0.3 },
                    textShadow: (isJackpot || isWipe)
                      ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      : undefined,
                  }}
                  style={{
                    fontFamily: "monospace",
                    fontSize: isJackpot ? "clamp(40px, 8vw, 80px)" : "clamp(26px, 4.5vw, 50px)",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "4px",
                    color: accentColor,
                    lineHeight: 1.1,
                    margin: 0,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {result.label}
                </motion.h2>

                {/* Jackpot 1500+ score */}
                {isJackpot && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{
                      opacity: 1, scale: 1, y: 0,
                      textShadow: [
                        "0 0 20px #f1c40f, 0 0 40px #f1c40f88",
                        "0 0 40px #f1c40f, 0 0 80px #f1c40f, 0 0 120px #f1c40f88",
                        "0 0 20px #f1c40f, 0 0 40px #f1c40f88",
                      ],
                    }}
                    transition={{
                      opacity: { delay: 0.3, duration: 0.4 },
                      scale: { delay: 0.3, type: "spring", damping: 10, stiffness: 200 },
                      y: { delay: 0.3, duration: 0.4 },
                      textShadow: { delay: 0.7, duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                    }}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "clamp(28px, 5vw, 56px)",
                      fontWeight: "bold",
                      color: "#f1c40f",
                      letterSpacing: "6px",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    +1500
                  </motion.div>
                )}

                {/* Win / Loss badge */}
                {(isPositive || isNegative || isJackpot) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.35, type: "spring", damping: 10, stiffness: 220 }}
                    style={{
                      position: "absolute",
                      bottom: 12, right: 12,
                      padding: "6px 16px",
                      border: `2px solid ${accentColor}`,
                      borderRadius: 20,
                      background: isNegative ? "rgba(231,76,60,0.15)" : "rgba(46,204,113,0.15)",
                      fontFamily: "monospace",
                      fontSize: isJackpot ? 15 : 13,
                      color: accentColor,
                      letterSpacing: "2px",
                      fontWeight: "bold",
                      zIndex: 3,
                    }}
                  >
                    {isNegative ? "▼ ПОТЕРЯ" : "▲ ПОБЕДА"}
                  </motion.div>
                )}

                {/* Description */}
                {description && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    style={{
                      fontFamily: "'Arial', sans-serif",
                      fontSize: "clamp(14px, 2vw, 22px)",
                      color: "#ddd",
                      lineHeight: 1.5,
                      margin: 0,
                      maxWidth: "560px",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {description}
                  </motion.p>
                )}

                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: [
                      "0 0 8px rgba(241,196,15,0.3), inset 0 0 0px rgba(241,196,15,0)",
                      "0 0 22px rgba(241,196,15,0.7), inset 0 0 12px rgba(241,196,15,0.12)",
                      "0 0 8px rgba(241,196,15,0.3), inset 0 0 0px rgba(241,196,15,0)",
                    ],
                  }}
                  transition={{
                    opacity: { delay: 0.4, duration: 0.3 },
                    scale: { delay: 0.4, type: "spring", damping: 10, stiffness: 260 },
                    boxShadow: { delay: 0.7, duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  }}
                  whileHover={{
                    scale: 1.08,
                    boxShadow: "0 0 32px rgba(241,196,15,0.9), inset 0 0 18px rgba(241,196,15,0.2)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onDismiss}
                  style={{
                    marginTop: 4,
                    fontFamily: "monospace",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "4px",
                    color: "#f1c40f",
                    background: "rgba(241,196,15,0.07)",
                    border: "2px solid #f1c40f",
                    padding: "11px 36px",
                    borderRadius: 6,
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 2,
                    fontWeight: "bold",
                  }}
                >
                  Отлично!
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
