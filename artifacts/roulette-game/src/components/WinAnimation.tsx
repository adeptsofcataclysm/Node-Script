import { motion } from "framer-motion";
import { useMemo } from "react";

type WinType = "jackpot" | "positive" | "negative" | "wipe" | "neutral" | "swap";

function getWinType(label: string): WinType {
  if (label === "ДЖЕКПОТ") return "jackpot";
  if (label === "ВАЙП") return "wipe";
  if (label === "СВАП") return "swap";
  if (["+100", "+300", "+500", "Рассказать стишок", "ДЕРЖИ ВОРА"].includes(label)) return "positive";
  if (["-100", "-300", "-500"].includes(label)) return "negative";
  return "neutral";
}

function getColors(type: WinType): string[] {
  switch (type) {
    case "jackpot":  return ["#f1c40f", "#ffeaa7", "#fdcb6e", "#f9ca24", "#ffffff", "#f0932b"];
    case "positive": return ["#2ecc71", "#27ae60", "#f1c40f", "#00b894", "#55efc4", "#a9ff96"];
    case "negative": return ["#e74c3c", "#c0392b", "#e17055", "#ff6b6b", "#d63031"];
    case "wipe":     return ["#e74c3c", "#8e44ad", "#c0392b", "#6c3483", "#922b21", "#ff4757"];
    case "swap":     return ["#3498db", "#2980b9", "#74b9ff", "#a29bfe", "#6c5ce7", "#0984e3"];
    case "neutral":  return ["#3498db", "#74b9ff", "#a29bfe", "#ffffff", "#dfe6e9"];
  }
}

function getCount(type: WinType) {
  return type === "jackpot" ? 70 : type === "wipe" ? 50 : 38;
}

interface Particle {
  id: number;
  cx: number; cy: number;
  tx: number; ty: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  borderRadius: string;
}

function makeParticles(type: WinType, colors: string[]): Particle[] {
  const count = getCount(type);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const spread = 130 + Math.random() * 340;
    const shapeR = Math.random();
    const br = shapeR < 0.33 ? "50%" : shapeR < 0.66 ? "2px" : "20% 80% 20% 80%";
    return {
      id: i,
      cx: 50,
      cy: 45,
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

function makeRainParticles(colors: string[], count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i,
    cx: Math.random() * 100,
    cy: -5,
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

export function WinAnimation({ label }: { label: string }) {
  const type = getWinType(label);
  const colors = getColors(type);

  const burst = useMemo(() => makeParticles(type, colors), [label]);
  const rain = useMemo(
    () => (type === "jackpot" ? makeRainParticles(colors, 35) : []),
    [label]
  );

  const flashColor =
    type === "jackpot" ? "rgba(241,196,15,0.18)"
    : type === "wipe"  ? "rgba(142,68,173,0.18)"
    : type === "positive" ? "rgba(46,204,113,0.12)"
    : type === "negative" ? "rgba(231,76,60,0.14)"
    : "rgba(52,152,219,0.12)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 48, pointerEvents: "none", overflow: "hidden" }}>

      {/* Screen flash */}
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
          initial={{
            position: "absolute",
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            x: "-50%",
            y: "-50%",
            scale: 0,
            opacity: 0,
            rotate: 0,
          }}
          animate={{
            x: `calc(-50% + ${p.tx}px)`,
            y: `calc(-50% + ${p.ty}px)`,
            scale: [0, 1.6, 1.1, 0],
            opacity: [0, 1, 0.9, 0],
            rotate: p.rotation,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            background: p.color,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
          }}
        />
      ))}

      {/* Jackpot golden rain */}
      {rain.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            position: "absolute",
            left: `${p.cx}%`,
            top: "-3%",
            x: "-50%",
            scale: 0,
            opacity: 0,
            rotate: 0,
          }}
          animate={{
            y: `${p.ty}vh`,
            x: `${p.tx}px`,
            scale: [0, 1, 0.8, 0],
            opacity: [0, 1, 1, 0],
            rotate: p.rotation,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            left: `${p.cx}%`,
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}

      {/* Jackpot ring pulse */}
      {type === "jackpot" && (
        <>
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={`ring-${i}`}
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 1.1, delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%", top: "45%",
                transform: "translate(-50%, -50%)",
                width: 180, height: 180,
                borderRadius: "50%",
                border: "3px solid #f1c40f",
                boxShadow: "0 0 40px #f1c40f",
              }}
            />
          ))}
        </>
      )}

      {/* Wipe skull-pulse rings */}
      {type === "wipe" && (
        <>
          {[0, 0.2].map((delay, i) => (
            <motion.div
              key={`wring-${i}`}
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.2, delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%", top: "45%",
                transform: "translate(-50%, -50%)",
                width: 160, height: 160,
                borderRadius: "50%",
                border: "3px solid #e74c3c",
                boxShadow: "0 0 40px #e74c3c",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
