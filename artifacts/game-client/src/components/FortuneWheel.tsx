import { useEffect, useRef, useState } from "react";
import type { WheelSpinData } from "../hooks/useWheelSocket";
import { SEGMENTS, NUM_SEGMENTS, SEGMENT_ANGLE } from "../wheelSegments";
const CX = 300;
const CY = 300;
const R = 275;
const INNER_R = 55;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  // 0° = top (12 o'clock), clockwise — matches CSS rotate convention
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function segmentPath(cx: number, cy: number, r: number, innerR: number, startAngle: number, endAngle: number) {
  const outer1 = polarToCartesian(cx, cy, r, startAngle);
  const outer2 = polarToCartesian(cx, cy, r, endAngle);
  const inner1 = polarToCartesian(cx, cy, innerR, endAngle);
  const inner2 = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outer1.x} ${outer1.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${outer2.x} ${outer2.y}`,
    `L ${inner1.x} ${inner1.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${inner2.x} ${inner2.y}`,
    "Z",
  ].join(" ");
}

const BASE_URL = import.meta.env.BASE_URL as string;

interface FortuneWheelProps {
  spinData: WheelSpinData | null;
  isSpinning: boolean;
  initialRotation?: number;
}

export function FortuneWheel({ spinData, isSpinning, initialRotation = 0 }: FortuneWheelProps) {
  const [displayRotation, setDisplayRotation] = useState(initialRotation);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const prevInitialRef = useRef<number>(0);

  // Apply initialRotation from server sync — fires on every change (handles reconnects)
  useEffect(() => {
    if (initialRotation !== 0 && initialRotation !== prevInitialRef.current) {
      prevInitialRef.current = initialRotation;
      setDisplayRotation(initialRotation);
      setTransitionDuration(0); // instant jump, no animation
    }
  }, [initialRotation]);

  // Handle spin animation
  useEffect(() => {
    if (!spinData) return;
    setTransitionDuration(spinData.durationMs);
    setDisplayRotation(spinData.targetRotation);

    const timer = setTimeout(() => {
      setTransitionDuration(0);
    }, spinData.durationMs + 400);

    return () => clearTimeout(timer);
  }, [spinData]);

  const transitionStyle: React.CSSProperties =
    transitionDuration > 0
      ? { transition: `transform ${transitionDuration}ms cubic-bezier(0.17, 0.67, 0.08, 0.98)` }
      : {};

  // Pointer position: right side (90° = 3 o'clock), tip points LEFT into the wheel
  const tipX = CX + R + 6;
  const baseX = CX + R + 24;
  const pointerY = CY;
  const pointerH = 14;

  return (
    <svg width="100%" height="100%" viewBox="0 0 600 600" style={{ display: "block" }}>
      <defs>
        <filter id="wheel-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#000" floodOpacity="0.65" />
        </filter>
        <filter id="center-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#f1c40f" floodOpacity="0.6" />
        </filter>
        <filter id="pointer-shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Outer decorative ring (fixed, not spinning) */}
      <circle cx={CX} cy={CY} r={R + 13} fill="#1a252f" filter="url(#wheel-shadow)" />
      <circle cx={CX} cy={CY} r={R + 9} fill="none" stroke="#f1c40f" strokeWidth="3" />
      <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="rgba(241,196,15,0.3)" strokeWidth="1" />

      {/* ── Spinning group ───────────────────────────────────────────────── */}
      <g
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${displayRotation}deg)`,
          ...transitionStyle,
        }}
      >
        {SEGMENTS.map((seg, i) => {
          const startAngle = i * SEGMENT_ANGLE;
          const endAngle = (i + 1) * SEGMENT_ANGLE;
          const midAngle = startAngle + SEGMENT_ANGLE / 2;
          const textR = R * 0.7;
          const textPos = polarToCartesian(CX, CY, textR, midAngle);
          const isLong = seg.label.length > 6;
          const fontSize = isLong ? 9 : 13;

          return (
            <g key={i}>
              <path
                d={segmentPath(CX, CY, R, INNER_R, startAngle, endAngle)}
                fill={seg.color}
                stroke="#1a252f"
                strokeWidth="1.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={seg.textColor}
                fontSize={fontSize}
                fontWeight="bold"
                fontFamily="'Arial', sans-serif"
                transform={`rotate(${midAngle - 90}, ${textPos.x}, ${textPos.y})`}
                style={{ userSelect: "none" }}
              >
                {isLong ? (
                  <>
                    <tspan x={textPos.x} dy="-5">{seg.label.split(" ")[0]}</tspan>
                    <tspan x={textPos.x} dy="13">{seg.label.split(" ").slice(1).join(" ")}</tspan>
                  </>
                ) : (
                  seg.label
                )}
              </text>
            </g>
          );
        })}

        {/* Dot markers at segment boundaries */}
        {SEGMENTS.map((_, i) => {
          const angle = i * SEGMENT_ANGLE;
          const pos = polarToCartesian(CX, CY, R + 1, angle);
          return <circle key={`dot-${i}`} cx={pos.x} cy={pos.y} r={3.5} fill="#f1c40f" />;
        })}
      </g>
      {/* ── End spinning group ───────────────────────────────────────────── */}

      {/* Center circle — real duck image from original site, NOT spinning */}
      <defs>
        <clipPath id="center-clip">
          <circle cx={CX} cy={CY} r={INNER_R + 1} />
        </clipPath>
      </defs>
      <circle cx={CX} cy={CY} r={INNER_R + 7} fill="#2c3e50" stroke="#f1c40f" strokeWidth="2.5" />
      <image
        href={`${BASE_URL}wheel-assets/circle.png`}
        x={CX - INNER_R - 1}
        y={CY - INNER_R - 1}
        width={(INNER_R + 1) * 2}
        height={(INNER_R + 1) * 2}
        clipPath="url(#center-clip)"
        preserveAspectRatio="xMidYMid slice"
      />

      {/* ── Pointer arrow — tip points LEFT into the wheel (◀) ─────────── */}
      {/* Tip at wheel edge, base further right */}
      <polygon
        points={`${tipX},${pointerY} ${baseX},${pointerY - pointerH} ${baseX},${pointerY + pointerH}`}
        fill="#e74c3c"
        stroke="#fff"
        strokeWidth="1.5"
        filter="url(#pointer-shadow)"
      />
    </svg>
  );
}
