import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/adepts-quiz-types";
import {
  ADEPTS_SLOT_THEMES,
  hsl,
  PLAYER_CARD_OCTAGON_CLIP,
  slotCardShellFilter,
} from "@/lib/adeptsQuizSlotCardVisual";

interface ScoreboardProps {
  players: Player[];
  onUpdateName: (index: number, name: string) => void;
  onUpdateScore: (index: number, score: number) => void;
  onResetScores: () => void;
  readonly?: boolean;
  /** Индекс места игрока 0–4 — мягкая подсветка «право хода» */
  currentTurnSeat?: number;
}

function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Стилизованный силуэт «адепта» + слой с официальной иконкой темы при наличии */
function SlotPortrait({
  accentHsl,
  slotIndex,
  isTurn,
}: {
  accentHsl: string;
  slotIndex: number;
  isTurn?: boolean;
}) {
  const [iconFailed, setIconFailed] = useState(false);
  const filterId = `adeptGlow-${slotIndex}`;
  const iconSrc = publicUrl("/lor-adeptov-icon.png");

  return (
    <div className="relative z-[1] flex min-h-[53px] flex-1 flex-col items-center justify-center px-1.5 py-1.5 md:min-h-[62px]">
      {isTurn ? (
        <span
          className="pointer-events-none absolute left-1 top-1 z-[2] rounded px-1 py-px font-display text-[9px] font-semibold uppercase leading-none tracking-wider shadow-sm md:left-1.5 md:top-1.5 md:text-[10px]"
          style={{
            color: hsl(accentHsl, 0.95),
            background: `linear-gradient(135deg, hsl(270 40% 8% / 0.92), hsl(270 35% 4% / 0.88))`,
            border: `1px solid ${hsl(accentHsl, 0.45)}`,
            textShadow: `0 0 8px ${hsl(accentHsl, 0.55)}`,
            boxShadow: `0 0 12px ${hsl(accentHsl, 0.2)}`,
          }}
        >
          Ход
        </span>
      ) : null}
      <div
        className="pointer-events-none absolute left-[10%] right-[10%] top-[8%]"
        style={{
          height: "78%",
          background: `radial-gradient(ellipse at center 35%, ${hsl(accentHsl, 0.52)} 0%, ${hsl(accentHsl, 0.18)} 40%, transparent 70%)`,
          filter: "blur(14px)",
        }}
      />
      {!iconFailed ? (
        <img
          src={iconSrc}
          alt=""
          className="relative z-[1] max-h-[4.05rem] w-auto max-w-[72%] object-contain opacity-[0.98] md:max-h-[4.5rem]"
          style={{
            filter: `brightness(1.08) saturate(1.35) drop-shadow(0 0 12px ${hsl(accentHsl, 0.82)}) drop-shadow(0 0 32px ${hsl(accentHsl, 0.38)})`,
          }}
          onError={() => setIconFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 120 148"
          className="relative z-[1] h-[4.05rem] w-auto max-w-[88%] md:h-[4.5rem]"
          aria-hidden
        >
          <defs>
            <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <ellipse cx="60" cy="36" rx="26" ry="30" fill={hsl(accentHsl, 0.2)} />
          <path
            fill={hsl(accentHsl, 0.92)}
            filter={`url(#${filterId})`}
            d="M60 26c-20 6-33 34-34 62L4 146h232L94 88c2-37-14-61-34-62z"
          />
          <ellipse cx="60" cy="38" rx="17" ry="19" fill="hsl(270 50% 3%)" opacity={0.6} />
        </svg>
      )}
    </div>
  );
}

function NameInput({
  name,
  accentHsl,
  onCommit,
}: {
  name: string;
  accentHsl: string;
  onCommit: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setRaw(name);
  }, [name, editing]);

  const open = () => {
    setRaw(name);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const commit = () => {
    onCommit(raw.trim() || name);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="mt-0.5 w-full rounded border bg-black/65 px-2 py-1 text-center text-xs font-semibold uppercase tracking-wider outline-none md:text-[13px]"
        style={{ borderColor: hsl(accentHsl, 0.55), color: hsl(accentHsl), boxShadow: `0 0 16px ${hsl(accentHsl, 0.28)} inset` }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title="Нажмите, чтобы изменить имя"
      className="mt-0.5 block w-full cursor-pointer truncate rounded px-1 py-0.5 text-center text-xs font-semibold uppercase tracking-wider hover:brightness-125 md:text-[13px]"
      style={{
        color: hsl(accentHsl, 0.92),
        textShadow: `0 0 12px ${hsl(accentHsl, 0.45)}`,
      }}
    >
      {name}
    </button>
  );
}

function ScoreInput({
  score,
  accentHsl,
  onCommit,
}: {
  score: number;
  accentHsl: string;
  onCommit: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(score));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setRaw(String(score));
  }, [score, editing]);

  const open = () => {
    setRaw(String(score));
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const commit = () => {
    const n = parseInt(raw, 10);
    onCommit(Number.isFinite(n) ? n : score);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="font-display max-w-[4.25rem] rounded-md border px-1.5 py-0.5 text-center text-xl font-bold outline-none md:text-2xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        style={{
          borderColor: hsl(accentHsl, 0.55),
          background: "rgba(0,0,0,0.55)",
          color: hsl(accentHsl),
          boxShadow: `0 0 24px ${hsl(accentHsl, 0.35)}`,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title="Нажмите для ввода очков"
      className="font-display cursor-pointer px-1 text-center text-xl font-bold leading-none transition hover:brightness-110 md:text-2xl lg:text-[1.6rem]"
      style={{
        color: hsl(accentHsl),
        textShadow: `0 0 18px ${hsl(accentHsl, 0.75)}, 0 0 40px ${hsl(accentHsl, 0.32)}`,
      }}
    >
      {score}
    </button>
  );
}

export function Scoreboard({
  players,
  onUpdateName,
  onUpdateScore,
  onResetScores,
  readonly = false,
  currentTurnSeat,
}: ScoreboardProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const normalizedTurn =
    currentTurnSeat != null &&
    Number.isInteger(currentTurnSeat) &&
    currentTurnSeat >= 0 &&
    currentTurnSeat <= 4
      ? currentTurnSeat
      : undefined;

  return (
    <div className="w-full min-w-0 shrink-0 border-t border-[hsla(275,55%,42%,0.35)] bg-gradient-to-t from-[hsla(278,42%,6%,1)] via-[hsla(274,42%,5%,0.97)] to-[hsla(270,42%,9%,0.92)] py-2 backdrop-blur-md md:py-2.5">
      {!readonly && (
        <div className="mx-auto mb-2 flex w-full max-w-[1080px] justify-end px-2">
          <div className="flex items-center gap-2">
            {confirmReset ? (
              <div className="flex flex-wrap items-center justify-end gap-2 animate-in fade-in">
                <span className="text-xs text-muted-foreground">Сбросить все очки?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onResetScores();
                    setConfirmReset(false);
                  }}
                >
                  Да
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmReset(true)}
                className="border-border/70 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Сброс очков
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center overflow-x-auto px-2 pb-0.5">
        <div className="mx-auto grid w-full min-w-[528px] max-w-[1080px] grid-cols-5 gap-1.5 md:gap-2 lg:gap-2.5">
          {players.map((player, index) => {
            const theme = ADEPTS_SLOT_THEMES[index] ?? ADEPTS_SLOT_THEMES[0]!;
            const accent = theme.hsl;
            const isTurn = normalizedTurn === index;

            return (
              <div
                key={player.id}
                aria-current={isTurn ? "true" : undefined}
                title={isTurn ? "Сейчас ход этого игрока" : undefined}
                className="relative min-h-[120px] md:min-h-[134px] lg:min-h-[147px]"
                style={{ filter: slotCardShellFilter(accent, isTurn) }}
              >
                <div
                  className={`relative flex min-h-[120px] flex-col overflow-hidden transition-[box-shadow] duration-500 ease-out md:min-h-[134px] lg:min-h-[147px] ${isTurn ? "brightness-[1.19]" : ""}`}
                  style={
                    {
                      ["--oct" as string]: "clamp(9px, 2.2vw, 15px)",
                      clipPath: PLAYER_CARD_OCTAGON_CLIP,
                      WebkitClipPath: PLAYER_CARD_OCTAGON_CLIP,
                      background: `linear-gradient(175deg, hsl(270 35% 8% / 0.94) 0%, hsl(270 28% 5% / 0.97) 50%, hsl(270 43% 3% / 1) 100%)`,
                      boxShadow: isTurn
                        ? `inset 0 0 0 1px ${hsl(accent, 0.42)}, inset 0 -8px 40px ${hsl(accent, 0.069)}`
                        : `inset 0 0 0 1px ${hsl(accent, 0.12)}, inset 0 0 34px ${hsl(accent, 0.06)}`,
                    } as CSSProperties
                  }
                >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out ${
                    isTurn ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: `radial-gradient(ellipse 118% 90% at 50% -8%, ${hsl(accent, 0.207)}, transparent 58%)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-[0.13]"
                  style={{
                    background: `radial-gradient(ellipse 130% 90% at 50% -5%, ${hsl(accent, 0.5)}, transparent 58%)`,
                  }}
                />

                <div className="relative z-[1] border-b px-2 py-1.5 pb-2 text-center" style={{ borderColor: hsl(accent, 0.22) }}>
                  {!readonly ? (
                    <NameInput accentHsl={accent} name={player.name} onCommit={(v) => onUpdateName(index, v)} />
                  ) : (
                    <div
                      className="truncate px-0.5 py-0.5 text-center text-xs font-semibold uppercase tracking-wider md:text-[13px]"
                      style={{
                        color: hsl(accent, 0.88),
                        textShadow: `0 0 10px ${hsl(accent, 0.32)}`,
                      }}
                      title={player.name}
                    >
                      {player.name}
                    </div>
                  )}
                </div>

                <SlotPortrait accentHsl={accent} slotIndex={index} isTurn={isTurn} />

                <div
                  className="relative z-[1] mt-auto flex flex-col items-center gap-1 border-t px-2 py-1.5 pb-2"
                  style={{ borderColor: hsl(accent, 0.25) }}
                >
                  {!readonly ? (
                    <div className="flex w-full max-w-[5.85rem] items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-red-400/95 hover:bg-red-500/15 hover:text-red-300"
                        onClick={() => onUpdateScore(index, player.score - 100)}
                        aria-label="Минус 100"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <ScoreInput accentHsl={accent} score={player.score} onCommit={(v) => onUpdateScore(index, v)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-white/5"
                        style={{ color: hsl(accent) }}
                        onClick={() => onUpdateScore(index, player.score + 100)}
                        aria-label="Плюс 100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="font-display px-1 text-center text-xl font-bold leading-none md:text-2xl lg:text-[1.6rem]"
                      style={{
                        color: hsl(accent),
                        textShadow: `0 0 18px ${hsl(accent, 0.72)}, 0 0 44px ${hsl(accent, 0.26)}`,
                      }}
                    >
                      {player.score}
                    </span>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
