import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";

const BALL_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#27ae60",
  "#3498db", "#8e44ad", "#16a085", "#c0392b",
  "#d35400", "#2980b9", "#7d3c98", "#1e8449",
];

const BALL_ORBIT = 100;
const BALL_SIZE = 46;

// ─── Pre-generated ambient particles (stable — no re-render on mount) ────────
const COINS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 3 + ((i * 8.1) % 94),
  delay: (i * 0.31) % 3.8,
  dur: 2.4 + ((i * 0.17) % 1.6),
  size: 18 + ((i * 4) % 14),
  rot: i % 2 === 0 ? 540 : -540,
  drift: ((i * 23) % 60) - 30,
}));

const DOLLARS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: 5 + ((i * 12.3) % 88),
  delay: 0.5 + ((i * 0.45) % 3.2),
  dur: 2.8 + ((i * 0.22) % 1.4),
  w: 44 + ((i * 6) % 20),
  h: 22 + ((i * 3) % 10),
  tilt: ((i * 17) % 30) - 15,
  drift: ((i * 31) % 70) - 35,
}));

const STREAMERS_L = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  angle: -30 + i * 15,
  len: 40 + ((i * 7) % 30),
  color: BALL_COLORS[i % BALL_COLORS.length],
  delay: (i * 0.12) % 1.4,
  dur: 0.8 + ((i * 0.09) % 0.6),
}));

const STREAMERS_R = STREAMERS_L.map(s => ({
  ...s, angle: 180 + 30 - s.angle + 60,
}));

// ─── Burst confetti (40 particles in all directions) ────────────────────────
const BURST = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 120 + ((i * 17) % 100);
  return {
    id: i,
    tx: Math.cos(rad) * dist,
    ty: Math.sin(rad) * dist,
    color: BALL_COLORS[i % BALL_COLORS.length],
    shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "diamond",
    size: 8 + ((i * 3) % 10),
    rot: ((i * 47) % 360),
    delay: (i * 0.018) % 0.25,
  };
});

// ─── Walking girl CSS keyframes ──────────────────────────────────────────────

const GIRL_CSS = `
  @keyframes lottoGirlWalk {
    0%   { transform: translateX(-160px); }
    100% { transform: translateX(calc(100vw + 160px)); }
  }
  @keyframes lottoLegA {
    0%, 100% { transform: rotate(-28deg); }
    50%       { transform: rotate(28deg); }
  }
  @keyframes lottoLegB {
    0%, 100% { transform: rotate(28deg); }
    50%       { transform: rotate(-28deg); }
  }
  @keyframes lottoArmA {
    0%, 100% { transform: rotate(-22deg); }
    50%       { transform: rotate(22deg); }
  }
  @keyframes lottoArmB {
    0%, 100% { transform: rotate(22deg); }
    50%       { transform: rotate(-22deg); }
  }
  @keyframes lottoBob {
    0%, 50%, 100% { transform: translateY(0px); }
    25%, 75%      { transform: translateY(-4px); }
  }
  @keyframes lottoHairSway {
    0%, 100% { transform: skewX(-4deg); }
    50%       { transform: skewX(4deg); }
  }
  @keyframes lottoSkirtSway {
    0%, 100% { transform: skewX(-2deg); }
    50%       { transform: skewX(2deg); }
  }
  .lotto-girl {
    position: absolute;
    bottom: 48px;
    left: 0;
    animation: lottoGirlWalk 11s linear infinite;
    animation-delay: 1.2s;
    z-index: 40;
    pointer-events: none;
    filter: drop-shadow(0 0 16px rgba(155,89,182,0.9)) drop-shadow(0 4px 8px rgba(0,0,0,0.6));
  }
  .lotto-girl-bob     { animation: lottoBob 0.42s ease-in-out infinite; }
  .lotto-girl-leg-a   { transform-origin: 50% 0%; animation: lottoLegA 0.42s ease-in-out infinite; }
  .lotto-girl-leg-b   { transform-origin: 50% 0%; animation: lottoLegB 0.42s ease-in-out infinite; }
  .lotto-girl-arm-a   { transform-origin: 50% 0%; animation: lottoArmA 0.42s ease-in-out infinite; }
  .lotto-girl-arm-b   { transform-origin: 50% 0%; animation: lottoArmB 0.42s ease-in-out infinite; }
  .lotto-girl-hair    { transform-origin: 40px 10px; animation: lottoHairSway 0.84s ease-in-out infinite; }
  .lotto-girl-skirt   { transform-origin: 40px 70px; animation: lottoSkirtSway 0.42s ease-in-out infinite; }
`;

function WalkingGirl({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: GIRL_CSS }} />
      <div className="lotto-girl">
        <div className="lotto-girl-bob">
          <svg width="82" height="152" viewBox="0 0 82 152" fill="none" xmlns="http://www.w3.org/2000/svg">

            {/* ── Hair (flowing behind / left) ── */}
            <g className="lotto-girl-hair">
              <path
                d="M38,8 C26,6 14,16 12,32 C10,48 16,62 22,60 C17,46 20,28 32,20 C34,18 36,14 38,8 Z"
                fill="#7d3c98"
              />
              <path
                d="M36,5 C28,4 18,10 14,22 C10,34 13,50 20,55 C16,42 18,26 30,18 Z"
                fill="#6c3483"
              />
              {/* Little flyaway strands */}
              <path d="M22,14 C16,10 12,4 16,2" stroke="#8e44ad" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M18,28 C10,22 8,14 12,11" stroke="#8e44ad" strokeWidth="1" fill="none" strokeLinecap="round"/>
            </g>

            {/* ── Head ── */}
            <circle cx="40" cy="16" r="13" fill="#e8d5f5" />
            {/* Cheek blush */}
            <ellipse cx="34" cy="19" rx="4" ry="2.5" fill="#c9a0dc" opacity="0.4" />
            <ellipse cx="46" cy="19" rx="4" ry="2.5" fill="#c9a0dc" opacity="0.4" />
            {/* Eyes */}
            <ellipse cx="35" cy="14" rx="2" ry="2.5" fill="#4a235a" />
            <ellipse cx="45" cy="14" rx="2" ry="2.5" fill="#4a235a" />
            <circle cx="36" cy="13" r="0.8" fill="white" />
            <circle cx="46" cy="13" r="0.8" fill="white" />
            {/* Eyelashes */}
            <path d="M33,11 L34,10 M35,10.5 L35,9.5 M37,11 L38,10" stroke="#4a235a" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M43,10 L44,10.5 M45,9.5 L45,10.5 M47,11 L48,10" stroke="#4a235a" strokeWidth="0.8" strokeLinecap="round"/>
            {/* Smile */}
            <path d="M36,21 Q40,25 44,21" stroke="#9b59b6" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            {/* Nose */}
            <path d="M39,17 Q40,19 41,17" stroke="#b07cc0" strokeWidth="0.8" fill="none"/>
            {/* Hair on top of head */}
            <path d="M28,10 Q40,3 52,10 Q48,7 40,6 Q32,7 28,10 Z" fill="#7d3c98" />

            {/* ── Neck ── */}
            <rect x="37" y="28" width="6" height="9" rx="2" fill="#e8d5f5" />

            {/* ── Bodice ── */}
            <path d="M25,35 L55,35 L57,72 L23,72 Z" fill="#9b59b6" />
            {/* Neckline */}
            <path d="M36,35 L40,42 L44,35" fill="#b07cc0" opacity="0.6" />
            {/* Belt */}
            <rect x="23" y="67" width="34" height="5" rx="2" fill="#6c3483" />

            {/* ── Skirt ── */}
            <g className="lotto-girl-skirt">
              <path d="M21,70 L59,70 L70,118 L10,118 Z" fill="#8e44ad" />
              {/* Skirt fold highlights */}
              <path d="M30,70 L52,70 L58,105 L24,105 Z" fill="#9b59b6" opacity="0.55" />
              <path d="M38,70 L46,70 L47,95 L37,95 Z" fill="#c39bd3" opacity="0.3" />
            </g>

            {/* ── Left arm ── */}
            <rect
              className="lotto-girl-arm-a"
              x="13" y="37" width="9" height="30" rx="4.5"
              fill="#c9a0dc"
            />
            {/* Left hand */}
            <circle cx="17.5" cy="68" r="4" fill="#e8d5f5" />

            {/* ── Right arm ── */}
            <rect
              className="lotto-girl-arm-b"
              x="60" y="37" width="9" height="30" rx="4.5"
              fill="#c9a0dc"
            />
            {/* Right hand */}
            <circle cx="64.5" cy="68" r="4" fill="#e8d5f5" />

            {/* ── Left leg ── */}
            <rect
              className="lotto-girl-leg-a"
              x="24" y="114" width="11" height="36" rx="5.5"
              fill="#e8d5f5"
            />
            {/* Left shoe */}
            <ellipse cx="27" cy="151" rx="8" ry="4" fill="#6c3483" />
            <ellipse cx="30" cy="150" rx="5" ry="3" fill="#8e44ad" />

            {/* ── Right leg ── */}
            <rect
              className="lotto-girl-leg-b"
              x="47" y="114" width="11" height="36" rx="5.5"
              fill="#e8d5f5"
            />
            {/* Right shoe */}
            <ellipse cx="55" cy="151" rx="8" ry="4" fill="#6c3483" />
            <ellipse cx="52" cy="150" rx="5" ry="3" fill="#8e44ad" />

          </svg>
        </div>
      </div>
    </>
  );
}

// ─── Small helper components ─────────────────────────────────────────────────

function PandoraBtn({
  onClick, disabled, children, accent = "#f1c40f",
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 font-mono text-xs uppercase tracking-[2px] transition-all duration-150"
      style={{
        background: "transparent",
        border: `1px solid ${disabled ? "#333" : accent}`,
        color: disabled ? "#333" : accent,
        cursor: disabled ? "not-allowed" : "pointer",
        textShadow: disabled ? "none" : `0 0 8px ${accent}88`,
        boxShadow: disabled ? "none" : `0 0 12px ${accent}22`,
      }}
    >
      {children}
    </button>
  );
}

function CoinParticle({ x, delay, dur, size, rot, drift }: typeof COINS[0]) {
  return (
    <motion.div
      style={{ position: "absolute", left: `${x}%`, top: 0, zIndex: 2, pointerEvents: "none" }}
      initial={{ y: "100vh", rotate: 0, opacity: 0, x: 0 }}
      animate={{ y: "-15vh", rotate: rot, opacity: [0, 1, 1, 0], x: drift }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
    >
      <div
        style={{
          width: size, height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, #ffe566, #c8870f)`,
          border: "2px solid #b07010",
          boxShadow: "0 0 10px rgba(241,196,15,0.9), inset 0 2px 4px rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, fontWeight: 900, color: "#7a4e00",
        }}
      >
        $
      </div>
    </motion.div>
  );
}

function DollarParticle({ x, delay, dur, w, h, tilt, drift }: typeof DOLLARS[0]) {
  return (
    <motion.div
      style={{ position: "absolute", left: `${x}%`, top: 0, zIndex: 2, pointerEvents: "none" }}
      initial={{ y: "100vh", rotate: tilt, opacity: 0, x: 0 }}
      animate={{ y: "-15vh", rotate: [tilt, -tilt, tilt * 0.6], opacity: [0, 1, 1, 0], x: drift }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
    >
      <div
        style={{
          width: w, height: h,
          background: "linear-gradient(135deg, #2ecc71, #1a7a3c)",
          border: "1.5px solid #1a6632",
          borderRadius: 3,
          boxShadow: "0 0 10px rgba(46,204,113,0.6), inset 0 1px 3px rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: h * 0.55, fontWeight: 900, color: "rgba(255,255,255,0.95)",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          fontFamily: "monospace", letterSpacing: "-1px",
        }}
      >
        $ 100
      </div>
    </motion.div>
  );
}

function Streamer({ angle, len, color, delay, dur, originX, originY }: {
  angle: number; len: number; color: string; delay: number; dur: number;
  originX: number; originY: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * len;
  const ty = Math.sin(rad) * len;
  return (
    <motion.div
      style={{
        position: "absolute",
        left: originX, top: originY,
        width: 3, height: len,
        background: color,
        borderRadius: 2,
        transformOrigin: "top center",
        zIndex: 6, pointerEvents: "none",
      }}
      initial={{ scaleY: 0, opacity: 0, x: 0, y: 0, rotate: angle - 90 }}
      animate={{
        scaleY: [0, 1, 0.8, 0],
        opacity: [0, 1, 0.8, 0],
        x: [0, tx * 0.5, tx],
        y: [0, ty * 0.5, ty],
      }}
      transition={{ duration: dur, delay, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" }}
    />
  );
}

function BurstParticle({ tx, ty, color, shape, size, rot, delay }: typeof BURST[0]) {
  const borderRadius = shape === "circle" ? "50%" : shape === "diamond" ? "2px" : "2px";
  const transform = shape === "diamond" ? "rotate(45deg)" : undefined;
  return (
    <motion.div
      style={{
        position: "absolute", left: "50%", top: "50%",
        width: size, height: size,
        marginLeft: -size / 2, marginTop: -size / 2,
        background: color,
        borderRadius,
        transform,
        zIndex: 8, pointerEvents: "none",
        boxShadow: `0 0 6px ${color}88`,
      }}
      initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
      animate={{
        x: tx, y: ty,
        scale: [0, 1.2, 0.8, 0],
        rotate: rot,
        opacity: [1, 1, 0.6, 0],
      }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LottoModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [phase, setPhase] = useState<"setup" | "drum">("setup");
  const [nameInput, setNameInput] = useState("");
  const [names, setNames] = useState<string[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);

  const rotate = useMotionValue(0);
  const absRot = useRef(0);
  const rafRef = useRef<number>(0);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Lotto music — only when drum is spinning
  useEffect(() => {
    if (phase !== "drum") return;
    try {
      const audio = new Audio("/lotto-music.mp3");
      audio.loop = true;
      audio.volume = 0.45;
      audio.play().catch(() => {});
      musicRef.current = audio;
    } catch (_) {}
    return () => {
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    };
  }, [phase]);

  // RAF spin loop
  useEffect(() => {
    if (!isSpinning) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      absRot.current += 150 * dt;
      rotate.set(absRot.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isSpinning, rotate]);

  const addName = () => {
    const t = nameInput.trim();
    if (!t || names.includes(t) || names.length >= 12) return;
    setNames(prev => [...prev, t]);
    setNameInput("");
  };

  const startDrum = () => {
    absRot.current = 0;
    rotate.set(0);
    setPhase("drum");
    setIsSpinning(true);
    setRevealed(false);
    setChosenIdx(null);
  };

  const stopDrum = () => setIsSpinning(false);

  const revealChoice = () => {
    if (isSpinning || revealed) return;
    setChosenIdx(Math.floor(Math.random() * names.length));
    setRevealed(true);
  };

  const respin = () => {
    setRevealed(false);
    setChosenIdx(null);
    absRot.current = 0;
    rotate.set(0);
    setIsSpinning(true);
  };

  const confirmChoice = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onConfirm();
  };

  const closeModal = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onClose();
  };

  const n = names.length;
  const chosenName = chosenIdx !== null ? names[chosenIdx] : null;
  const chosenColor = chosenIdx !== null ? BALL_COLORS[chosenIdx % BALL_COLORS.length] : "#f1c40f";

  // Popper origins (relative to drum container center 155,155)
  const popperL = { x: -168, y: 0 };
  const popperR = { x: 168, y: 0 };

  // Star sparkles around revealed name
  const STARS = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360;
    const r = 90 + ((i * 11) % 40);
    return {
      id: i,
      x: Math.cos((a * Math.PI) / 180) * r,
      y: Math.sin((a * Math.PI) / 180) * r,
      size: 4 + ((i * 3) % 6),
      color: BALL_COLORS[i % BALL_COLORS.length],
      delay: i * 0.07,
    };
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: "rgba(0,0,0,0.0)" }}
    >
      {/* ── Video background ── */}
      <video
        src="/lotto-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.55,
        }}
      />
      {/* Dark overlay so UI stays readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          zIndex: 1,
        }}
      />

      {/* ── Walking girl ── */}
      <WalkingGirl active={phase === "drum"} />

      {/* ── Ambient floating particles (drum phase only) ── */}
      <AnimatePresence>
        {phase === "drum" && !revealed && (
          <>
            {COINS.map(p => <CoinParticle key={p.id} {...p} />)}
            {DOLLARS.map(p => <DollarParticle key={p.id} {...p} />)}
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "setup" ? (
          /* ════════════ SETUP PHASE ════════════ */
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-5 w-full max-w-sm"
            style={{ position: "relative", zIndex: 10 }}
          >
            <h2
              className="text-3xl font-bold uppercase tracking-[4px] text-center"
              style={{ color: "#f1c40f", textShadow: "0 0 24px rgba(241,196,15,0.5)" }}
            >
              Барабан Лото
            </h2>
            <p className="text-xs font-mono uppercase tracking-[3px] text-center" style={{ color: "#555" }}>
              Добавьте участников (мин. 2, макс. 12)
            </p>

            <form className="flex gap-2 w-full" onSubmit={(e) => { e.preventDefault(); addName(); }}>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={16}
                placeholder="Имя участника"
                className="flex-1 px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #f1c40f44", color: "white" }}
              />
              <button
                type="submit"
                className="px-4 py-2 font-mono text-lg font-bold"
                style={{ background: "transparent", border: "1px solid #f1c40f", color: "#f1c40f", cursor: "pointer", textShadow: "0 0 8px #f1c40f" }}
              >
                +
              </button>
            </form>

            <div className="flex flex-col gap-1.5 w-full max-h-52 overflow-y-auto pr-1">
              {names.map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between px-3 py-2 font-mono text-sm uppercase"
                  style={{
                    border: `1px solid ${BALL_COLORS[i % BALL_COLORS.length]}44`,
                    color: BALL_COLORS[i % BALL_COLORS.length],
                    background: `${BALL_COLORS[i % BALL_COLORS.length]}11`,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, borderRadius: "50%",
                      background: BALL_COLORS[i % BALL_COLORS.length],
                      color: "white", fontSize: 11, fontWeight: 900, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {name}
                  </span>
                  <button
                    onClick={() => setNames(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
                  >
                    ×
                  </button>
                </motion.div>
              ))}
              {names.length === 0 && (
                <p className="text-center font-mono text-xs py-4" style={{ color: "#333" }}>Список пуст</p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <PandoraBtn onClick={closeModal} accent="#555">Отмена</PandoraBtn>
              <PandoraBtn onClick={startDrum} disabled={names.length < 2} accent="#f1c40f">
                Запустить барабан
              </PandoraBtn>
            </div>
          </motion.div>

        ) : (
          /* ════════════ DRUM PHASE ════════════ */
          <motion.div
            key="drum"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="flex flex-col items-center gap-5"
            style={{ position: "relative", zIndex: 10 }}
          >
            {/* Title pulses when spinning */}
            <motion.h2
              className="text-2xl font-bold uppercase tracking-[4px]"
              style={{ color: "#f1c40f" }}
              animate={isSpinning
                ? { textShadow: ["0 0 12px #f1c40f88", "0 0 40px #f1c40fff", "0 0 12px #f1c40f88"] }
                : { textShadow: "0 0 20px #f1c40f44" }}
              transition={{ duration: 1.2, repeat: isSpinning ? Infinity : 0 }}
            >
              Барабан Лото
            </motion.h2>

            {/* ── Drum container ── */}
            <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>

              {/* Party streamers from left */}
              {isSpinning && STREAMERS_L.map(s => (
                <Streamer key={s.id} {...s} originX={popperL.x + 160} originY={popperL.y + 160} />
              ))}
              {isSpinning && STREAMERS_R.map(s => (
                <Streamer key={s.id} {...s} originX={popperR.x + 160} originY={popperR.y + 160} />
              ))}

              {/* Outer pulsing glow ring */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 316, height: 316, border: "3px solid #f1c40f" }}
                animate={isSpinning
                  ? {
                    boxShadow: [
                      "0 0 30px rgba(241,196,15,0.3), inset 0 0 50px rgba(0,0,0,0.8)",
                      "0 0 80px rgba(241,196,15,0.7), inset 0 0 50px rgba(0,0,0,0.8)",
                      "0 0 30px rgba(241,196,15,0.3), inset 0 0 50px rgba(0,0,0,0.8)",
                    ],
                    scale: [1, 1.015, 1],
                  }
                  : { boxShadow: "0 0 40px rgba(241,196,15,0.25), inset 0 0 60px rgba(0,0,0,0.85)", scale: 1 }}
                transition={{ duration: 0.9, repeat: isSpinning ? Infinity : 0 }}
              />

              {/* Background fill */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 310, height: 310,
                  background: "radial-gradient(ellipse at center, rgba(30,15,0,0.85) 0%, rgba(0,0,0,0.96) 75%)",
                  zIndex: 1,
                }}
              />

              {/* SVG cage lines */}
              <motion.svg
                className="absolute"
                width={296} height={296}
                style={{ zIndex: 5 }}
                animate={isSpinning ? { opacity: [0.12, 0.22, 0.12] } : { opacity: 0.12 }}
                transition={{ duration: 0.9, repeat: isSpinning ? Infinity : 0 }}
              >
                <line x1="148" y1="0" x2="148" y2="296" stroke="#f1c40f" strokeWidth="1" />
                <line x1="0" y1="148" x2="296" y2="148" stroke="#f1c40f" strokeWidth="1" />
                <line x1="42" y1="42" x2="254" y2="254" stroke="#f1c40f" strokeWidth="1" />
                <line x1="254" y1="42" x2="42" y2="254" stroke="#f1c40f" strokeWidth="1" />
                <ellipse cx="148" cy="148" rx="148" ry="52" fill="none" stroke="#f1c40f" strokeWidth="1" />
                <ellipse cx="148" cy="148" rx="52" ry="148" fill="none" stroke="#f1c40f" strokeWidth="1" />
              </motion.svg>

              {/* Counter-rotating inner ring */}
              <motion.svg
                className="absolute"
                width={230} height={230}
                style={{ zIndex: 5, left: 45, top: 45 }}
                animate={{ rotate: isSpinning ? -360 : 0 }}
                transition={{ duration: 6, repeat: isSpinning ? Infinity : 0, ease: "linear" }}
              >
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * 360;
                  const r = (a * Math.PI) / 180;
                  const x1 = 115 + Math.cos(r) * 50;
                  const y1 = 115 + Math.sin(r) * 50;
                  const x2 = 115 + Math.cos(r) * 110;
                  const y2 = 115 + Math.sin(r) * 110;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f1c40f" strokeWidth="0.8" opacity={0.18} />;
                })}
                <circle cx="115" cy="115" r="50" fill="none" stroke="#f1c40f" strokeWidth="0.8" opacity={0.15} />
                <circle cx="115" cy="115" r="110" fill="none" stroke="#f1c40f" strokeWidth="0.8" opacity={0.1} />
              </motion.svg>

              {/* Drum shake when spinning */}
              <motion.div
                className="absolute"
                style={{ width: 270, height: 270, rotate, zIndex: 10 }}
                animate={isSpinning ? { x: [-1, 1, -0.5, 0.5, 0] } : { x: 0 }}
                transition={isSpinning ? { duration: 0.15, repeat: Infinity } : undefined}
              >
                {names.map((_, i) => {
                  const angle = (i / n) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const bx = Math.sin(rad) * BALL_ORBIT + 135 - BALL_SIZE / 2;
                  const by = -Math.cos(rad) * BALL_ORBIT + 135 - BALL_SIZE / 2;
                  const color = BALL_COLORS[i % BALL_COLORS.length];
                  return (
                    <motion.div
                      key={i}
                      className="absolute rounded-full flex items-center justify-center"
                      style={{
                        width: BALL_SIZE, height: BALL_SIZE,
                        left: bx, top: by,
                        background: `radial-gradient(circle at 35% 30%, ${color}ff, ${color}88)`,
                        color: "white", fontSize: 15, fontWeight: 900,
                        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                      }}
                      animate={isSpinning
                        ? {
                          boxShadow: [
                            `0 0 10px ${color}66, inset 0 4px 10px rgba(255,255,255,0.5)`,
                            `0 0 28px ${color}cc, inset 0 4px 10px rgba(255,255,255,0.6)`,
                            `0 0 10px ${color}66, inset 0 4px 10px rgba(255,255,255,0.5)`,
                          ],
                          scale: [1, 1.07, 1],
                        }
                        : {
                          boxShadow: `0 0 14px ${color}99, inset 0 4px 10px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.45)`,
                          scale: 1,
                        }}
                      transition={{
                        duration: 0.7 + (i * 0.08) % 0.4,
                        delay: (i * 0.06) % 0.4,
                        repeat: isSpinning ? Infinity : 0,
                      }}
                    >
                      {i + 1}
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Center hub */}
              <motion.div
                className="absolute z-20 rounded-full flex items-center justify-center"
                style={{
                  width: 56, height: 56,
                  background: "#0a0a0a",
                  border: "2px solid #f1c40f",
                  color: "#f1c40f",
                  fontSize: 10, fontFamily: "monospace", letterSpacing: "1px", textAlign: "center",
                }}
                animate={isSpinning
                  ? { boxShadow: ["0 0 8px rgba(241,196,15,0.2)", "0 0 24px rgba(241,196,15,0.7)", "0 0 8px rgba(241,196,15,0.2)"] }
                  : { boxShadow: "0 0 12px rgba(241,196,15,0.3)" }}
                transition={{ duration: 0.9, repeat: isSpinning ? Infinity : 0 }}
              >
                ЛОТО
              </motion.div>

              {/* Confetti burst on reveal */}
              <AnimatePresence>
                {revealed && BURST.map(p => <BurstParticle key={p.id} {...p} />)}
              </AnimatePresence>

              {/* Star sparkles on reveal */}
              <AnimatePresence>
                {revealed && STARS.map(s => (
                  <motion.div
                    key={s.id}
                    style={{
                      position: "absolute",
                      left: "50%", top: "50%",
                      width: s.size, height: s.size,
                      marginLeft: -s.size / 2, marginTop: -s.size / 2,
                      background: s.color,
                      clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                      zIndex: 9,
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{
                      x: s.x, y: s.y,
                      scale: [0, 1.4, 1, 0],
                      opacity: [0, 1, 1, 0],
                      rotate: [0, 180, 360],
                    }}
                    transition={{ duration: 1.4, delay: s.delay, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* ── Controls / Reveal ── */}
            <AnimatePresence>
              {!revealed ? (
                <motion.div
                  key="controls"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3"
                >
                  <PandoraBtn onClick={stopDrum} disabled={!isSpinning} accent="#e74c3c">
                    Остановить барабан
                  </PandoraBtn>
                  <PandoraBtn onClick={revealChoice} disabled={isSpinning} accent="#f1c40f">
                    Озвучить выбор
                  </PandoraBtn>
                </motion.div>
              ) : (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Big revealed ball */}
                  <motion.div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 130, height: 130,
                      background: `radial-gradient(circle at 35% 30%, ${chosenColor}ff, ${chosenColor}88)`,
                      color: "white", fontSize: 28, fontWeight: 900,
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 40px ${chosenColor}88, 0 0 80px ${chosenColor}33, inset 0 8px 24px rgba(255,255,255,0.55)`,
                        `0 0 80px ${chosenColor}cc, 0 0 140px ${chosenColor}55, inset 0 8px 24px rgba(255,255,255,0.7)`,
                        `0 0 40px ${chosenColor}88, 0 0 80px ${chosenColor}33, inset 0 8px 24px rgba(255,255,255,0.55)`,
                      ],
                      scale: [1, 1.04, 1],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {(chosenIdx ?? 0) + 1}
                  </motion.div>

                  {/* Name */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <p className="font-mono text-xs uppercase tracking-[4px]" style={{ color: "#666" }}>
                      Счастливчик
                    </p>
                    <motion.p
                      className="text-4xl font-bold uppercase tracking-[3px]"
                      style={{ color: chosenColor }}
                      animate={{
                        textShadow: [
                          `0 0 20px ${chosenColor}88`,
                          `0 0 50px ${chosenColor}ff`,
                          `0 0 20px ${chosenColor}88`,
                        ],
                      }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      {chosenName}
                    </motion.p>
                  </motion.div>

                  {/* Celebrate coins burst */}
                  <AnimatePresence>
                    {revealed && COINS.slice(0, 8).map((p, i) => (
                      <motion.div
                        key={`rc-${i}`}
                        style={{
                          position: "absolute", left: `${20 + i * 9}%`, top: 0, zIndex: 2, pointerEvents: "none",
                        }}
                        initial={{ y: "80vh", rotate: 0, opacity: 0 }}
                        animate={{ y: "-10vh", rotate: p.rot, opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, ease: "easeOut" }}
                      >
                        <div style={{
                          width: p.size + 6, height: p.size + 6,
                          borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, #ffe566, #c8870f)`,
                          border: "2px solid #b07010",
                          boxShadow: "0 0 12px rgba(241,196,15,1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: (p.size + 6) * 0.38, fontWeight: 900, color: "#7a4e00",
                        }}>$</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="flex gap-3 mt-1">
                    <PandoraBtn onClick={respin} accent="#555">Перекрутить</PandoraBtn>
                    <PandoraBtn onClick={confirmChoice} accent={chosenColor}>Подтвердить замену</PandoraBtn>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!revealed && (
              <button
                onClick={() => { setPhase("setup"); setIsSpinning(false); cancelAnimationFrame(rafRef.current); }}
                className="font-mono text-xs uppercase tracking-[2px] mt-1"
                style={{ background: "none", border: "none", color: "#333", cursor: "pointer" }}
              >
                ← Назад к списку
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
