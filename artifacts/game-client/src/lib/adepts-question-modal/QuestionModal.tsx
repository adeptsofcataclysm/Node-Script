import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Trophy, ChevronRight, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { AdeptsBoardId, Question, Player } from "@/lib/adepts-quiz-types";
import { peekAdeptsWheelReturnCloseCardFlag } from "@/lib/quizAdeptsWheelClient";

type Stage = "question" | "answer";

const ADEPTS_EMBLEM_URL = "/lor-adeptov-icon.png";

interface QuestionModalProps {
  board: AdeptsBoardId;
  isOpen: boolean;
  themeName: string;
  points: number;
  question: Question;
  players: Player[];
  /** Синхронизация этапа «вопрос / ответ» между ведущим и зрителем */
  quizStage: Stage;
  onQuizStageChange: (stage: Stage) => void;
  /** Только просмотр: без закрытия по клику снаружи и без управления карточкой */
  readonly?: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Question>) => void;
  onAwardPoints: (playerIndex: number, points: number) => void;
  /** Неверный ответ: снять очки с текущего игрока и передать ход следующему. */
  onPassTurn?: () => void;
  /** Следующий игрок без снятия очков (карточка закрывается как использованная). */
  onPassTurnNext?: () => void;
  /** Индекс места 0–4, чей сейчас ход на столе (для блока передачи хода после splash). */
  currentTurnSeat?: number;
  /** Место текущего клиента, если он игрок за столом; иначе null — блок передачи не показывается. */
  viewerSeatIndex?: number | null;
  /** Игрок с splash-карточкой передаёт ход выбранному месту (синхронится с сервером). */
  onPassTurnToSeat?: (targetSeatIndex: number) => void;
  /**
   * После первой передачи хода по еноту родитель ставит false — получивший ход не видит повторный выбор.
   * @default true
   */
  allowRaccoonSplashSeatPass?: boolean;
  /** Енот скрыт (общее состояние стола, не локально). */
  splashDismissed?: boolean;
  /** Ведущий или игрок с ходом — единственные, кто может кликнуть по вылетающему еноту. */
  canDismissRaccoonSplash?: boolean;
  /** Записать в синхронизируемое состояние, что splash закрыт. */
  onDismissSplash?: () => void;
  /** dedFly: синхронно начать вылет картинки вправо (все клиенты). */
  splashDedFlyExitStarted?: boolean;
  onDedFlyExitStart?: () => void;
  /** dedFly: после анимации вылета вызвать onDismissSplash (только ведущий). */
  canFinalizeDedFlySplashDismiss?: boolean;
  /** Подсветка карточки передачи хода (место 0–4), общая для всех клиентов. */
  splashPassHoverSeat?: number | null;
  /** Только игрок с ходом обновляет наведение (pointer enter/leave). */
  onSplashPassHoverSeatChange?: (seatIndex: number | null) => void;
  /** Ведущий: открыть колесо адептов у всех клиентов квиза (см. `/quiz-nav`). */
  onHostBroadcastAdeptsWheel?: (payload: {
    returnHref: string;
    currentTurnSeat: number;
  }) => void;
  /** Ведущий: открыть русскую рулетку у всех клиентов квиза (`/quiz-nav` → `/game` или `/spectate`). */
  onHostBroadcastPandoraRoulette?: () => void;
}

const TIMER_SECONDS = 30;
/** Было 0.5; снижено на 35% для freebie-400-answer.mp3 (карточки с «Колесо Адептов»). */
const FREEBIE_ANSWER_SOUND_VOLUME = 0.5 * 0.65;
const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg)$/i.test(url);
}

const FW_COLORS = [
  "#FFD700","#FF4444","#44DDFF","#FF44FF","#44FF88",
  "#FF8844","#FFFFFF","#FFAA00","#AA44FF","#44FFFF",
];

type Rocket = {
  x: number; y: number; vy: number;
  color: string; trail: { x: number; y: number }[];
  exploded: boolean;
};

type Spark = {
  x: number; y: number; vx: number; vy: number;
  color: string; alpha: number; size: number; tail: { x: number; y: number }[];
};

type Confetti = {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; color: string; rotation: number; rotSpeed: number; alpha: number;
};

function Fireworks({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const confettiRef = useRef<Confetti[]>([]);

  useEffect(() => {
    if (!active) {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
      rocketsRef.current = [];
      sparksRef.current = [];
      confettiRef.current = [];
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const launchRocket = () => {
      rocketsRef.current.push({
        x: W * (0.15 + Math.random() * 0.7),
        y: H,
        vy: -(7 + Math.random() * 4.5),
        color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
        trail: [],
        exploded: false,
      });
    };

    const explode = (x: number, y: number, color: string) => {
      const count = 55 + Math.floor(Math.random() * 25);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15;
        const speed = 0.45 + Math.random() * 2.1;
        const sparkColor = Math.random() < 0.3
          ? FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)]
          : color;
        sparksRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: sparkColor,
          alpha: 1,
          size: 2.5 + Math.random() * 2.5,
          tail: [],
        });
      }
    };

    const spawnConfetti = () => {
      for (let i = 0; i < 3; i++) {
        confettiRef.current.push({
          x: Math.random() * W,
          y: -12,
          vx: (Math.random() - 0.5) * 1.6,
          vy: 0.9 + Math.random() * 1.9,
          w: 8 + Math.random() * 10,
          h: 5 + Math.random() * 6,
          color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
          alpha: 1,
        });
      }
    };

    const MAX_SPARKS = 700;

    let frame = 0;
    const startTime = performance.now();
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, W, H);
      frame++;

      const elapsed = performance.now() - startTime;
      if (frame % 40 === 0) launchRocket();
      if (elapsed < 14000) spawnConfetti();

      // Rockets
      rocketsRef.current = rocketsRef.current.filter((r) => !r.exploded);
      for (const r of rocketsRef.current) {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();
        r.y += r.vy * 0.72;
        r.vy += 0.14;

        // Trail as single polyline
        if (r.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(r.trail[0].x, r.trail[0].y);
          for (let i = 1; i < r.trail.length; i++) ctx.lineTo(r.trail[i].x, r.trail[i].y);
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
        }
        // Head
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        if (r.vy >= -1) {
          r.exploded = true;
          explode(r.x, r.y, r.color);
        }
      }

      // Trim sparks if too many
      if (sparksRef.current.length > MAX_SPARKS) {
        sparksRef.current = sparksRef.current.slice(sparksRef.current.length - MAX_SPARKS);
      }
      sparksRef.current = sparksRef.current.filter((s) => s.alpha > 0.03);

      // Group sparks by color for batched drawing
      const byColor = new Map<string, Spark[]>();
      for (const s of sparksRef.current) {
        s.tail.push({ x: s.x, y: s.y });
        if (s.tail.length > 5) s.tail.shift();
        s.x += s.vx;
        s.y += s.vy * 0.72;
        s.vy += 0.06;
        s.vx *= 0.985;
        s.alpha *= 0.982;
        if (!byColor.has(s.color)) byColor.set(s.color, []);
        byColor.get(s.color)!.push(s);
      }

      // Draw all tails batched per color
      for (const [color, sparks] of byColor) {
        ctx.fillStyle = color;
        for (const s of sparks) {
          const tlen = s.tail.length;
          for (let i = 0; i < tlen; i++) {
            const t = s.tail[i];
            const r = s.size * 0.3 * ((i + 1) / tlen);
            ctx.globalAlpha = s.alpha * ((i + 1) / tlen) * 0.35;
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Draw heads batched per color
        for (const s of sparks) {
          ctx.globalAlpha = s.alpha;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Confetti
      confettiRef.current = confettiRef.current.filter((c) => c.y < H + 20);
      for (const c of confettiRef.current) {
        c.x += c.vx;
        c.y += c.vy * 0.74;
        c.vx += (Math.random() - 0.5) * 0.08;
        c.rotation += c.rotSpeed;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.fillStyle = c.color;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    };

    // Immediate first bursts
    [0, 300, 600, 900, 1200, 1500].forEach((d) => setTimeout(launchRocket, d));
    animate();

    return () => { if (animRef.current != null) cancelAnimationFrame(animRef.current); };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999, width: "100vw", height: "100vh" }}
    />
  );
}

function adaptiveFontSize(str: string): string {
  const len = str.length;
  if (len <= 30)  return "clamp(1.8rem, 6vh, 3.75rem)";
  if (len <= 60)  return "clamp(1.5rem, 4.8vh, 3rem)";
  if (len <= 110) return "clamp(1.2rem, 3.6vh, 2.25rem)";
  if (len <= 180) return "clamp(1rem, 2.8vh, 1.75rem)";
  return                 "clamp(0.85rem, 2.2vh, 1.4rem)";
}

function adaptiveAnswerFontSize(str: string): string {
  const len = str.length;
  if (len <= 15)  return "clamp(2.5rem, 8vh, 5.5rem)";
  if (len <= 30)  return "clamp(2rem, 6.5vh, 4.25rem)";
  if (len <= 60)  return "clamp(1.6rem, 5vh, 3.25rem)";
  if (len <= 100) return "clamp(1.3rem, 4vh, 2.5rem)";
  return                 "clamp(1rem, 3vh, 2rem)";
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const fraction = seconds / TIMER_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  const color =
    seconds > 15 ? "hsl(var(--primary))" :
    seconds > 7  ? "hsl(35, 95%, 55%)" :
                   "hsl(0, 75%, 55%)";

  const glowColor =
    seconds > 15 ? "hsla(45,93%,47%,0.45)" :
    seconds > 7  ? "hsla(35,95%,55%,0.45)" :
                   "hsla(0,75%,55%,0.55)";

  return (
    <div className="flex flex-col items-center select-none" style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}>
      <svg width="75" height="75" viewBox="0 0 75 75">
        {/* Track */}
        <circle
          cx="37.5" cy="37.5" r={RADIUS}
          fill="none"
          stroke="hsla(280,30%,30%,0.4)"
          strokeWidth="5"
        />
        {/* Progress ring */}
        <circle
          cx="37.5" cy="37.5" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 37.5 37.5)"
          style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.4s ease" }}
        />
        {/* Number */}
        <text
          x="37.5" y="37.5"
          dominantBaseline="central"
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fontFamily="inherit"
          fill={color}
          style={{ transition: "fill 0.4s ease" }}
        >
          {seconds}
        </text>
      </svg>
    </div>
  );
}

// Archimedean spiral: 2 full clockwise rotations, 24 steps per rotation = 48 segments
// First circle is elliptical (wide x, shorter y), shrinks proportionally to center
const SPIRAL = (() => {
  const rotations = 2;
  const steps = 48;
  const rxMax = 960; // wide horizontal axis for ellipse
  const ryMax = 560; // shorter vertical axis
  const xs: number[] = [];
  const ys: number[] = [];
  const scales: number[] = [];
  const times: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * rotations * 2 * Math.PI;
    const rx = rxMax * (1 - t);
    const ry = ryMax * (1 - t);
    xs.push(Math.round(rx * Math.sin(theta)));
    ys.push(Math.round(-ry * Math.cos(theta)));
    scales.push(Math.round((0.05 + 0.95 * t) * 100) / 100);
    times.push(Math.round(t * 10000) / 10000);
  }
  return { xs, ys, scales, times };
})();

type SparkParticle = {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number; size: number;
  color: string; life: number; decay: number;
};

const MAGIC_COLORS = ["#FFD700","#FFFFFF","#FF88FF","#44FFFF","#FFAA44","#FF44AA","#BBFFAA","#FF6644"];
const SPLASH_DURATION = 3500;

function interpolateSpiral(t: number) {
  const times = SPIRAL.times;
  let i = times.length - 2;
  for (let j = 0; j < times.length - 1; j++) {
    if (t <= times[j + 1]) { i = j; break; }
  }
  const seg = times[i + 1] === times[i] ? 0 : (t - times[i]) / (times[i + 1] - times[i]);
  return {
    x: SPIRAL.xs[i] + (SPIRAL.xs[i + 1] - SPIRAL.xs[i]) * seg,
    y: SPIRAL.ys[i] + (SPIRAL.ys[i + 1] - SPIRAL.ys[i]) * seg,
  };
}

function SplashOverlay({
  url,
  canDismiss,
  onDismiss,
}: {
  url: string;
  canDismiss: boolean;
  onDismiss: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<SparkParticle[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    startRef.current = performance.now();
    particlesRef.current = [];

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = performance.now() - startRef.current;
      const t = Math.min(elapsed / SPLASH_DURATION, 1);
      const pos = interpolateSpiral(t);
      const cx = canvas.width / 2 + pos.x;
      const cy = canvas.height / 2 + pos.y;

      if (t < 0.98) {
        const sparkCount = Math.round(6 + t * 20);
        const currentScale = 0.05 + 0.95 * t;
        const maxRadius = Math.min(canvas.width * 0.39, canvas.height * 0.39);
        const raccoonRadius = maxRadius * currentScale;
        for (let k = 0; k < sparkCount; k++) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const speed = 0.8 + Math.random() * 3.5;
          const spawnX = cx + Math.cos(spawnAngle) * raccoonRadius;
          const spawnY = cy + Math.sin(spawnAngle) * raccoonRadius;
          particlesRef.current.push({
            x: spawnX,
            y: spawnY,
            vx: Math.cos(spawnAngle) * speed + (Math.random() - 0.5) * 1.5,
            vy: Math.sin(spawnAngle) * speed - 0.8 + (Math.random() - 0.5) * 1.5,
            alpha: 1,
            size: 2 + Math.random() * 5,
            color: MAGIC_COLORS[Math.floor(Math.random() * MAGIC_COLORS.length)],
            life: 0,
            decay: 0.016 + Math.random() * 0.024,
          });
        }
      }

      const alive: SparkParticle[] = [];
      for (const p of particlesRef.current) {
        p.life += p.decay;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.97;
        p.size *= 0.97;
        p.alpha = Math.max(0, 1 - p.life);
        if (p.life < 1 && p.size > 0.3) {
          alive.push(p);
          ctx.save();
          ctx.globalAlpha = p.alpha * 0.85;
          ctx.shadowBlur = 14;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = p.alpha * 0.55;
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      particlesRef.current = alive;
    };

    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <motion.div
      className={`fixed inset-0 z-[200] flex items-center justify-center select-none ${canDismiss ? "cursor-pointer" : "cursor-default pointer-events-none"}`}
      onClick={canDismiss ? onDismiss : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      <motion.img
        src={resolveUrl(url)}
        alt=""
        draggable={false}
        initial={{ x: SPIRAL.xs[0], y: SPIRAL.ys[0], scale: 0.05, rotate: 0 }}
        animate={{
          x: SPIRAL.xs,
          y: SPIRAL.ys,
          scale: SPIRAL.scales,
          rotate: 0,
          transition: {
            duration: 3.5,
            ease: "linear",
            times: SPIRAL.times,
          },
        }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.28, ease: "easeIn" } }}
        style={{ maxWidth: "78vw", maxHeight: "78vh", objectFit: "contain", pointerEvents: "none", position: "relative" }}
      />
    </motion.div>
  );
}

const DED_FLY_IN_DURATION_SEC = 12;
const DED_FLY_EXIT_DURATION_SEC = 1.05;
const DED_FLY_CAPTION = "Вас настигло Благословение ДЕДА!";

function DedFlySplashOverlay({
  url,
  audioUrl,
  canDismiss,
  dedFlyExitStarted,
  onDedFlyExitStart,
  canFinalizeSplashDismiss,
  onDismiss,
}: {
  url: string;
  audioUrl?: string;
  canDismiss: boolean;
  dedFlyExitStarted: boolean;
  onDedFlyExitStart?: () => void;
  canFinalizeSplashDismiss: boolean;
  onDismiss: () => void;
}) {
  const [arrived, setArrived] = useState(false);
  const [exiting, setExiting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgBoxRef = useRef<HTMLDivElement | null>(null);
  const arrivedRef = useRef(false);
  const exitingRef = useRef(false);

  useEffect(() => {
    arrivedRef.current = arrived;
  }, [arrived]);

  useEffect(() => {
    exitingRef.current = exiting;
  }, [exiting]);

  useEffect(() => {
    if (!audioUrl?.trim()) return;
    const a = new Audio(resolveUrl(audioUrl));
    a.volume = 0.75;
    audioRef.current = a;
    a.play().catch(() => {});
    return () => {
      audioRef.current = null;
      const teardown = () => {
        try {
          a.src = "";
        } catch {
          /* ignore */
        }
        a.removeEventListener("ended", teardown);
      };
      if (a.paused || a.ended) {
        teardown();
        return;
      }
      /** Splash снимается после клика, но трек доигрывает до конца один раз. */
      a.addEventListener("ended", teardown);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!dedFlyExitStarted) return;
    setExiting(true);
  }, [dedFlyExitStarted]);

  useEffect(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sparks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      decay: number;
      size: number;
    }[] = [];
    const MAX_SPARKS = 90;
    let rafId = 0;
    const startMs = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const el = imgBoxRef.current;
      const isFlying = !arrivedRef.current || exitingRef.current;
      if (el && isFlying) {
        const r = el.getBoundingClientRect();
        const flightProgress = Math.min((performance.now() - startMs) / (DED_FLY_IN_DURATION_SEC * 1000), 1);
        const isBraking = !exitingRef.current && flightProgress > 0.68;
        const sparkCount = exitingRef.current ? 3 : 4;
        for (let i = 0; i < sparkCount; i++) {
          sparks.push({
            x: r.left + Math.random() * Math.max(8, r.width * 0.08),
            y: r.top + r.height * (0.18 + Math.random() * 0.64),
            vx: -(1.8 + Math.random() * 4.2),
            vy: (Math.random() - 0.5) * 2.2,
            life: 0,
            decay: 0.014 + Math.random() * 0.018,
            size: 2.4 + Math.random() * 4.6,
          });
        }
        if (isBraking) {
          const brakeCount = 2 + Math.floor((flightProgress - 0.68) * 7);
          for (let i = 0; i < brakeCount; i++) {
            sparks.push({
              x: r.right - Math.random() * Math.max(8, r.width * 0.1),
              y: r.top + r.height * (0.16 + Math.random() * 0.68),
              vx: 1.8 + Math.random() * 4.5,
              vy: (Math.random() - 0.5) * 2.4,
              life: 0,
              decay: 0.016 + Math.random() * 0.022,
              size: 2.2 + Math.random() * 5,
            });
          }
        }
        if (sparks.length > MAX_SPARKS) {
          sparks.splice(0, sparks.length - MAX_SPARKS);
        }
      }

      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += p.decay;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.965;
        p.vy *= 0.985;
        p.size *= 0.985;

        const alpha = Math.max(0, 1 - p.life);
        if (alpha <= 0 || p.size < 0.35) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "rgba(255, 244, 170, 1)";
        ctx.shadowBlur = 12;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
        gradient.addColorStop(0, "rgba(255, 255, 245, 1)");
        gradient.addColorStop(0.32, "rgba(255, 240, 158, 1)");
        gradient.addColorStop(0.68, "rgba(255, 205, 70, 0.78)");
        gradient.addColorStop(1, "rgba(255, 180, 30, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.95;
        ctx.strokeStyle = "rgba(255, 240, 150, 1)";
        ctx.lineWidth = Math.max(1.2, p.size * 0.78);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleImgClick = () => {
    if (!canDismiss || !arrived || exiting) return;
    onDedFlyExitStart?.();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
    >
      <canvas
        ref={trailCanvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center justify-center gap-5">
        <motion.div
          ref={imgBoxRef}
          initial={{ x: "-68vw", opacity: 1 }}
          animate={exiting ? { x: "82vw", opacity: 1 } : { x: 0, opacity: 1 }}
          transition={
            exiting
              ? { duration: DED_FLY_EXIT_DURATION_SEC, ease: "easeIn" }
              : { duration: DED_FLY_IN_DURATION_SEC, ease: "easeInOut" }
          }
          onAnimationComplete={() => {
            if (exiting) {
              if (canFinalizeSplashDismiss) onDismiss();
              return;
            }
            if (!arrived) setArrived(true);
          }}
          onClick={handleImgClick}
          className={
            canDismiss && arrived && !exiting
              ? "cursor-pointer pointer-events-auto"
              : "pointer-events-none"
          }
        >
          <img
            src={resolveUrl(url)}
            alt=""
            draggable={false}
            className="block max-w-[min(42vw,320px)] max-h-[min(72vh,520px)] object-contain"
            style={{
              filter:
                "drop-shadow(0 0 18px rgba(255, 218, 90, 0.95)) drop-shadow(0 0 46px rgba(255, 170, 24, 0.58)) drop-shadow(0 12px 26px rgba(0, 0, 0, 0.62))",
            }}
          />
        </motion.div>
        {arrived && !exiting ? (
          <motion.p
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 16, stiffness: 220 }}
            className="pointer-events-none max-w-[min(92vw,520px)] text-center font-display text-xl sm:text-2xl md:text-3xl font-bold leading-tight px-4"
            style={{
              color: "#ffd54a",
              textShadow:
                "0 0 22px rgba(255,200,60,0.95), 0 0 42px rgba(200,140,20,0.55), 0 2px 0 rgba(120,70,0,0.35)",
            }}
          >
            {DED_FLY_CAPTION}
          </motion.p>
        ) : null}
      </div>
    </motion.div>
  );
}

export function QuestionModal({
  board,
  isOpen,
  themeName,
  points,
  question,
  players,
  quizStage,
  onQuizStageChange,
  readonly = false,
  onClose,
  onUpdate,
  onAwardPoints,
  onPassTurn,
  onPassTurnNext,
  currentTurnSeat = 0,
  viewerSeatIndex = null,
  onPassTurnToSeat,
  allowRaccoonSplashSeatPass = true,
  splashDismissed: splashDismissedProp = false,
  canDismissRaccoonSplash = false,
  onDismissSplash,
  splashDedFlyExitStarted: splashDedFlyExitStartedProp = false,
  onDedFlyExitStart,
  canFinalizeDedFlySplashDismiss = false,
  splashPassHoverSeat: splashPassHoverSeatProp = null,
  onSplashPassHoverSeatChange,
  onHostBroadcastAdeptsWheel,
  onHostBroadcastPandoraRoulette,
}: QuestionModalProps) {
  const stage = quizStage;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerUrl, setAnswerUrl] = useState("");
  const [awarded, setAwarded] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TIMER_SECONDS);
  const [showFireworks, setShowFireworks] = useState(false);
  const splashDismissed = splashDismissedProp === true;
  const splashDedFlyExitStarted = splashDedFlyExitStartedProp === true;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWheelCard = !!question.headerUrl;

  const activeTurnSeatNormalized =
    Number.isInteger(currentTurnSeat) ? ((Number(currentTurnSeat) % 5) + 5) % 5 : -1;

  const handleAdeptsWheelNavigate = () => {
    if (onHostBroadcastAdeptsWheel) {
      onHostBroadcastAdeptsWheel({
        returnHref: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        currentTurnSeat: activeTurnSeatNormalized >= 0 ? activeTurnSeatNormalized : 0,
      });
      return;
    }
    if (readonly) return;
    const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${window.location.origin}${bp}/adepts/watch`, "_blank", "noopener,noreferrer");
  };

  const adeptsWheelButtonDisabled = readonly && !onHostBroadcastAdeptsWheel;
  /** Только ведущий получает `onHostBroadcastPandoraRoulette` из `Home` — не смешивать с `readonly` (иначе кнопка гаснет у ведущего). */
  const pandoraRouletteButtonDisabled = !onHostBroadcastPandoraRoulette;

  const handlePandoraRouletteNavigate = () => {
    if (onHostBroadcastPandoraRoulette) {
      onHostBroadcastPandoraRoulette();
      return;
    }
    if (readonly) return;
    const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${window.location.origin}${bp}/spectate`, "_blank", "noopener,noreferrer");
  };

  /** Панель «кому передать ход» видна всем зрителям и ведущему в фазе после енота. */
  const showRaccoonSplashPassChoicePanel =
    allowRaccoonSplashSeatPass &&
    Boolean(question.splashUrl) &&
    question.splashVariant !== "dedFly" &&
    splashDismissed &&
    stage === "question" &&
    !isEditing &&
    typeof onPassTurnToSeat === "function" &&
    activeTurnSeatNormalized >= 0 &&
    activeTurnSeatNormalized <= 4;

  /** Нажать может ведущий (!readonly) или игрок с текущим ходом (readonly + своё место = ход). */
  const canChooseRaccoonPassTarget =
    typeof onPassTurnToSeat === "function" &&
    (
      !readonly ||
      (
        typeof viewerSeatIndex === "number" &&
        viewerSeatIndex >= 0 &&
        viewerSeatIndex <= 4 &&
        viewerSeatIndex === activeTurnSeatNormalized
      )
    );

  const splashPassHoverSeatNorm =
    typeof splashPassHoverSeatProp === "number" &&
    Number.isInteger(splashPassHoverSeatProp) &&
    splashPassHoverSeatProp >= 0 &&
    splashPassHoverSeatProp <= 4 &&
    splashPassHoverSeatProp !== activeTurnSeatNormalized
      ? splashPassHoverSeatProp
      : null;

  let isCelebration = false;
  let isPandora = false;
  if (board === 1) {
    isCelebration = (themeName === "Халява" && points === 400) || (themeName === "Пасхалки" && points === 300);
    isPandora = themeName === "Халява" && points === 500;
  } else if (board === 2) {
    isPandora = themeName === "Треш" && points === 500;
    isCelebration = (themeName === "Цитаты и Фразы" && points === 500) || (themeName === "Тактики" && points === 200);
  } else {
    isPandora = themeName === "Пасхалки" && points === 200;
    isCelebration = (themeName === "Зацени Look" && points === 500) || (themeName === "Боссы" && points === 200);
  }

  const hideQuestionTimer = themeName === "Дед прими таблетки";

  const isWowEventsLargeQuestionMedia =
    board === 3 && themeName === "События в WoW" && [100, 200, 400, 500].includes(points);
  const questionImageMaxStyle = isWowEventsLargeQuestionMedia
    ? { maxHeight: "clamp(138px, 37.26vh, 497px)", maxWidth: "100%" as const }
    : { maxHeight: "clamp(120px, 32.4vh, 432px)", maxWidth: "100%" as const };
  const questionVideoMaxStyle = isWowEventsLargeQuestionMedia
    ? { maxHeight: "clamp(138px, 34.5vh, 460px)" }
    : { maxHeight: "clamp(120px, 30vh, 400px)" };

  const isWowEventsLargeAnswerMedia =
    board === 3 && themeName === "События в WoW" && [300, 400].includes(points);
  const answerVideoMaxStyle = isWowEventsLargeAnswerMedia
    ? { maxHeight: "clamp(138px, 34.5vh, 460px)" }
    : { maxHeight: "clamp(120px, 30vh, 400px)" };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setCountdown(TIMER_SECONDS);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (isOpen) {
      setText(question.text || "");
      setAnswerText(question.answerText || "");
      setAnswerUrl(question.answerUrl || "");
      setAwarded(null);
      setIsEditing(false);
      setShowFireworks(false);
    } else {
      stopTimer();
      setCountdown(TIMER_SECONDS);
      setShowFireworks(false);
    }
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Re-sync displayed text whenever the question content changes while the modal is open
  // and the host is not actively editing (to avoid overwriting in-flight edits).
  useEffect(() => {
    if (!isOpen || isEditing) return;
    setText(question.text || "");
    setAnswerText(question.answerText || "");
    setAnswerUrl(question.answerUrl || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.text, question.answerText, question.answerUrl]);

  useEffect(() => {
    if (!isOpen) return;
    if (hideQuestionTimer) {
      stopTimer();
      return stopTimer;
    }
    if (quizStage === "question") {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quizStage, hideQuestionTimer]);

  const saveAndClose = (extra: Partial<Question> = {}) => {
    stopTimer();
    onUpdate({ text, answerText, answerUrl, ...extra });
    onClose();
  };

  const handleAward = (playerIndex: number) => {
    stopTimer();
    onAwardPoints(playerIndex, points);
    onUpdate({ text, answerText, answerUrl, used: true });
    setAwarded(playerIndex);
    onClose();
  };

  const handleSkip = () => {
    saveAndClose({ used: true });
  };

  const handleClose = () => {
    saveAndClose();
  };

  const handlePassTurnWrong = () => {
    onPassTurn?.();
    handleSkip();
  };

  const handlePassTurnNext = () => {
    onPassTurnNext?.();
    handleSkip();
  };

  const handleShowAnswer = () => {
    stopTimer();
    onQuizStageChange("answer");
    setIsEditing(false);
    if (isCelebration) {
      setShowFireworks(true);
      if (!peekAdeptsWheelReturnCloseCardFlag()) {
        const audio = new Audio(resolveUrl("/freebie-400-answer.mp3"));
        audio.volume = FREEBIE_ANSWER_SOUND_VOLUME;
        audio.play().catch(() => {});
      }
    }
  };

  const spectatorCelebrationKeyRef = useRef("");

  // Зритель: этап «ответ» приходит по sync — включаем те же эффекты празднования, что и у ведущего
  useEffect(() => {
    if (!isOpen) {
      spectatorCelebrationKeyRef.current = "";
      return;
    }
    if (!readonly || quizStage !== "answer" || !isCelebration) return;
    const key = `${board}-${themeName}-${points}`;
    if (spectatorCelebrationKeyRef.current === key) return;
    spectatorCelebrationKeyRef.current = key;
    setShowFireworks(true);
    if (!peekAdeptsWheelReturnCloseCardFlag()) {
      const audio = new Audio(resolveUrl("/freebie-400-answer.mp3"));
      audio.volume = FREEBIE_ANSWER_SOUND_VOLUME;
      audio.play().catch(() => {});
    }
  }, [readonly, isOpen, quizStage, isCelebration, board, themeName, points]);

  const questionFontSizeStyle = adaptiveFontSize(text);
  const answerFontSizeStyle = adaptiveAnswerFontSize(answerText);
  const answerWords = answerText.split(/\s+/).filter(Boolean);

  return (
    <>
      <Fireworks active={showFireworks} />
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50"
            onClick={readonly ? undefined : handleClose}
          />
          <AnimatePresence>
            {question.splashUrl && !splashDismissed && (
              question.splashVariant === "dedFly" ? (
                <DedFlySplashOverlay
                  url={question.splashUrl}
                  audioUrl={question.splashAudioUrl}
                  canDismiss={canDismissRaccoonSplash && typeof onDedFlyExitStart === "function"}
                  dedFlyExitStarted={splashDedFlyExitStarted}
                  onDedFlyExitStart={onDedFlyExitStart}
                  canFinalizeSplashDismiss={canFinalizeDedFlySplashDismiss === true}
                  onDismiss={() => onDismissSplash?.()}
                />
              ) : (
                <SplashOverlay
                  url={question.splashUrl}
                  canDismiss={canDismissRaccoonSplash && typeof onDismissSplash === "function"}
                  onDismiss={() => onDismissSplash?.()}
                />
              )
            )}
          </AnimatePresence>
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-3 lg:p-6">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={isPandora
                ? { scale: 1, opacity: 1, y: 0, x: [0, -12, 12, -9, 9, -5, 5, -2, 2, 0] }
                : { scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={isPandora
                ? { duration: 0.55, times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.7, 0.82, 0.92, 1] }
                : { type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-5xl bg-card border-2 border-accent/40 rounded-2xl shadow-[0_0_80px_hsla(280,65%,50%,0.2)] pointer-events-auto overflow-hidden flex flex-col"
              style={{ maxHeight: "94vh" }}
            >
              {isPandora && stage === "question" && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none z-20"
                  animate={{
                    boxShadow: [
                      "inset 0 0 0px 0px rgba(147,51,234,0), 0 0 0px 0px rgba(147,51,234,0)",
                      "inset 0 0 55px 12px rgba(147,51,234,0.55), 0 0 60px 12px rgba(147,51,234,0.35)",
                      "inset 0 0 0px 0px rgba(147,51,234,0), 0 0 0px 0px rgba(147,51,234,0)",
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 lg:px-8 py-3 lg:py-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-[0.2em] mb-0.5 ${isPandora ? "text-purple-400" : "text-accent"}`}
                        style={isPandora ? { textShadow: "0 0 10px hsla(280,70%,60%,0.7)" } : undefined}
                      >
                        {themeName}
                      </div>
                      <div className="font-display text-3xl lg:text-5xl text-primary glow-text leading-none">
                        {points}
                      </div>
                    </div>
                    {question.headerUrl && (
                      <>
                        <span className="font-display text-3xl lg:text-5xl text-primary glow-text leading-none">+</span>
                        <div className="flex flex-col items-center gap-0.5">
                          <img
                            src={resolveUrl(question.headerUrl)}
                            alt=""
                            className="object-contain select-none pointer-events-none"
                            style={{ width: "53px", height: "53px", filter: "drop-shadow(0 0 6px hsla(45,100%,60%,0.5))" }}
                          />
                          <span className="text-[11.5px] font-bold uppercase tracking-wider text-primary" style={{ textShadow: "0 0 8px hsla(45,93%,47%,0.7)" }}>
                            1 крутка
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {(question.headerCornerUrl || question.splashUrl) && (
                    <img
                      src={resolveUrl(question.headerCornerUrl || question.splashUrl || "")}
                      alt=""
                      className="object-contain select-none pointer-events-none"
                      style={{ width: "46px", height: "46px", filter: "drop-shadow(0 0 5px hsla(45,100%,60%,0.55))" }}
                    />
                  )}
                  <div className="flex items-center gap-2 ml-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${stage === "question" ? "bg-primary/20 text-primary border-primary/50" : "bg-muted/30 text-muted-foreground border-border"}`}>
                      Вопрос
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${stage === "answer" ? "bg-primary/20 text-primary border-primary/50" : "bg-muted/30 text-muted-foreground border-border"}`}>
                      Ответ
                    </div>
                  </div>
                </div>
                {!readonly && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing((v) => !v)}
                      title={isEditing ? "Режим просмотра" : "Редактировать"}
                      className={`rounded-full transition-colors ${isEditing ? "bg-accent/20 text-accent hover:bg-accent/30" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {stage === "question" ? (
                    <motion.div
                      key="question"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.22 }}
                    >
                      {isEditing ? (
                        <div className="p-6 lg:p-8">
                          <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Текст вопроса..."
                            className="min-h-[120px] lg:min-h-[160px] text-lg lg:text-xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                          />
                        </div>
                      ) : (
                        <>
                          {question.questionUrl && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1, duration: 0.35 }}
                              className="px-6 lg:px-8 pt-4 lg:pt-6 flex justify-center"
                            >
                              {isVideo(question.questionUrl) ? (
                                <video
                                  src={resolveUrl(question.questionUrl)}
                                  controls
                                  autoPlay
                                  playsInline
                                  preload="auto"
                                  className="w-full rounded-xl shadow-lg"
                                  style={board === 3 ? questionVideoMaxStyle : { maxHeight: "clamp(120px, 30vh, 400px)" }}
                                  onLoadedData={(e) => {
                                    (e.currentTarget as HTMLVideoElement).play().catch(() => {});
                                  }}
                                />
                              ) : (
                                <img
                                  src={resolveUrl(question.questionUrl)}
                                  alt="Question media"
                                  className="w-auto rounded-xl object-contain shadow-lg"
                                  style={board === 3 ? questionImageMaxStyle : { maxHeight: "clamp(120px, 32.4vh, 432px)", maxWidth: "100%" }}
                                  onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = "none";
                                    const link = document.createElement("a");
                                    link.href = question.questionUrl;
                                    link.target = "_blank";
                                    link.textContent = "Открыть медиа";
                                    el.parentNode?.appendChild(link);
                                  }}
                                />
                              )}
                            </motion.div>
                          )}
                          {text && (
                            <div className="flex flex-col items-center justify-center px-8 lg:px-12 py-4 lg:py-8">
                              <motion.p
                                key={text}
                                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="font-display text-center leading-snug tracking-wide text-foreground whitespace-pre-wrap"
                                style={{ fontSize: questionFontSizeStyle, textShadow: "0 0 60px hsla(280,65%,70%,0.12)" }}
                              >
                                {text}
                              </motion.p>
                            </div>
                          )}
                          {showRaccoonSplashPassChoicePanel && (
                            <div className="mx-auto w-full max-w-3xl border-t border-border/50 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                Передайте ход другому игроку
                              </p>
                              <div
                                className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:gap-2 md:grid-cols-4"
                                onPointerLeave={() => {
                                  if (
                                    canChooseRaccoonPassTarget &&
                                    typeof onSplashPassHoverSeatChange === "function"
                                  ) {
                                    onSplashPassHoverSeatChange(null);
                                  }
                                }}
                              >
                                {players.map((p, i) => {
                                  if (i === activeTurnSeatNormalized) return null;
                                  const label = p.name?.trim() ? p.name : `Игрок ${i + 1}`;
                                  const syncHovered = splashPassHoverSeatNorm === i;
                                  return (
                                    <motion.button
                                      key={p.id}
                                      type="button"
                                      initial={{ opacity: 0, y: 24 }}
                                      animate={{
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                          delay: i * 0.04,
                                          type: "spring",
                                          damping: 22,
                                          stiffness: 200,
                                        },
                                      }}
                                      onPointerEnter={() => {
                                        if (
                                          canChooseRaccoonPassTarget &&
                                          typeof onSplashPassHoverSeatChange === "function"
                                        ) {
                                          onSplashPassHoverSeatChange(i);
                                        }
                                      }}
                                      onClick={() => {
                                        if (canChooseRaccoonPassTarget) onPassTurnToSeat(i);
                                      }}
                                      className={`group relative flex min-h-[7.25rem] w-full flex-col overflow-hidden rounded-xl border border-accent/30 bg-secondary/40 px-2 py-3 font-display font-bold text-primary transition-[box-shadow,background-color,border-color] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                                        syncHovered
                                          ? "border-accent bg-secondary shadow-[0_0_22px_hsla(280,65%,50%,0.45)]"
                                          : ""
                                      } ${canChooseRaccoonPassTarget ? "cursor-pointer" : "pointer-events-none cursor-default"}`}
                                    >
                                      <div
                                        className={`relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1.5 transition-transform duration-100 ease-out will-change-transform ${
                                          syncHovered ? "-translate-y-[3px] scale-[1.06]" : "translate-y-0 scale-100"
                                        }`}
                                      >
                                        <div
                                          aria-hidden
                                          className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300 ${
                                            syncHovered ? "opacity-100" : "opacity-0"
                                          }`}
                                          style={{
                                            background:
                                              "linear-gradient(105deg, hsla(280,65%,55%,0) 0%, hsla(280,65%,55%,0.1) 50%, hsla(280,65%,55%,0) 100%)",
                                          }}
                                        />
                                        <img
                                          src={resolveUrl(ADEPTS_EMBLEM_URL)}
                                          alt=""
                                          className="relative z-[1] h-[clamp(2.35rem,7vw,3.2rem)] w-auto max-w-[78%] object-contain select-none pointer-events-none"
                                          style={{
                                            filter:
                                              "drop-shadow(0 0 5px hsla(45,100%,60%,0.44)) drop-shadow(0 0 11px hsla(45,100%,55%,0.20))",
                                          }}
                                        />
                                        <span
                                          className="relative z-[1] glow-text max-w-full truncate px-1 text-center uppercase tracking-widest"
                                          style={{
                                            fontSize: "clamp(0.65rem, 2vw, 0.8rem)",
                                            textShadow: "0 0 20px hsla(280,65%,70%,0.25)",
                                          }}
                                          title={label}
                                        >
                                          {label}
                                        </span>
                                        <span
                                          className="relative z-[1] glow-text font-display font-bold leading-none tabular-nums"
                                          style={{ fontSize: "clamp(1rem, 2.5vw, 1.75rem)" }}
                                        >
                                          {p.score}
                                        </span>
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="answer"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.22 }}
                    >
                      {isEditing ? (
                        <div className="p-6 lg:p-8 space-y-4">
                          <Textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Текст ответа..."
                            className="min-h-[80px] lg:min-h-[100px] text-lg lg:text-xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={answerUrl}
                              onChange={(e) => setAnswerUrl(e.target.value)}
                              placeholder="URL медиа к ответу (https://... или /file.mp4)"
                              className="bg-background border-accent/20 focus-visible:ring-accent"
                            />
                            {answerUrl && (
                              <Button variant="secondary" onClick={() => window.open(resolveUrl(answerUrl), "_blank")}>
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {answerUrl && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1, duration: 0.35 }}
                              className={`flex justify-center ${isCelebration ? "px-4 lg:px-6 pt-6 lg:pt-10" : "px-6 lg:px-8 pt-4 lg:pt-6"}`}
                            >
                              {isVideo(answerUrl) ? (
                                <video
                                  src={resolveUrl(answerUrl)}
                                  controls
                                  autoPlay
                                  preload="auto"
                                  className="w-full rounded-xl shadow-lg"
                                  style={board === 3 ? answerVideoMaxStyle : { maxHeight: "clamp(120px, 30vh, 400px)" }}
                                />
                              ) : (
                                <img
                                  src={resolveUrl(answerUrl)}
                                  alt="Answer media"
                                  className={`w-auto rounded-xl object-contain${isCelebration ? "" : " shadow-lg"}`}
                                  style={{
                                    maxHeight: isCelebration
                                      ? "clamp(192px, 45.6vh, 552px)"
                                      : board === 3 && isWowEventsLargeAnswerMedia
                                        ? "clamp(138px, 33.12vh, 442px)"
                                        : "clamp(120px, 28.8vh, 384px)",
                                    maxWidth: "100%",
                                    ...(isCelebration ? {
                                      filter: "drop-shadow(0 0 18px hsla(45,100%,55%,0.95)) drop-shadow(0 0 40px hsla(45,100%,50%,0.6)) drop-shadow(0 0 70px hsla(45,100%,45%,0.35))",
                                      animation: "celebrationGlow 1.4s ease-in-out infinite alternate",
                                    } : {}),
                                  }}
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                            </motion.div>
                          )}
                          <div className={`flex flex-col items-center justify-center ${isCelebration ? "px-8 lg:px-16 py-6 lg:py-10" : "px-8 lg:px-12 py-3 lg:py-6"}`}>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
                              {answerWords.map((word, i) => (
                                <motion.span
                                  key={i}
                                  initial={{ opacity: 0, y: 32, scale: 0.8 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{
                                    delay: i * (isCelebration ? 0.14 : 0.07),
                                    ...(isCelebration
                                      ? { duration: 0.55, ease: "easeOut" }
                                      : { type: "spring", damping: 16, stiffness: 300 }),
                                  }}
                                  className="font-display text-primary glow-text leading-tight"
                                  style={{ fontSize: isCelebration ? "clamp(2rem, 5.5vh, 4rem)" : answerFontSizeStyle }}
                                >
                                  {word}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Award points — hidden for celebration and for зрителя */}
                      {!isCelebration && !readonly && <div className="px-5 lg:px-8 pb-3 lg:pb-6 pt-2 lg:pt-3 space-y-2 border-t border-border/40 mt-1">
                        <div className="mb-2 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                              Начислить очки игроку
                            </span>
                          </div>
                          {activeTurnSeatNormalized >= 0 && (
                            <p className="pl-6 text-[11px] font-semibold uppercase tracking-wide text-primary/85">
                              Сейчас ход:{" "}
                              <span className="text-foreground">
                                {players[activeTurnSeatNormalized]?.name?.trim()
                                  ? players[activeTurnSeatNormalized].name
                                  : `Игрок ${activeTurnSeatNormalized + 1}`}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 lg:gap-3">
                          {players.map((player, idx) => {
                            const isAwarded = awarded === idx;
                            const isCurrentTurnSeat =
                              activeTurnSeatNormalized >= 0 && idx === activeTurnSeatNormalized;
                            return (
                              <motion.button
                                key={player.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAward(idx)}
                                disabled={awarded !== null}
                                title={isCurrentTurnSeat ? "Сейчас ход этого игрока — удобно начислить очки" : undefined}
                                aria-current={isCurrentTurnSeat && !isAwarded ? "true" : undefined}
                                className={`
                                  flex flex-col items-center justify-center gap-1 lg:gap-2 p-2 lg:p-4 rounded-xl border-2
                                  font-display transition-all duration-200
                                  ${isAwarded
                                    ? "border-primary bg-primary/20 shadow-[0_0_20px_hsla(45,93%,47%,0.5)]"
                                    : isCurrentTurnSeat && awarded === null
                                      ? "border-primary/85 bg-primary/14 ring-2 ring-primary/50 shadow-[0_0_26px_hsla(280,65%,52%,0.42)] hover:border-primary hover:bg-primary/20 hover:shadow-[0_0_32px_hsla(280,65%,55%,0.48)]"
                                      : "border-accent/30 bg-secondary/30 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_hsla(45,93%,47%,0.2)]"
                                  }
                                  ${awarded !== null && !isAwarded ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                                `}
                              >
                                {isAwarded ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                  >
                                    <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                                  </motion.div>
                                ) : (
                                  <span className="text-xl lg:text-2xl font-bold text-primary glow-text">+{points}</span>
                                )}
                                <span className="text-xs text-muted-foreground uppercase tracking-wider truncate w-full text-center">
                                  {player.name}
                                </span>
                                <span className="text-xs text-accent/70 font-mono">
                                  {player.score}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 lg:px-8 py-3 lg:py-4 border-t border-border/60 bg-muted/20 grid grid-cols-3 items-center gap-4">
                {/* Left */}
                <div className="flex justify-start">
                  {isPandora ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="lg"
                        disabled={pandoraRouletteButtonDisabled}
                        title={
                          pandoraRouletteButtonDisabled
                            ? "Рулетку откроет ведущий"
                            : undefined
                        }
                        onClick={handlePandoraRouletteNavigate}
                        className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 border border-purple-500/70 bg-purple-950/60 text-purple-200 hover:bg-purple-900/70 hover:text-purple-100 shadow-[0_0_18px_hsla(280,70%,45%,0.45)]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ящик Пандоры
                      </Button>
                      {!readonly && question.used && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onUpdate({ text, answerText, answerUrl, used: false });
                            onClose();
                          }}
                          className="font-bold tracking-wide text-muted-foreground hover:text-foreground"
                        >
                          Сделать карточку активной
                        </Button>
                      )}
                    </div>
                  ) : board === 1 ? (
                    isWheelCard && stage === "answer" ? (
                      <Button
                        size="lg"
                        disabled={adeptsWheelButtonDisabled}
                        title={adeptsWheelButtonDisabled ? "Колесо откроет ведущий" : undefined}
                        onClick={handleAdeptsWheelNavigate}
                        className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_18px_hsla(45,100%,55%,0.6)]"
                      >
                        🎡 Колесо Адептов
                      </Button>
                    ) : isCelebration && stage === "answer" ? (
                      <Button
                        size="lg"
                        disabled={adeptsWheelButtonDisabled}
                        title={adeptsWheelButtonDisabled ? "Колесо откроет ведущий" : undefined}
                        onClick={handleAdeptsWheelNavigate}
                        className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_18px_hsla(45,100%,55%,0.6)]"
                      >
                        🎡 Колесо Адептов
                      </Button>
                    ) : !readonly && question.used ? (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          onUpdate({ text, answerText, answerUrl, used: false });
                          onClose();
                        }}
                        className="font-bold tracking-wide text-muted-foreground hover:text-foreground"
                      >
                        Сделать карточку активной
                      </Button>
                    ) : null
                  ) : isCelebration && stage === "answer" ? (
                    <Button
                      size="lg"
                      disabled={adeptsWheelButtonDisabled}
                      title={adeptsWheelButtonDisabled ? "Колесо откроет ведущий" : undefined}
                      onClick={handleAdeptsWheelNavigate}
                      className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_18px_hsla(45,100%,55%,0.6)]"
                    >
                      🎡 Колесо Адептов
                    </Button>
                  ) : question.headerUrl && stage === "answer" ? (
                    <Button
                      size="lg"
                      disabled={adeptsWheelButtonDisabled}
                      title={adeptsWheelButtonDisabled ? "Колесо откроет ведущий" : undefined}
                      onClick={handleAdeptsWheelNavigate}
                      className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_18px_hsla(45,100%,55%,0.6)]"
                    >
                      🎡 Колесо Адептов
                    </Button>
                  ) : !readonly && question.used ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        onUpdate({ text, answerText, answerUrl, used: false });
                        onClose();
                      }}
                      className="font-bold tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Сделать карточку активной
                    </Button>
                  ) : null}
                </div>

                {/* Center — timer (only on question stage, hidden for splash cards) */}
                <div className="flex justify-center">
                  {stage === "question" && !hideQuestionTimer && !question.splashUrl && !isPandora && (board === 1 || board === 2 || !isCelebration) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25, type: "spring", damping: 18, stiffness: 260 }}
                    >
                      {countdown === 0 ? (
                        <motion.span
                          key="expired"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", damping: 14, stiffness: 240 }}
                          className="text-sm font-bold uppercase tracking-widest whitespace-nowrap"
                          style={{ color: "hsl(0, 75%, 55%)", textShadow: "0 0 12px hsla(0,75%,55%,0.6)" }}
                        >
                          Время истекло!
                        </motion.span>
                      ) : (
                        <CountdownTimer seconds={countdown} />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Right */}
                <div className="flex justify-end gap-2">
                  {!readonly && (stage === "question" ? (
                    <Button
                      size="lg"
                      onClick={handleShowAnswer}
                      className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8"
                    >
                      <Eye className="w-5 h-5" />
                      Показать ответ
                    </Button>
                  ) : (
                    <>
                      {stage === "answer" && (
                        <>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={handlePassTurnWrong}
                            className="font-bold tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Неверный ответ
                          </Button>
                          {typeof onPassTurnNext === "function" && (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={handlePassTurnNext}
                              title="Передать ход следующему игроку без снятия очков"
                              className="min-w-[3.25rem] px-4 font-mono text-lg font-bold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {"=>"}
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={handleSkip}
                        className="font-bold tracking-wide text-base"
                      >
                        {isPandora || isCelebration ? "Закрыть" : "Никто не ответил — закрыть"}
                      </Button>
                    </>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
