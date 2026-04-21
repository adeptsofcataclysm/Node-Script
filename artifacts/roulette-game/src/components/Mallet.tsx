import { useState } from "react";
import { motion } from "framer-motion";

interface MalletProps {
  onClick: () => void;
  disabled: boolean;
  onGrab?: () => void;
  onSwing?: () => void;
}

export function Mallet({ onClick, disabled, onGrab, onSwing }: MalletProps) {
  const [swinging, setSwinging] = useState(false);

  const handleMouseDown = () => {
    if (disabled) return;
    onGrab?.();
  };

  const handleClick = () => {
    if (disabled || swinging) return;
    setSwinging(true);
    onSwing?.();
    onClick();
    setTimeout(() => setSwinging(false), 600);
  };

  return (
    <div
      style={{ cursor: disabled ? "not-allowed" : "pointer", display: "inline-block", userSelect: "none" }}
      title={disabled ? "Колесо вращается..." : "Нажми, чтобы крутить!"}
      onMouseDown={handleMouseDown}
    >
      <motion.div
        animate={swinging ? { rotate: [-30, 15, -10, 5, 0] } : { rotate: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ transformOrigin: "60px 20px" }}
        whileHover={disabled ? {} : { scale: 1.06 }}
        onClick={handleClick}
      >
        <svg width="130" height="230" viewBox="0 0 130 230">
          <defs>
            <linearGradient id="handle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7B3F00" />
              <stop offset="40%" stopColor="#D2691E" />
              <stop offset="70%" stopColor="#CD853F" />
              <stop offset="100%" stopColor="#7B3F00" />
            </linearGradient>
            <linearGradient id="head-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d0d0d0" />
              <stop offset="25%" stopColor="#f0f0f0" />
              <stop offset="60%" stopColor="#c8c8c8" />
              <stop offset="100%" stopColor="#909090" />
            </linearGradient>
            <linearGradient id="head-front" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#888" />
              <stop offset="30%" stopColor="#bbb" />
              <stop offset="100%" stopColor="#777" />
            </linearGradient>
            <filter id="mallet-shadow">
              <feDropShadow dx="4" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Handle */}
          <rect x="54" y="78" width="20" height="150" rx="5" fill="url(#handle-grad)" filter="url(#mallet-shadow)" />
          <rect x="58" y="78" width="5" height="150" fill="rgba(255,255,255,0.18)" rx="2" />

          {/* Wrap marks on handle */}
          {[95, 112, 129, 146, 163, 180].map((y) => (
            <rect key={y} x="53" y={y} width="22" height="2.5" rx="1" fill="rgba(255,255,255,0.18)" />
          ))}

          {/* Mallet head — main face (top) */}
          <rect x="8" y="14" width="108" height="66" rx="7" fill="url(#head-top)" filter="url(#mallet-shadow)" />

          {/* 3D bottom side of head */}
          <path d="M10 80 L10 88 Q10 90 14 90 L112 90 Q118 90 118 84 L118 80 Z" fill="#707070" />
          {/* 3D right side of head */}
          <path d="M116 16 L124 22 L124 86 L118 80 L118 16 Z" fill="#888" opacity="0.6" />

          {/* Highlight stripe */}
          <rect x="12" y="20" width="100" height="8" rx="3" fill="rgba(255,255,255,0.4)" />

          {/* Red accent band */}
          <rect x="8" y="55" width="108" height="12" rx="2" fill="#c0392b" />
          <rect x="8" y="57" width="108" height="4" fill="rgba(255,255,255,0.2)" />

          {/* Handle bottom cap */}
          <rect x="52" y="220" width="24" height="8" rx="4" fill="#5D2E0C" />
        </svg>
      </motion.div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "3px",
          color: disabled ? "rgba(255,255,255,0.25)" : "rgba(241, 196, 15, 0.8)",
          marginTop: -12,
          transition: "color 0.3s",
        }}
      >
        {disabled ? "Вращается..." : "Крутить!"}
      </div>
    </div>
  );
}
