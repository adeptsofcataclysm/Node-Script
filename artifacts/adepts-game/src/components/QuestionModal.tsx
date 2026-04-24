import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Trophy, ChevronRight, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Question, Player } from "../hooks/useGameState";

interface QuestionModalProps {
  isOpen: boolean;
  themeName: string;
  points: number;
  question: Question;
  players: Player[];
  onClose: () => void;
  onUpdate: (data: Partial<Question>) => void;
  onAwardPoints: (playerIndex: number, points: number) => void;
}

type Stage = "question" | "answer";

const TIMER_SECONDS = 30;
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
  const animRef = useRef<number>();
  const rocketsRef = useRef<Rocket[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const confettiRef = useRef<Confetti[]>([]);

  useEffect(() => {
    if (!active) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
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
        vy: -(10 + Math.random() * 7),
        color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
        trail: [],
        exploded: false,
      });
    };

    const explode = (x: number, y: number, color: string) => {
      const count = 55 + Math.floor(Math.random() * 25);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15;
        const speed = 0.8 + Math.random() * 3.2;
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
      for (let i = 0; i < 4; i++) {
        confettiRef.current.push({
          x: Math.random() * W,
          y: -12,
          vx: (Math.random() - 0.5) * 2.5,
          vy: 1.5 + Math.random() * 3,
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
      if (frame % 25 === 0) launchRocket();
      if (elapsed < 12000) spawnConfetti();

      // Rockets
      rocketsRef.current = rocketsRef.current.filter((r) => !r.exploded);
      for (const r of rocketsRef.current) {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();
        r.y += r.vy;
        r.vy += 0.22;

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
        s.y += s.vy;
        s.vy += 0.1;
        s.vx *= 0.98;
        s.alpha *= 0.975;
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
        c.y += c.vy;
        c.vx += (Math.random() - 0.5) * 0.15;
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

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
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

export function QuestionModal({
  isOpen,
  themeName,
  points,
  question,
  players,
  onClose,
  onUpdate,
  onAwardPoints,
}: QuestionModalProps) {
  const [stage, setStage] = useState<Stage>("question");
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerUrl, setAnswerUrl] = useState("");
  const [awarded, setAwarded] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TIMER_SECONDS);
  const [showFireworks, setShowFireworks] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCelebration = themeName === "Халява" && points === 400;

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
      setStage("question");
      setIsEditing(false);
      setShowFireworks(false);
      startTimer();
    } else {
      stopTimer();
      setCountdown(TIMER_SECONDS);
      setShowFireworks(false);
    }
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const handleShowAnswer = () => {
    stopTimer();
    setStage("answer");
    setIsEditing(false);
    if (isCelebration) {
      setShowFireworks(true);
      const audio = new Audio(import.meta.env.BASE_URL + "freebie-400-answer.mp3");
      audio.volume = 0.85;
      audio.play().catch(() => {});
    }
  };

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
            onClick={handleClose}
          />
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-3 lg:p-6">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-5xl bg-card border-2 border-accent/40 rounded-2xl shadow-[0_0_80px_hsla(280,65%,50%,0.2)] pointer-events-auto overflow-hidden flex flex-col"
              style={{ maxHeight: "94vh" }}
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 lg:px-8 py-3 lg:py-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-[0.2em] mb-0.5">
                      {themeName}
                    </div>
                    <div className="font-display text-3xl lg:text-5xl text-primary glow-text leading-none">
                      {points}
                    </div>
                  </div>
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
                                  preload="auto"
                                  className="w-full rounded-xl shadow-lg"
                                  style={{ maxHeight: "clamp(120px, 30vh, 400px)" }}
                                />
                              ) : (
                                <img
                                  src={resolveUrl(question.questionUrl)}
                                  alt="Question media"
                                  className="w-auto rounded-xl object-contain shadow-lg"
                                  style={{ maxHeight: "clamp(100px, 27vh, 360px)", maxWidth: "100%" }}
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
                                  style={{ maxHeight: "clamp(120px, 30vh, 400px)" }}
                                />
                              ) : (
                                <img
                                  src={resolveUrl(answerUrl)}
                                  alt="Answer media"
                                  className={`w-auto rounded-xl object-contain${isCelebration ? "" : " shadow-lg"}`}
                                  style={{
                                    maxHeight: isCelebration ? "clamp(160px, 38vh, 460px)" : "clamp(100px, 24vh, 320px)",
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
                                    delay: i * 0.07,
                                    type: "spring",
                                    damping: 16,
                                    stiffness: 300,
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

                      {/* Award points — hidden for celebration */}
                      {!isCelebration && <div className="px-5 lg:px-8 pb-3 lg:pb-6 pt-2 lg:pt-3 space-y-2 border-t border-border/40 mt-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Начислить очки игроку
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2 lg:gap-3">
                          {players.map((player, idx) => {
                            const isAwarded = awarded === idx;
                            return (
                              <motion.button
                                key={player.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAward(idx)}
                                disabled={awarded !== null}
                                className={`
                                  flex flex-col items-center justify-center gap-1 lg:gap-2 p-2 lg:p-4 rounded-xl border-2
                                  font-display transition-all duration-200
                                  ${isAwarded
                                    ? "border-primary bg-primary/20 shadow-[0_0_20px_hsla(45,93%,47%,0.5)]"
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
                  {isCelebration && stage === "answer" ? (
                    <Button
                      size="lg"
                      onClick={() => window.open(window.location.origin + "/adepts", "_blank")}
                      className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_18px_hsla(45,100%,55%,0.6)]"
                    >
                      🎡 Колесо Адептов
                    </Button>
                  ) : question.used ? (
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

                {/* Center — timer (only on question stage) */}
                <div className="flex justify-center">
                  {stage === "question" && (
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
                  {stage === "question" ? (
                    <Button
                      size="lg"
                      onClick={handleShowAnswer}
                      className="font-bold tracking-wide gap-2 text-base px-6 lg:px-8"
                    >
                      <Eye className="w-5 h-5" />
                      Показать ответ
                    </Button>
                  ) : isCelebration ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleSkip}
                      className="font-bold tracking-wide text-base"
                    >
                      Закрыть
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleSkip}
                      className="font-bold tracking-wide text-base"
                    >
                      Никто не ответил — закрыть
                    </Button>
                  )}
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
