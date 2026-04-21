import { motion } from "framer-motion";
import { useMemo } from "react";

type WinType = "jackpot" | "positive" | "negative" | "wipe" | "neutral" | "swap";

export function getWinType(label: string): WinType {
  if (label === "ДЖЕКПОТ") return "jackpot";
  if (label === "ВАЙП") return "wipe";
  if (label === "СВАП") return "swap";
  if (["+100", "+300", "+500", "Рассказать стишок", "ДЕРЖИ ВОРА"].includes(label)) return "positive";
  if (["-100", "-300", "-500"].includes(label)) return "negative";
  return "neutral";
}

function getBurstColors(type: WinType): string[] {
  switch (type) {
    case "jackpot":  return ["#f1c40f", "#ffeaa7", "#fdcb6e", "#f9ca24", "#ffffff", "#f0932b"];
    case "positive": return ["#2ecc71", "#27ae60", "#f1c40f", "#00b894", "#55efc4", "#a9ff96"];
    case "negative": return ["#e74c3c", "#c0392b", "#e17055", "#ff6b6b", "#d63031"];
    case "wipe":     return ["#e74c3c", "#8e44ad", "#c0392b", "#6c3483", "#922b21", "#ff4757"];
    case "swap":     return ["#3498db", "#2980b9", "#74b9ff", "#a29bfe", "#6c5ce7", "#0984e3"];
    case "neutral":  return ["#3498db", "#74b9ff", "#a29bfe", "#ffffff", "#dfe6e9"];
  }
}

/* ─── Burst particles ─────────────────────────────────────────── */
interface BurstParticle {
  id: number; cx: number; cy: number; tx: number; ty: number;
  size: number; color: string; rotation: number; delay: number;
  duration: number; borderRadius: string;
}

function makeBurst(type: WinType, colors: string[]): BurstParticle[] {
  const count = type === "jackpot" ? 70 : type === "wipe" ? 50 : 38;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const spread = 130 + Math.random() * 340;
    const r = Math.random();
    const br = r < 0.33 ? "50%" : r < 0.66 ? "2px" : "20% 80% 20% 80%";
    return {
      id: i, cx: 50, cy: 45,
      tx: Math.cos(angle) * spread * (0.6 + Math.random() * 0.8),
      ty: Math.sin(angle) * spread * (0.6 + Math.random() * 0.8),
      size: 7 + Math.random() * 13,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 0.25,
      duration: 0.9 + Math.random() * 0.9,
      borderRadius: br,
    };
  });
}

/* ─── Golden rain ─────────────────────────────────────────────── */
interface RainParticle {
  id: number; cx: number; tx: number; ty: number;
  size: number; color: string; rotation: number; delay: number;
  duration: number; borderRadius: string;
}

function makeRain(colors: string[], count: number): RainParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i,
    cx: Math.random() * 100,
    tx: (Math.random() - 0.5) * 80,
    ty: 80 + Math.random() * 60,
    size: 5 + Math.random() * 9,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 1.2,
    duration: 1.2 + Math.random() * 0.8,
    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
  }));
}

/* ─── Fireworks ───────────────────────────────────────────────── */
const FIREWORK_COLORS = [
  "#f1c40f", "#e74c3c", "#3498db", "#2ecc71",
  "#9b59b6", "#e67e22", "#1abc9c", "#ff6b9d", "#fff",
];
interface Spark { angle: number; dist: number; size: number; color: string }
interface FireworkData { id: number; x: number; y: number; delay: number; color: string; sparks: Spark[] }

function makeFireworks(count: number): FireworkData[] {
  const positions = [
    [12, 18], [28, 12], [50, 8], [72, 15], [88, 22],
    [18, 40], [82, 38], [42, 30], [65, 10], [35, 20],
  ].slice(0, count);
  return positions.map(([x, y], i) => {
    const color = FIREWORK_COLORS[i % FIREWORK_COLORS.length];
    const sparkN = 14 + Math.floor(Math.random() * 8);
    return {
      id: i, x, y,
      delay: 0.3 + i * 0.28 + Math.random() * 0.2,
      color,
      sparks: Array.from({ length: sparkN }, (_, j) => ({
        angle: (j / sparkN) * 360 + (Math.random() - 0.5) * 10,
        dist: 45 + Math.random() * 70,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.35 ? color : "#fff",
      })),
    };
  });
}

function FireworkBurst({ fw }: { fw: FireworkData }) {
  return (
    <>
      {/* Trail going upward */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 0.35, delay: fw.delay - 0.32, times: [0, 0.25, 0.75, 1] }}
        style={{
          position: "fixed",
          left: `${fw.x}vw`,
          top: `${fw.y}vh`,
          width: 2,
          height: 55,
          transformOrigin: "bottom",
          background: `linear-gradient(to top, transparent, ${fw.color})`,
          filter: `drop-shadow(0 0 3px ${fw.color})`,
        }}
      />
      {/* Sparks */}
      {fw.sparks.map((sp, j) => {
        const rad = (sp.angle * Math.PI) / 180;
        const grav = sp.dist * 0.35;
        return (
          <motion.div
            key={j}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos(rad) * sp.dist,
              y: Math.sin(rad) * sp.dist + grav,
              scale: [0, 1.4, 0.9, 0],
              opacity: [0, 1, 0.8, 0],
            }}
            transition={{
              duration: 0.75 + Math.random() * 0.35,
              delay: fw.delay,
              ease: "easeOut",
              opacity: { times: [0, 0.08, 0.6, 1] },
            }}
            style={{
              position: "fixed",
              left: `${fw.x}vw`,
              top: `${fw.y}vh`,
              width: sp.size,
              height: sp.size,
              borderRadius: "50%",
              background: sp.color,
              boxShadow: `0 0 ${sp.size * 2}px ${sp.color}`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </>
  );
}

/* ─── Confetti ────────────────────────────────────────────────── */
const CONFETTI_COLORS = [
  "#f1c40f", "#e74c3c", "#3498db", "#2ecc71",
  "#9b59b6", "#e67e22", "#1abc9c", "#ff6b9d", "#fff", "#fd79a8",
];
interface ConfettiPiece {
  id: number; x: number; w: number; h: number;
  color: string; delay: number; duration: number; drift: number; rotate: number;
}

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    w: 7 + Math.random() * 9,
    h: 4 + Math.random() * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 1.8,
    duration: 2.2 + Math.random() * 1.6,
    drift: (Math.random() - 0.5) * 120,
    rotate: Math.random() * 720 - 360,
  }));
}

/* ─── Main export ─────────────────────────────────────────────── */
export function WinAnimation({ label }: { label: string }) {
  const type = getWinType(label);
  const colors = getBurstColors(type);

  const burst = useMemo(() => makeBurst(type, colors), [label]);
  const rain = useMemo(() => type === "jackpot" ? makeRain(colors, 35) : [], [label]);
  const fireworks = useMemo(() => type === "jackpot" ? makeFireworks(8) : [], [label]);
  const confetti = useMemo(() => type === "jackpot" ? makeConfetti(110) : [], [label]);

  const flashColor =
    type === "jackpot"  ? "rgba(241,196,15,0.18)"
    : type === "wipe"  ? "rgba(142,68,173,0.18)"
    : type === "positive" ? "rgba(46,204,113,0.12)"
    : type === "negative" ? "rgba(231,76,60,0.14)"
    : "rgba(52,152,219,0.12)";

  return (
    <>
      {/* ── Layer 1: behind backdrop ───────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 48, pointerEvents: "none", overflow: "hidden" }}>

        {/* Flash */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, times: [0, 0.15, 1] }}
          style={{ position: "absolute", inset: 0, background: flashColor }}
        />

        {/* Burst particles */}
        {burst.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.cx}%`, top: `${p.cy}%`, x: "-50%", y: "-50%", scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: `calc(-50% + ${p.tx}px)`,
              y: `calc(-50% + ${p.ty}px)`,
              scale: [0, 1.6, 1.1, 0],
              opacity: [0, 1, 0.9, 0],
              rotate: p.rotation,
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: `${p.cx}%`, top: `${p.cy}%`,
              width: p.size, height: p.size,
              borderRadius: p.borderRadius,
              background: p.color,
              boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            }}
          />
        ))}

        {/* Golden rain */}
        {rain.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.cx}%`, top: "-3%", x: "-50%", scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              y: `${p.ty}vh`, x: `${p.tx}px`,
              scale: [0, 1, 0.8, 0],
              opacity: [0, 1, 1, 0],
              rotate: p.rotation,
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
            style={{
              position: "absolute",
              left: `${p.cx}%`, top: 0,
              width: p.size, height: p.size,
              borderRadius: p.borderRadius,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}

        {/* Jackpot pulse rings */}
        {type === "jackpot" && [0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={`ring-${i}`}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 1.1, delay, ease: "easeOut" }}
            style={{
              position: "absolute", left: "50%", top: "45%",
              transform: "translate(-50%, -50%)",
              width: 180, height: 180, borderRadius: "50%",
              border: "3px solid #f1c40f", boxShadow: "0 0 40px #f1c40f",
            }}
          />
        ))}

        {/* Wipe skull rings */}
        {type === "wipe" && [0, 0.2].map((delay, i) => (
          <motion.div
            key={`wring-${i}`}
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1.2, delay, ease: "easeOut" }}
            style={{
              position: "absolute", left: "50%", top: "45%",
              transform: "translate(-50%, -50%)",
              width: 160, height: 160, borderRadius: "50%",
              border: "3px solid #e74c3c", boxShadow: "0 0 40px #e74c3c",
            }}
          />
        ))}
      </div>

      {/* ── Wipe: red screen-edge vignette (above backdrop) ──────── */}
      {type === "wipe" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 1, 0.7, 1, 0.3, 0] }}
          transition={{ duration: 3.5, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1], ease: "easeInOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 53, pointerEvents: "none",
            boxShadow: "inset 0 0 160px 40px rgba(231,76,60,0.75), inset 0 0 80px 20px rgba(142,68,173,0.4)",
          }}
        />
      )}

      {/* ── Jackpot: fireworks (above backdrop) ──────────────────── */}
      {type === "jackpot" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 52, pointerEvents: "none" }}>
          {fireworks.map((fw) => <FireworkBurst key={fw.id} fw={fw} />)}
        </div>
      )}

      {/* ── Jackpot: confetti (above everything) ─────────────────── */}
      {type === "jackpot" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", overflow: "hidden" }}>
          {confetti.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: "-3vh", rotate: 0, opacity: 1 }}
              animate={{
                y: "108vh",
                x: `calc(${p.x}vw + ${p.drift}px)`,
                rotate: p.rotate,
                opacity: [1, 1, 1, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
                opacity: { times: [0, 0.6, 0.85, 1] },
              }}
              style={{
                position: "absolute",
                width: p.w, height: p.h,
                borderRadius: 2,
                background: p.color,
                boxShadow: `0 0 4px ${p.color}66`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
