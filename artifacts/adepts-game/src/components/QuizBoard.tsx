import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
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
  return (
    <div className="w-full max-w-7xl mx-auto p-8">
      <div className="flex flex-col gap-4">
        {themes.map((theme, tIdx) => (
          <div key={tIdx} className="flex gap-4 items-stretch h-24">
            <div className="w-1/4 flex items-center bg-card/60 border border-border rounded-lg p-4">
              <Input
                value={theme}
                onChange={(e) => onUpdateTheme(tIdx, e.target.value)}
                className="font-display font-bold text-xl uppercase bg-transparent border-transparent hover:border-border focus:border-primary transition-colors"
                placeholder={`Theme ${tIdx + 1}`}
              />
            </div>
            
            <div className="w-3/4 grid grid-cols-5 gap-4">
              {questions[tIdx].map((q, qIdx) => {
                const points = (qIdx + 1) * 100;
                
                return (
                  <motion.button
                    key={qIdx}
                    whileHover={!q.used ? { scale: 1.05 } : {}}
                    whileTap={!q.used ? { scale: 0.95 } : {}}
                    onClick={() => onQuestionClick(tIdx, qIdx)}
                    className={`
                      relative w-full h-full rounded-lg border flex items-center justify-center
                      font-display text-3xl font-bold transition-all duration-300
                      ${
                        q.used
                          ? "bg-background/20 border-border/50 text-muted-foreground/30 cursor-not-allowed"
                          : "bg-secondary/40 border-accent/30 text-primary hover:bg-secondary hover:border-accent hover:shadow-[0_0_15px_hsla(280,65%,50%,0.3)] cursor-pointer"
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
