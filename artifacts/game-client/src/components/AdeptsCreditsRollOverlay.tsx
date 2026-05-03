import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ADEPTS_CREDITS_TITLE,
  ADEPTS_CREDITS_SCROLL_TAGLINE,
  ADEPTS_CREDITS_SCROLL_BODY_MAIN,
} from "@/lib/adeptsCreditsContent";
import { Button } from "@/components/ui/button";

const CREDITS_AUDIO_SRC = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/credits-kung-fu-fighting.mp3`;

/** Тишина на экране титров до появления заголовка (0–5 с). */
const INTRO_PAUSE_BEFORE_HERO_SEC = 5;
/** Заставка заголовка: появление → пауза → уход вверх (5–14 с). */
const HERO_PHASE_SEC = 9;
/** Прокрутка основного текста с 14 с (= пауза + заставка). */
const SCROLL_START_DELAY_SEC = INTRO_PAUSE_BEFORE_HERO_SEC + HERO_PHASE_SEC;

type AdeptsCreditsRollOverlayProps = {
  open: boolean;
  /** Epoch ms from relay — для согласованного старта анимации у всех клиентов. */
  startedAt: number | undefined;
  isHost: boolean;
  onHostClose: () => void;
};

export function AdeptsCreditsRollOverlay({
  open,
  startedAt,
  isHost,
  onHostClose,
}: AdeptsCreditsRollOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [durationSec, setDurationSec] = useState(220);

  useLayoutEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const pxPerSec = 42;
    setDurationSec(Math.max(120, Math.min(900, (h + vh) / pxPerSec)));
  }, [open]);

  useEffect(() => {
    if (!open) {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      return;
    }
    const audio = new Audio(CREDITS_AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.65;
    audioRef.current = audio;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [open, startedAt]);

  if (!open) return null;

  const animKey = String(startedAt ?? "credits");

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[11000] flex flex-col bg-black/92 text-center text-foreground"
      role="dialog"
      aria-label="Титры"
    >
      {isHost ? (
        <div className="absolute right-3 top-3 z-20">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-display text-xs uppercase tracking-wider"
            onClick={onHostClose}
          >
            Закрыть титры
          </Button>
        </div>
      ) : null}

      <style>{`
        @keyframes adepts-credits-hero {
          0% {
            opacity: 0;
            transform: translateY(0.35em) scale(0.94);
            filter: blur(6px);
          }
          22% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          42% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          72% {
            opacity: 1;
            transform: translateY(-14vh) scale(0.97);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-32vh) scale(0.9);
            filter: blur(2px);
          }
        }
        @keyframes adepts-credits-roll {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(-100%);
          }
        }
      `}</style>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Фаза 1–2: крупный заголовок по центру → вверх */}
        <div
          key={`hero-${animKey}`}
          className="pointer-events-none absolute inset-0 z-[3] flex w-full items-center justify-center overflow-hidden px-4"
        >
          <p
            className="max-w-full whitespace-nowrap text-center font-display font-semibold uppercase tracking-[0.12em] text-primary glow-text"
            style={{
              fontSize: "clamp(1.191rem, 4.83vw, 3.059rem)",
              lineHeight: 1.12,
              animation: `adepts-credits-hero ${HERO_PHASE_SEC}s cubic-bezier(0.4, 0, 0.2, 1) both`,
              animationDelay: `${INTRO_PAUSE_BEFORE_HERO_SEC}s`,
            }}
          >
            {ADEPTS_CREDITS_TITLE}
          </p>
        </div>

        {/* Фаза 3: основной текст снизу вверх (после задержки) */}
        <div
          key={`scroll-${animKey}`}
          ref={scrollRef}
          className="will-change-transform px-6 pb-32 pt-12 font-display"
          style={{
            animationName: "adepts-credits-roll",
            animationDuration: `${durationSec}s`,
            animationTimingFunction: "linear",
            animationFillMode: "both",
            animationDelay: `${SCROLL_START_DELAY_SEC}s`,
          }}
        >
          <p
            className="mb-8 font-display text-[clamp(1.553rem,5.52vw,3.278rem)] font-semibold leading-snug tracking-wide text-primary glow-text sm:mb-10 sm:text-[clamp(1.783rem,5.98vw,3.623rem)]"
          >
            {ADEPTS_CREDITS_SCROLL_TAGLINE}
          </p>
          <p className="whitespace-pre-wrap text-balance text-[1.006rem] leading-relaxed tracking-wide text-primary/95 sm:text-[1.15rem]">
            {ADEPTS_CREDITS_SCROLL_BODY_MAIN}
          </p>
        </div>
      </div>
    </div>
  );
}
