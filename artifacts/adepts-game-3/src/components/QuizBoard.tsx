import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";
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
                
                return q.used ? (
                  <div
                    key={qIdx}
                    className="relative w-full h-full rounded-lg border bg-background/20 border-border/50 flex items-center justify-center group"
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-muted-foreground/30 rotate-[-15deg]" />
                    </div>
                    <button
                      onClick={() => onQuestionClick(tIdx, qIdx)}
                      className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <FolderOpen className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Открыть</span>
                    </button>
                  </div>
                ) : (
                  <motion.button
                    key={qIdx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onQuestionClick(tIdx, qIdx)}
                    className="relative w-full h-full rounded-lg border flex items-center justify-center font-display text-3xl font-bold transition-all duration-300 bg-secondary/40 border-accent/30 text-primary hover:bg-secondary hover:border-accent hover:shadow-[0_0_15px_hsla(280,65%,50%,0.3)] cursor-pointer"
                  >
                    <span className="glow-text">{points}</span>
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
