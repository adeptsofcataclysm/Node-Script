import { useState } from "react";
import { motion } from "framer-motion";
import { Question } from "../hooks/useGameState";

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
    <div className="w-full max-w-7xl mx-auto px-6 py-4">
      <div className="flex flex-col gap-3">
        {themes.map((theme, tIdx) => (
          <div key={tIdx} className="flex gap-3 items-stretch h-24">

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
              className="w-1/4 relative flex items-center rounded-xl overflow-hidden cursor-text group"
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

              {/* Decorative glow dot */}
              <div
                className="absolute left-3 w-1.5 h-1.5 rounded-full"
                style={{
                  background: "hsla(280,65%,70%,0.9)",
                  boxShadow: "0 0 8px 2px hsla(280,65%,60%,0.6)",
                }}
              />

              {editingTheme === tIdx ? (
                <input
                  autoFocus
                  value={theme}
                  onChange={(e) => onUpdateTheme(tIdx, e.target.value)}
                  onBlur={() => setEditingTheme(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTheme(null)}
                  className="w-full bg-transparent outline-none pl-7 pr-4 font-display font-bold text-lg uppercase tracking-widest text-foreground"
                  placeholder={`Тема ${tIdx + 1}`}
                />
              ) : (
                <span className="pl-7 pr-4 font-display font-bold text-lg uppercase tracking-widest text-foreground truncate select-none"
                  style={{ textShadow: "0 0 20px hsla(280,65%,70%,0.25)" }}
                >
                  {theme || <span className="text-muted-foreground/40 text-base">Тема {tIdx + 1}</span>}
                </span>
              )}
            </motion.div>

            {/* Question point cells */}
            <div className="w-3/4 grid grid-cols-5 gap-3">
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
                      font-display text-3xl font-bold transition-colors duration-150
                      ${q.used
                        ? "bg-background/20 border-border/50 text-muted-foreground/30 cursor-not-allowed"
                        : "bg-secondary/40 border-accent/30 text-primary hover:bg-secondary hover:border-accent hover:shadow-[0_0_22px_hsla(280,65%,50%,0.45)] cursor-pointer"
                      }
                    `}
                  >
                    {!q.used && <span className="glow-text">{points}</span>}
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
    </div>
  );
}
