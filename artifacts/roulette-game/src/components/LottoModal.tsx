import { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BALL_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#27ae60",
  "#3498db", "#8e44ad", "#16a085", "#c0392b",
  "#d35400", "#2980b9", "#7d3c98", "#1e8449",
];

// ─── GIF popups during drum spin ─────────────────────────────────────────────
const LOTTO_GIFS = [
  "/gif_owl.gif", "/gif_duck_morning.gif", "/gif_cat.gif",
  "/gif_1.gif", "/gif_lunacat.gif", "/gif_dux.gif",
  "/gif_crunchycat.gif", "/gif_shock.gif", "/gif_duck2.gif",
  "/gif_duck_dance.gif", "/gif_ducks.gif",
];
interface GifPopup { id: number; src: string; x: number; y: number; size: number; }
let _gifId = 0;
let _gifQueue: string[] = [];

function _nextGif(): string {
  if (_gifQueue.length === 0) {
    // Shuffle a fresh copy of all GIFs
    const arr = [...LOTTO_GIFS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    _gifQueue = arr;
  }
  return _gifQueue.pop()!;
}

// ─── Pre-generated ambient particles ─────────────────────────────────────────
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
const STREAMERS_R = STREAMERS_L.map(s => ({ ...s, angle: 180 + 30 - s.angle + 60 }));

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

// ─── Full-screen confetti (pre-generated, deterministic) ─────────────────────
const EXTRA_COLORS = ["#ffffff", "#ffe566", "#ff69b4", "#00e5ff"];
const ALL_COLORS = [...BALL_COLORS, ...EXTRA_COLORS];

const FULL_CONFETTI = Array.from({ length: 120 }, (_, i) => {
  const angle = (i / 120) * Math.PI * 2 + ((i * 7) % 10) * 0.062;
  const speed = 32 + ((i * 13) % 52);
  const upBias = 18 + ((i * 9) % 28);
  return {
    id: i,
    color: ALL_COLORS[(i * 3) % ALL_COLORS.length],
    shape: i % 4 === 0 ? "circle" : i % 4 === 1 ? "diamond" : "rect",
    w: 6 + ((i * 3) % 10),
    h: i % 4 === 2 ? 4 + ((i * 2) % 6) : 6 + ((i * 3) % 10),
    tx: `${(Math.cos(angle) * speed).toFixed(1)}vw`,
    ty: `${(Math.sin(angle) * speed - upBias).toFixed(1)}vh`,
    rot: ((i * 79) % 720) - 360,
    delay: (i * 0.014) % 0.4,
    dur: 1.6 + ((i * 0.023) % 0.9),
  };
});

// ─── Ball physics data ────────────────────────────────────────────────────────
interface BallData {
  x: number; y: number;   // position relative to drum center
  vx: number; vy: number;
  r: number;
  color: string;
  label: string;
  idx: number;
}

const DRUM_R = 128; // physics radius
const BALL_R = 22;  // ball radius

// ─── Full-screen confetti blast ──────────────────────────────────────────────
function FullScreenConfetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55, overflow: "hidden" }}>
      {FULL_CONFETTI.map(p => {
        const br = p.shape === "circle" ? "50%" : "2px";
        const extra = p.shape === "diamond" ? { transform: "rotate(45deg)" } : {};
        return (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              width: p.w, height: p.h,
              marginLeft: -p.w / 2, marginTop: -p.h / 2,
              background: p.color,
              borderRadius: br,
              boxShadow: `0 0 5px ${p.color}99`,
              ...extra,
            }}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{
              x: p.tx, y: p.ty,
              scale: [0, 1.3, 1, 0.6, 0],
              rotate: p.rot,
              opacity: [0, 1, 1, 0.7, 0],
            }}
            transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

// ─── Canvas drum with real physics ───────────────────────────────────────────
const DrumCanvas = memo(function DrumCanvas({
  names,
  drumPhase,
  onRollComplete,
}: {
  names: string[];
  drumPhase: "spinning" | "rolling" | "revealed";
  onRollComplete: (idx: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(drumPhase);
  const ballsRef = useRef<BallData[]>([]);
  const chosenRef = useRef(-1);
  const rolledRef = useRef(false);
  const cbRef = useRef(onRollComplete);
  const rafRef = useRef(0);

  useEffect(() => { phaseRef.current = drumPhase; }, [drumPhase]);
  useEffect(() => { cbRef.current = onRollComplete; }, [onRollComplete]);

  // Initialise balls (runs when names change = new drum key)
  useEffect(() => {
    rolledRef.current = false;
    chosenRef.current = -1;
    const n = names.length;
    const maxR = DRUM_R - BALL_R - 4;
    ballsRef.current = names.map((_, i) => {
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const r = 18 + Math.random() * (maxR - 18);
      const spd = 2.5 + Math.random() * 2.5;
      const va = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        vx: Math.cos(va) * spd, vy: Math.sin(va) * spd,
        r: BALL_R, color: BALL_COLORS[i % BALL_COLORS.length],
        label: String(i + 1), idx: i,
      };
    });
  }, [names]);

  // Pick chosen ball when rolling starts
  useEffect(() => {
    if (drumPhase === "rolling") {
      rolledRef.current = false;
      chosenRef.current = Math.floor(Math.random() * names.length);
    }
  }, [drumPhase, names.length]);

  // Main animation loop — runs for the lifetime of the component
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const CX = canvas.width / 2;
    const CY = canvas.height / 2;

    const drawBall = (b: BallData, scale = 1, extraGlow = false) => {
      const r = b.r * scale;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = extraGlow ? 32 : 12;
      const gr = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, 0, b.x, b.y, r);
      gr.addColorStop(0, b.color + "ff");
      gr.addColorStop(0.65, b.color + "cc");
      gr.addColorStop(1, b.color + "66");
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();
      // shine
      const sh = ctx.createRadialGradient(b.x - r * 0.33, b.y - r * 0.36, 0, b.x - r * 0.08, b.y - r * 0.08, r * 0.68);
      sh.addColorStop(0, "rgba(255,255,255,0.58)");
      sh.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = sh; ctx.fill();
      ctx.restore();
      // label
      ctx.save();
      ctx.font = `900 ${Math.round(r * 0.7)}px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4;
      ctx.fillText(b.label, b.x, b.y);
      ctx.restore();
    };

    let simT = 0;          // simulation time
    let drumAngle = 0;     // drum rotation angle (radians) — drives centrifugal force

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(CX, CY);

      const state = phaseRef.current;
      const balls = ballsRef.current;
      const chosen = chosenRef.current;

      // ── Depth gradient overlay (drawn first, under balls) ──
      // Simulates bottom of drum being in shadow, top lit — gives 3D depth
      const depthGrad = ctx.createLinearGradient(0, -DRUM_R, 0, DRUM_R);
      depthGrad.addColorStop(0, "rgba(255,255,255,0.04)");   // subtle top highlight
      depthGrad.addColorStop(0.5, "rgba(0,0,0,0)");
      depthGrad.addColorStop(1, "rgba(0,0,0,0.38)");          // strong bottom shadow
      ctx.beginPath(); ctx.arc(0, 0, DRUM_R, 0, Math.PI * 2);
      ctx.fillStyle = depthGrad; ctx.fill();

      // ── Physics update ──
      if (state === "spinning" || state === "rolling") {
        simT += 1 / 60;

        // Drum rotates at ~1.5 rev/s when spinning — centrifugal force pushes balls outward
        const drumSpeed = state === "spinning" ? 9.4 : 0; // rad/s (9.4 ≈ 1.5 * 2π)
        drumAngle += drumSpeed / 60;

        // The centrifugal acceleration in the rotating frame: ω² × r
        // We apply it as a radial outward force proportional to ball's distance from axis
        const omega2 = (drumSpeed / 60) * (drumSpeed / 60) * 120; // scale for px units

        // Real constant gravity (downward, feels natural)
        const GRAVITY = 0.28;

        for (const b of balls) {
          if (state === "rolling" && b.idx === chosen) continue;

          if (state === "spinning") {
            // Centrifugal force — pushes ball radially outward (away from drum center)
            const bd = Math.sqrt(b.x * b.x + b.y * b.y);
            if (bd > 0.1) {
              b.vx += (b.x / bd) * omega2;
              b.vy += (b.y / bd) * omega2;
            }

            // Real gravity — pulls down. At high spin it's overwhelmed by centrifugal
            b.vy += GRAVITY;

            // Slight tangential stir (drum drags balls along its rim)
            const tang = 0.18;
            b.vx += -b.y / (DRUM_R) * tang;
            b.vy += b.x / (DRUM_R) * tang;
          }

          b.x += b.vx;
          b.y += b.vy;

          // Circular wall bounce — high restitution
          const d = Math.sqrt(b.x * b.x + b.y * b.y);
          const maxD = DRUM_R - b.r;
          if (d > maxD) {
            const nx = b.x / d, ny = b.y / d;
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) { b.vx -= 2 * dot * nx * 0.82; b.vy -= 2 * dot * ny * 0.82; }
            b.x = nx * maxD; b.y = ny * maxD;
          }

          // Speed clamp during spinning — never stop
          if (state === "spinning") {
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (spd < 2.5) { b.vx *= 2.5 / spd; b.vy *= 2.5 / spd; }
            if (spd > 8.0) { b.vx *= 8.0 / spd; b.vy *= 8.0 / spd; }
          }

          if (state === "rolling") {
            // Gravity pulls down, balls settle at bottom
            b.vy += GRAVITY;
            b.vx *= 0.94; b.vy *= 0.94;
            const bd = Math.sqrt(b.x * b.x + b.y * b.y);
            if (bd < 55 && bd > 0) { b.vx += (b.x / bd) * 0.3; b.vy += (b.y / bd) * 0.3; }
          }
        }

        // Ball–ball collisions — strong push-apart so they constantly jostle
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], bb = balls[j];
            if (state === "rolling" && (a.idx === chosen || bb.idx === chosen)) continue;
            const dx = bb.x - a.x, dy = bb.y - a.y;
            const d2 = dx * dx + dy * dy;
            const minD = a.r + bb.r;
            if (d2 < minD * minD && d2 > 0.001) {
              const d = Math.sqrt(d2);
              const nx = dx / d, ny = dy / d;
              const ov = (minD - d) * 0.55;
              a.x -= nx * ov; a.y -= ny * ov;
              bb.x += nx * ov; bb.y += ny * ov;
              const rvx = bb.vx - a.vx, rvy = bb.vy - a.vy;
              const dot = rvx * nx + rvy * ny;
              if (dot < 0) {
                const imp = dot * 0.88; // high restitution = bouncy collisions
                a.vx += imp * nx; a.vy += imp * ny;
                bb.vx -= imp * nx; bb.vy -= imp * ny;
              }
            }
          }
        }

        // Move chosen ball toward center
        if (state === "rolling" && chosen >= 0) {
          const cb = balls[chosen];
          if (cb) {
            const dx = -cb.x, dy = -cb.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 2.5) {
              const spd = Math.min(d * 0.11, 7);
              cb.x += (dx / d) * spd;
              cb.y += (dy / d) * spd;
              cb.vx = 0; cb.vy = 0;
            } else {
              cb.x = 0; cb.y = 0;
              if (!rolledRef.current) {
                rolledRef.current = true;
                const capIdx = chosen;
                setTimeout(() => cbRef.current(capIdx), 150);
              }
            }
          }
        }
      }

      // ── Draw ──
      for (const b of balls) {
        const isChosen = b.idx === chosen && state === "rolling";
        if (isChosen) continue; // draw on top last
        drawBall(b, 1, false);
      }
      if (state === "rolling" && chosen >= 0 && balls[chosen]) {
        const atCenter = Math.sqrt(balls[chosen].x ** 2 + balls[chosen].y ** 2) < 5;
        drawBall(balls[chosen], atCenter ? 1.25 : 1.05, atCenter);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // one-time — reads from refs

  return (
    <canvas
      ref={canvasRef}
      width={290}
      height={290}
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        background: "transparent",
        zIndex: 12,
        pointerEvents: "none",
        opacity: drumPhase === "revealed" ? 0 : 1,
        transition: "opacity 0.4s",
      }}
    />
  );
});

// ─── Small helper components ─────────────────────────────────────────────────

function PandoraBtn({ onClick, disabled, children, accent = "#f1c40f" }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; accent?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="px-5 py-2.5 font-mono text-xs uppercase tracking-[2px] transition-all duration-150"
      style={{
        background: "transparent",
        border: `1px solid ${disabled ? "#333" : accent}`,
        color: disabled ? "#333" : accent,
        cursor: disabled ? "not-allowed" : "pointer",
        textShadow: disabled ? "none" : `0 0 8px ${accent}88`,
        boxShadow: disabled ? "none" : `0 0 12px ${accent}22`,
      }}
    >{children}</button>
  );
}

function CoinParticle({ x, delay, dur, size, rot, drift }: typeof COINS[0]) {
  return (
    <motion.div style={{ position: "absolute", left: `${x}%`, top: 0, zIndex: 2, pointerEvents: "none" }}
      initial={{ y: "100vh", rotate: 0, opacity: 0, x: 0 }}
      animate={{ y: "-15vh", rotate: rot, opacity: [0, 1, 1, 0], x: drift }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
    >
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #ffe566, #c8870f)`,
        border: "2px solid #b07010",
        boxShadow: "0 0 10px rgba(241,196,15,0.9), inset 0 2px 4px rgba(255,255,255,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 900, color: "#7a4e00",
      }}>$</div>
    </motion.div>
  );
}

function DollarParticle({ x, delay, dur, w, h, tilt, drift }: typeof DOLLARS[0]) {
  return (
    <motion.div style={{ position: "absolute", left: `${x}%`, top: 0, zIndex: 2, pointerEvents: "none" }}
      initial={{ y: "100vh", rotate: tilt, opacity: 0, x: 0 }}
      animate={{ y: "-15vh", rotate: [tilt, -tilt, tilt * 0.6], opacity: [0, 1, 1, 0], x: drift }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
    >
      <div style={{
        width: w, height: h,
        background: "linear-gradient(135deg, #2ecc71, #1a7a3c)",
        border: "1.5px solid #1a6632", borderRadius: 3,
        boxShadow: "0 0 10px rgba(46,204,113,0.6), inset 0 1px 3px rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: h * 0.55, fontWeight: 900, color: "rgba(255,255,255,0.95)",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)", fontFamily: "monospace", letterSpacing: "-1px",
      }}>$ 100</div>
    </motion.div>
  );
}

function Streamer({ angle, len, color, delay, dur, originX, originY }: {
  angle: number; len: number; color: string; delay: number; dur: number;
  originX: number; originY: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * len, ty = Math.sin(rad) * len;
  return (
    <motion.div
      style={{
        position: "absolute", left: originX, top: originY,
        width: 3, height: len, background: color, borderRadius: 2,
        transformOrigin: "top center", zIndex: 6, pointerEvents: "none",
      }}
      initial={{ scaleY: 0, opacity: 0, x: 0, y: 0, rotate: angle - 90 }}
      animate={{ scaleY: [0, 1, 0.8, 0], opacity: [0, 1, 0.8, 0], x: [0, tx * 0.5, tx], y: [0, ty * 0.5, ty] }}
      transition={{ duration: dur, delay, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" }}
    />
  );
}

function BurstParticle({ tx, ty, color, shape, size, rot, delay }: typeof BURST[0]) {
  const br = shape === "circle" ? "50%" : "2px";
  const tf = shape === "diamond" ? "rotate(45deg)" : undefined;
  return (
    <motion.div
      style={{
        position: "absolute", left: "50%", top: "50%",
        width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2,
        background: color, borderRadius: br, transform: tf,
        zIndex: 30, pointerEvents: "none", boxShadow: `0 0 6px ${color}88`,
      }}
      initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
      animate={{ x: tx, y: ty, scale: [0, 1.2, 0.8, 0], rotate: rot, opacity: [1, 1, 0.6, 0] }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LottoModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [phase, setPhase] = useState<"setup" | "drum">("setup");
  const [nameInput, setNameInput] = useState("");
  const [names, setNames] = useState<string[]>([]);

  const [drumPhase, setDrumPhase] = useState<"spinning" | "rolling" | "revealed">("spinning");
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [drumKey, setDrumKey] = useState(0);
  const [showHomer, setShowHomer] = useState(false);
  const [gifPopups, setGifPopups] = useState<GifPopup[]>([]);

  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Homer runs across the bottom when drum starts spinning
  useEffect(() => {
    if (drumPhase !== "spinning") return;
    setShowHomer(true);
    const t = setTimeout(() => setShowHomer(false), 6400);
    return () => clearTimeout(t);
  }, [drumPhase]);

  // GIF popups — spawn while drum is spinning (only after "Запустить барабан")
  useEffect(() => {
    if (phase !== "drum" || drumPhase !== "spinning") {
      setGifPopups([]);
      return;
    }

    const spawnGif = () => {
      // Pick a random screen zone with padding so GIFs don't clip at edges
      const zone = Math.floor(Math.random() * 4);
      let x: number, y: number;
      if (zone === 0)      { x = 6 + Math.random() * 76; y = 6 + Math.random() * 10; }   // top strip
      else if (zone === 1) { x = 6 + Math.random() * 76; y = 73 + Math.random() * 10; }  // bottom strip
      else if (zone === 2) { x = 4 + Math.random() * 10; y = 12 + Math.random() * 60; }  // left strip
      else                 { x = 78 + Math.random() * 10; y = 12 + Math.random() * 60; } // right strip

      const src = _nextGif();
      const size = 160 + Math.floor(Math.random() * 100); // 160–260 px height
      const id = ++_gifId;

      setGifPopups(prev => prev.length >= 1 ? prev : [...prev, { id, src, x, y, size }]);

      // Auto-remove after 2.5–4s
      const lifetime = 2500 + Math.random() * 1500;
      setTimeout(() => setGifPopups(prev => prev.filter(p => p.id !== id)), lifetime);
    };

    // Spawn first one immediately, then every 2.2–2.8s (one at a time)
    spawnGif();
    const interval = setInterval(spawnGif, 2200 + Math.random() * 600);
    return () => clearInterval(interval);
  }, [phase, drumPhase]);

  // Lotto music (drum phase only)
  useEffect(() => {
    if (phase !== "drum") return;
    try {
      const audio = new Audio("/lotto-music.mp3");
      audio.loop = true; audio.volume = 0.45;
      audio.play().catch(() => {});
      musicRef.current = audio;
    } catch (_) {}
    return () => { if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; } };
  }, [phase]);

  const addName = () => {
    const t = nameInput.trim();
    if (!t || names.includes(t) || names.length >= 12) return;
    setNames(prev => [...prev, t]);
    setNameInput("");
  };

  const startDrum = () => {
    setPhase("drum");
    setDrumPhase("spinning");
    setChosenIdx(null);
    setDrumKey(k => k + 1);
  };

  const stopDrum = () => setDrumPhase("rolling");

  const handleRollComplete = (idx: number) => {
    setChosenIdx(idx);
    setDrumPhase("revealed");
  };

  const respin = () => {
    setChosenIdx(null);
    setDrumPhase("spinning");
    setDrumKey(k => k + 1);
  };

  const confirmChoice = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onConfirm();
  };
  const closeModal = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onClose();
  };

  const isActive = drumPhase === "spinning";
  const n = names.length;
  const chosenName = chosenIdx !== null ? names[chosenIdx] : null;
  const chosenColor = chosenIdx !== null ? BALL_COLORS[chosenIdx % BALL_COLORS.length] : "#f1c40f";

  const STARS = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360;
    const r = 90 + ((i * 11) % 40);
    return { id: i, x: Math.cos((a * Math.PI) / 180) * r, y: Math.sin((a * Math.PI) / 180) * r, size: 4 + ((i * 3) % 6), color: BALL_COLORS[i % BALL_COLORS.length], delay: i * 0.07 };
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: phase === "setup" ? "rgba(0,0,0,0.97)" : "rgba(0,0,0,0)" }}
    >
      {/* Video background — no overlay */}
      <AnimatePresence>
        {phase === "drum" && (
          <motion.video key="lotto-video" src="/lotto-bg.mp4" autoPlay muted loop playsInline
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Ambient particles */}
      <AnimatePresence>
        {phase === "drum" && drumPhase !== "revealed" && (
          <>
            {COINS.map(p => <CoinParticle key={p.id} {...p} />)}
            {DOLLARS.map(p => <DollarParticle key={p.id} {...p} />)}
          </>
        )}
      </AnimatePresence>

      {/* Full-screen confetti on reveal */}
      <FullScreenConfetti active={phase === "drum" && drumPhase === "revealed"} />

      {/* GIF popups — random positions while drum spins */}
      <AnimatePresence>
        {gifPopups.map(p => (
          <motion.img
            key={p.id}
            src={p.src}
            alt=""
            initial={{ scale: 0, opacity: 0, rotate: (Math.random() - 0.5) * 30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "backOut" }}
            style={{
              position: "fixed",
              left: `${p.x}vw`,
              top: `${p.y}vh`,
              height: p.size,
              width: "auto",
              zIndex: 58,
              pointerEvents: "none",
              borderRadius: 8,
              boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Homer runs left-to-right across the bottom on drum stop */}
      <AnimatePresence>
        {showHomer && (
          <motion.img
            key="homer-run"
            src="/homer.gif"
            alt=""
            initial={{ x: "-140px" }}
            animate={{ x: "calc(100vw + 20px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 6.0, ease: "linear" }}
            style={{
              position: "fixed",
              bottom: 28,
              left: 0,
              height: 120,
              zIndex: 60,
              pointerEvents: "none",
              imageRendering: "auto",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ════ SETUP ════ */}
        {phase === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-5 w-full max-w-sm" style={{ position: "relative", zIndex: 10 }}
          >
            <h2 className="text-3xl font-bold uppercase tracking-[4px] text-center"
              style={{ color: "#f1c40f", textShadow: "0 0 24px rgba(241,196,15,0.5)" }}>
              Барабан Лото
            </h2>
            <p className="text-xs font-mono uppercase tracking-[3px] text-center" style={{ color: "#555" }}>
              Добавьте участников (мин. 2, макс. 12)
            </p>

            <form className="flex gap-2 w-full" onSubmit={e => { e.preventDefault(); addName(); }}>
              <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                maxLength={16} placeholder="Имя участника"
                className="flex-1 px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #f1c40f44", color: "white" }}
              />
              <button type="submit" className="px-4 py-2 font-mono text-lg font-bold"
                style={{ background: "transparent", border: "1px solid #f1c40f", color: "#f1c40f", cursor: "pointer", textShadow: "0 0 8px #f1c40f" }}>
                +
              </button>
            </form>

            <div className="flex flex-col gap-1.5 w-full max-h-52 overflow-y-auto pr-1">
              {names.map((name, i) => (
                <motion.div key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between px-3 py-2 font-mono text-sm uppercase"
                  style={{ border: `1px solid ${BALL_COLORS[i % BALL_COLORS.length]}44`, color: BALL_COLORS[i % BALL_COLORS.length], background: `${BALL_COLORS[i % BALL_COLORS.length]}11` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: BALL_COLORS[i % BALL_COLORS.length], color: "white", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    {name}
                  </span>
                  <button onClick={() => setNames(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
                </motion.div>
              ))}
              {names.length === 0 && <p className="text-center font-mono text-xs py-4" style={{ color: "#333" }}>Список пуст</p>}
            </div>

            <div className="flex gap-3 w-full">
              <PandoraBtn onClick={closeModal} accent="#555">Отмена</PandoraBtn>
              <PandoraBtn onClick={startDrum} disabled={names.length < 2} accent="#f1c40f">Запустить барабан</PandoraBtn>
            </div>
          </motion.div>

        ) : (
          /* ════ DRUM ════ */
          <motion.div key="drum" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            className="flex flex-col items-center gap-5" style={{ position: "relative", zIndex: 10 }}
          >
            <motion.h2 className="text-2xl font-bold uppercase tracking-[4px]" style={{ color: "#f1c40f" }}
              animate={isActive
                ? { textShadow: ["0 0 12px #f1c40f88", "0 0 40px #f1c40fff", "0 0 12px #f1c40f88"] }
                : { textShadow: "0 0 20px #f1c40f44" }}
              transition={{ duration: 1.2, repeat: isActive ? Infinity : 0 }}>
              Барабан Лото
            </motion.h2>

            {/* ── Drum container ── */}
            <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>

              {/* Party streamers */}
              {isActive && STREAMERS_L.map(s => <Streamer key={s.id} {...s} originX={-8} originY={160} />)}
              {isActive && STREAMERS_R.map(s => <Streamer key={s.id} {...s} originX={328} originY={160} />)}

              {/* Pulsing outer ring */}
              <motion.div className="absolute rounded-full" style={{ width: 316, height: 316, border: "3px solid #f1c40f" }}
                animate={isActive
                  ? { boxShadow: ["0 0 30px rgba(241,196,15,0.3),inset 0 0 50px rgba(0,0,0,0.8)", "0 0 80px rgba(241,196,15,0.7),inset 0 0 50px rgba(0,0,0,0.8)", "0 0 30px rgba(241,196,15,0.3),inset 0 0 50px rgba(0,0,0,0.8)"], scale: [1, 1.015, 1] }
                  : { boxShadow: "0 0 40px rgba(241,196,15,0.25),inset 0 0 60px rgba(0,0,0,0.85)", scale: 1 }}
                transition={{ duration: 0.9, repeat: isActive ? Infinity : 0 }}
              />

              {/* Background fill */}
              <div className="absolute rounded-full" style={{ width: 310, height: 310, background: "radial-gradient(ellipse at center,rgba(30,15,0,0.85) 0%,rgba(0,0,0,0.96) 75%)", zIndex: 1 }} />

              {/* Rotating cage — outer frame spins like a real lottery drum */}
              <motion.svg className="absolute" width={296} height={296} style={{ zIndex: 5, transformOrigin: "148px 148px" }}
                animate={isActive ? { rotate: 360, opacity: 0.18 } : { rotate: 0, opacity: 0.12 }}
                transition={isActive
                  ? { rotate: { duration: 4, repeat: Infinity, ease: "linear" }, opacity: { duration: 0 } }
                  : { duration: 1.2, ease: "easeOut" }}>
                {/* 8 meridian spokes */}
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const x1 = 148 + Math.cos(a) * 30, y1 = 148 + Math.sin(a) * 30;
                  const x2 = 148 + Math.cos(a) * 144, y2 = 148 + Math.sin(a) * 144;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f1c40f" strokeWidth="1.2" />;
                })}
                {/* 3 latitude rings */}
                <ellipse cx="148" cy="148" rx="148" ry="40" fill="none" stroke="#f1c40f" strokeWidth="1.0" />
                <ellipse cx="148" cy="148" rx="100" ry="27" fill="none" stroke="#f1c40f" strokeWidth="0.8" />
                <ellipse cx="148" cy="148" rx="42" ry="148" fill="none" stroke="#f1c40f" strokeWidth="0.8" />
              </motion.svg>

              {/* Counter-rotating inner ring — spins opposite direction */}
              <motion.svg className="absolute" width={230} height={230} style={{ zIndex: 5, left: 45, top: 45, transformOrigin: "115px 115px" }}
                animate={{ rotate: isActive ? -360 : 0 }}
                transition={{ duration: 2.8, repeat: isActive ? Infinity : 0, ease: "linear" }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  return <line key={i} x1={115 + Math.cos(a) * 38} y1={115 + Math.sin(a) * 38} x2={115 + Math.cos(a) * 108} y2={115 + Math.sin(a) * 108} stroke="#f1c40f" strokeWidth="0.7" opacity={0.22} />;
                })}
                <circle cx="115" cy="115" r="38" fill="none" stroke="#f1c40f" strokeWidth="0.9" opacity={0.20} />
                <circle cx="115" cy="115" r="108" fill="none" stroke="#f1c40f" strokeWidth="0.9" opacity={0.14} />
              </motion.svg>

              {/* Canvas physics drum */}
              <DrumCanvas key={drumKey} names={names} drumPhase={drumPhase} onRollComplete={handleRollComplete} />

              {/* Center hub — fades when ball rolls in */}
              <motion.div className="absolute z-20 rounded-full flex items-center justify-center"
                style={{ width: 56, height: 56, background: "#0a0a0a", border: "2px solid #f1c40f", color: "#f1c40f", fontSize: 10, fontFamily: "monospace", letterSpacing: "1px", textAlign: "center", zIndex: 11 }}
                animate={{
                  opacity: drumPhase === "rolling" || drumPhase === "revealed" ? 0 : 1,
                  boxShadow: isActive ? ["0 0 8px rgba(241,196,15,0.2)", "0 0 24px rgba(241,196,15,0.7)", "0 0 8px rgba(241,196,15,0.2)"] : "0 0 12px rgba(241,196,15,0.3)",
                }}
                transition={{ duration: isActive ? 0.9 : 0.4, repeat: isActive ? Infinity : 0 }}>
                ЛОТО
              </motion.div>

              {/* Confetti burst */}
              <AnimatePresence>
                {drumPhase === "revealed" && BURST.map(p => <BurstParticle key={p.id} {...p} />)}
              </AnimatePresence>

              {/* Stars on reveal */}
              <AnimatePresence>
                {drumPhase === "revealed" && STARS.map(s => (
                  <motion.div key={s.id}
                    style={{ position: "absolute", left: "50%", top: "50%", width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2, background: s.color, clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)", zIndex: 31 }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x: s.x, y: s.y, scale: [0, 1.4, 1, 0], opacity: [0, 1, 1, 0], rotate: [0, 180, 360] }}
                    transition={{ duration: 1.4, delay: s.delay, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* ── Controls ── */}
            <div style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AnimatePresence mode="wait">
                {drumPhase === "spinning" && (
                  <motion.div key="btn-stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <PandoraBtn onClick={stopDrum} accent="#e74c3c">Остановить барабан</PandoraBtn>
                  </motion.div>
                )}
                {drumPhase === "rolling" && (
                  <motion.p key="rolling-hint" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                    className="font-mono text-xs uppercase tracking-[3px]" style={{ color: "#f1c40f" }}>
                    Выбираем счастливчика...
                  </motion.p>
                )}
                {drumPhase === "revealed" && chosenName !== null && (
                  <motion.div key="reveal" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18 }}
                    className="flex flex-col items-center gap-4">
                    {/* Big revealed ball */}
                    <motion.div className="rounded-full flex items-center justify-center"
                      style={{ width: 130, height: 130, background: `radial-gradient(circle at 35% 30%,${chosenColor}ff,${chosenColor}88)`, color: "white", fontSize: 28, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                      animate={{ boxShadow: [`0 0 40px ${chosenColor}88,0 0 80px ${chosenColor}33,inset 0 8px 24px rgba(255,255,255,0.55)`, `0 0 80px ${chosenColor}cc,0 0 140px ${chosenColor}55,inset 0 8px 24px rgba(255,255,255,0.7)`, `0 0 40px ${chosenColor}88,0 0 80px ${chosenColor}33,inset 0 8px 24px rgba(255,255,255,0.55)`], scale: [1, 1.04, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}>
                      {(chosenIdx ?? 0) + 1}
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                      className="flex flex-col items-center gap-1">
                      <p className="font-mono text-xs uppercase tracking-[4px]" style={{ color: "#666" }}>Счастливчик</p>
                      <motion.p className="text-4xl font-bold uppercase tracking-[3px]" style={{ color: chosenColor }}
                        animate={{ textShadow: [`0 0 20px ${chosenColor}88`, `0 0 50px ${chosenColor}ff`, `0 0 20px ${chosenColor}88`] }}
                        transition={{ duration: 1.4, repeat: Infinity }}>
                        {chosenName}
                      </motion.p>
                    </motion.div>
                    {/* Reveal coins */}
                    {COINS.slice(0, 8).map((p, i) => (
                      <motion.div key={`rc-${i}`} style={{ position: "absolute", left: `${20 + i * 9}%`, top: 0, zIndex: 2, pointerEvents: "none" }}
                        initial={{ y: "80vh", rotate: 0, opacity: 0 }} animate={{ y: "-10vh", rotate: p.rot, opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, ease: "easeOut" }}>
                        <div style={{ width: p.size + 6, height: p.size + 6, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%,#ffe566,#c8870f)`, border: "2px solid #b07010", boxShadow: "0 0 12px rgba(241,196,15,1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: (p.size + 6) * 0.38, fontWeight: 900, color: "#7a4e00" }}>$</div>
                      </motion.div>
                    ))}
                    <div className="flex gap-3 mt-1">
                      <PandoraBtn onClick={respin} accent="#555">Перекрутить</PandoraBtn>
                      <PandoraBtn onClick={confirmChoice} accent={chosenColor}>Подтвердить замену</PandoraBtn>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {drumPhase === "spinning" && (
              <button onClick={() => { setPhase("setup"); }}
                className="font-mono text-xs uppercase tracking-[2px] mt-1"
                style={{ background: "none", border: "none", color: "#333", cursor: "pointer" }}>
                ← Назад к списку
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
