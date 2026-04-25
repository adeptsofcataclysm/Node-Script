import { useState } from "react";
import { motion } from "framer-motion";
import { Question } from "../hooks/useGameState";

const BASE = import.meta.env.BASE_URL;

const THEME_DISPLAY: Record<string, string> = {
  "великие подвиги": "Великие\nподвиги",
  "дед прими таблетки": "Дед прими\nтаблетки",
};

const THEME_ICONS: Record<string, string> = {
  "боссы": `${BASE}bossy.png`,
  "пасхалки": `${BASE}pashalki.png`,
  "цитаты и фразы": `${BASE}quotes.png`,
  "лор world of warcraft": `${BASE}lor-wow.png`,
  "лор wow": `${BASE}lor-wow2.png`,
  "халява": `${BASE}freebie.png`,
  "локации": `${BASE}locations.png`,
  "профессии": `${BASE}professions.png`,
  "всратый косплей": `${BASE}cosplay.png`,
  "дед прими таблетки": `${BASE}ded-icon.png`,
  "тактики": `${BASE}tactics-icon.png`,
  "треш": `${BASE}trash-icon.png`,
  "петомцы": `${BASE}pets-icon.png`,
  "великие подвиги": `${BASE}feats-icon.png`,
  "наяборот": `${BASE}nayaborot-icon.png`,
  "абилки": `${BASE}abilities-icon.png`,
};

interface QuizBoardProps {
  themes: string[];
  questions: Question[][];
  onUpdateTheme: (index: number, name: string) => void;
  onQuestionClick: (themeIndex: number, questionIndex: number) => void;
}

export function QuizBoard({
  themes,
  questions,
  onUpdateTheme,
  onQuestionClick,
}: QuizBoardProps) {
  const [editingTheme, setEditingTheme] = useState<number | null>(null);

  return (
    <div className="h-full w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
      {themes.map((theme, tIdx) => (
        <div key={tIdx} className="flex gap-2 items-stretch flex-1 min-h-0">

          {/* Theme label */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: tIdx * 0.07,
              type: "spring",
              damping: 22,
              stiffness: 180,
            }}
            className="w-[21%] relative flex items-center rounded-xl overflow-hidden cursor-text group"
            style={{
              background: "linear-gradient(105deg, hsla(270,40%,12%,0.95) 0%, hsla(270,30%,9%,0.7) 100%)",
              borderLeft: "3px solid hsla(280,65%,58%,0.85)",
              border: "1px solid hsla(280,40%,35%,0.4)",
              borderLeftWidth: "3px",
              borderLeftColor: "hsla(280,65%,58%,0.85)",
              boxShadow: "inset 0 0 30px hsla(280,60%,15%,0.4)",
            }}
            onClick={() => setEditingTheme(tIdx)}
          >
            {/* Hover shimmer */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, hsla(280,65%,55%,0) 0%, hsla(280,65%,55%,0.07) 50%, hsla(280,65%,55%,0) 100%)",
              }}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Centered content: text + icon as a unit */}
            <div className="flex items-center justify-center gap-2 w-full px-3">
              {editingTheme === tIdx ? (
                <input
                  autoFocus
                  value={theme}
                  onChange={(e) => onUpdateTheme(tIdx, e.target.value)}
                  onBlur={() => setEditingTheme(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTheme(null)}
                  className="flex-1 bg-transparent outline-none uppercase tracking-widest text-foreground text-center"
                  style={{ fontSize: "clamp(0.75rem, 1.3vw, 1.15rem)", fontFamily: "WarCraft, sans-serif" }}
                  placeholder={`Тема ${tIdx + 1}`}
                />
              ) : (
                <span
                  className="uppercase tracking-widest text-foreground select-none text-center whitespace-pre-line leading-tight"
                  style={{
                    fontSize: "clamp(0.75rem, 1.3vw, 1.15rem)",
                    fontFamily: "WarCraft, sans-serif",
                    textShadow: "0 0 20px hsla(280,65%,70%,0.25)",
                  }}
                >
                  {theme
                    ? (THEME_DISPLAY[theme.toLowerCase()] ?? theme)
                    : <span className="text-muted-foreground/40">Тема {tIdx + 1}</span>}
                </span>
              )}

              {THEME_ICONS[theme.toLowerCase()] && (
                <motion.img
                  src={THEME_ICONS[theme.toLowerCase()]}
                  alt=""
                  className="flex-shrink-0 w-auto object-contain pointer-events-none select-none"
                  style={{
                    height: "3.2rem",
                    filter: "drop-shadow(0 0 5px hsla(45,100%,60%,0.44)) drop-shadow(0 0 11px hsla(45,100%,55%,0.20))",
                  }}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: tIdx * 0.07, duration: 0.45, ease: "easeOut" }}
                />
              )}
            </div>
          </motion.div>

          {/* Question point cells */}
          <div className="flex-1 grid grid-cols-5 gap-2">
            {questions[tIdx].map((q, qIdx) => {
              const points = (qIdx + 1) * 100;
              return (
                <motion.button
                  key={qIdx}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: tIdx * 0.07 + qIdx * 0.04,
                      type: "spring",
                      damping: 22,
                      stiffness: 200,
                    },
                  }}
                  whileHover={!q.used ? {
                    scale: 1.06,
                    y: -3,
                    transition: { type: "tween", duration: 0.08, ease: "easeOut" },
                  } : {}}
                  whileTap={!q.used ? {
                    scale: 0.94,
                    transition: { type: "tween", duration: 0.06 },
                  } : {}}
                  transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                  onClick={() => onQuestionClick(tIdx, qIdx)}
                  className={`
                    relative w-full h-full rounded-xl border flex items-center justify-center
                    font-display font-bold transition-colors duration-150
                    ${q.used
                      ? "bg-background/20 border-border/50 text-muted-foreground/30 cursor-not-allowed"
                      : "bg-secondary/40 border-accent/30 text-primary hover:bg-secondary hover:border-accent hover:shadow-[0_0_22px_hsla(280,65%,50%,0.45)] cursor-pointer"
                    }
                  `}
                >
                  {!q.used && (
                    <span
                      className="glow-text"
                      style={{ fontSize: "clamp(1rem, 2.2vw, 1.875rem)" }}
                    >
                      {points}
                    </span>
                  )}
                  {q.used && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-px bg-muted-foreground/30 rotate-[-15deg]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
