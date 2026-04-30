import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getQuizThemeIconUrl } from "@/lib/quizThemeIcons";
import { isAdeptsWheelFaceDownCell } from "@/lib/isAdeptsWheelFaceDownCell";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import type { AdeptsBoardId, Question } from "@/lib/adepts-quiz-types";

const THEME_DISPLAY_BOARD2: Record<string, string> = {
  "великие подвиги": "Великие\nподвиги",
  "дед прими таблетки": "Дед прими\nтаблетки",
};

function normalizeBoardHover(
  hoverCell: QuizBoardHoverCell | undefined,
  themeCount: number,
  questions: Question[][]
): QuizBoardHoverCell {
  if (
    !hoverCell ||
    typeof hoverCell.themeIndex !== "number" ||
    typeof hoverCell.questionIndex !== "number"
  ) {
    return null;
  }
  const { themeIndex, questionIndex } = hoverCell;
  if (
    themeIndex < 0 ||
    themeIndex >= themeCount ||
    questionIndex < 0 ||
    questionIndex >= (questions[themeIndex]?.length ?? 0)
  ) {
    return null;
  }
  const q = questions[themeIndex]![questionIndex]!;
  if (q.used) return null;
  return { themeIndex, questionIndex };
}

interface QuizBoardProps {
  board: AdeptsBoardId;
  themes: string[];
  questions: Question[][];
  onUpdateTheme: (index: number, name: string) => void;
  onQuestionClick: (themeIndex: number, questionIndex: number) => void;
  readonly?: boolean;
  /**
   * true: игрок с ходом не открывает сыгранные (used) и ячейки только-колесо без вопроса; ведущий может.
   */
  blockTurnPlayerFromPlayedOrFaceDownCells?: boolean;
  /** Подсветка ячейки с другого клиента (ведущий / игрок с ходом). */
  hoverCell?: QuizBoardHoverCell;
  /** Ведущий или игрок с ходом — шлёт hover в общее состояние. */
  canSyncBoardHover?: boolean;
  onBoardHoverCellChange?: (cell: QuizBoardHoverCell) => void;
}

export function QuizBoard({
  board,
  themes,
  questions,
  onUpdateTheme,
  onQuestionClick,
  readonly = false,
  blockTurnPlayerFromPlayedOrFaceDownCells = false,
  hoverCell,
  canSyncBoardHover = false,
  onBoardHoverCellChange,
}: QuizBoardProps) {
  const [editingTheme, setEditingTheme] = useState<number | null>(null);
  const theme2LineBreaks = board === 2;

  const hoverNorm = useMemo(
    () => normalizeBoardHover(hoverCell, themes.length, questions),
    [hoverCell, themes.length, questions]
  );

  return (
    <div className="h-full w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
      {themes.map((theme, tIdx) => {
        const iconUrl = getQuizThemeIconUrl(theme);
        return (
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
              className={`w-[21%] relative flex items-center rounded-xl overflow-hidden group ${readonly ? "cursor-default" : "cursor-text"}`}
              style={{
                background: "linear-gradient(105deg, hsla(270,40%,12%,0.95) 0%, hsla(270,30%,9%,0.7) 100%)",
                borderLeft: "3px solid hsla(280,65%,58%,0.85)",
                border: "1px solid hsla(280,40%,35%,0.4)",
                borderLeftWidth: "3px",
                borderLeftColor: "hsla(280,65%,58%,0.85)",
                boxShadow: "inset 0 0 30px hsla(280,60%,15%,0.4)",
              }}
              onClick={() => !readonly && setEditingTheme(tIdx)}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, hsla(280,65%,55%,0) 0%, hsla(280,65%,55%,0.07) 50%, hsla(280,65%,55%,0) 100%)",
                }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

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
                ) : theme2LineBreaks ? (
                  <span
                    className="uppercase tracking-widest text-foreground select-none text-center whitespace-pre-line leading-tight"
                    style={{
                      fontSize: "clamp(0.75rem, 1.3vw, 1.15rem)",
                      fontFamily: "WarCraft, sans-serif",
                      textShadow: "0 0 20px hsla(280,65%,70%,0.25)",
                    }}
                  >
                    {theme ? (
                      THEME_DISPLAY_BOARD2[theme.toLowerCase()] ?? theme
                    ) : (
                      <span className="text-muted-foreground/40">Тема {tIdx + 1}</span>
                    )}
                  </span>
                ) : (
                  <span
                    className="uppercase tracking-widest text-foreground truncate select-none text-center"
                    style={{
                      fontSize: "clamp(0.75rem, 1.3vw, 1.15rem)",
                      fontFamily: "WarCraft, sans-serif",
                      textShadow: "0 0 20px hsla(280,65%,70%,0.25)",
                    }}
                  >
                    {theme || <span className="text-muted-foreground/40">Тема {tIdx + 1}</span>}
                  </span>
                )}

                {iconUrl && (
                  <motion.img
                    src={iconUrl}
                    alt=""
                    className="flex-shrink-0 w-auto object-contain pointer-events-none select-none"
                    style={{
                      height: "3.2rem",
                      filter:
                        "drop-shadow(0 0 5px hsla(45,100%,60%,0.44)) drop-shadow(0 0 11px hsla(45,100%,55%,0.20))",
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
                const turnPlayerBlockedCell =
                  blockTurnPlayerFromPlayedOrFaceDownCells &&
                  (q.used || isAdeptsWheelFaceDownCell(q));
                const cellReadonly = readonly || turnPlayerBlockedCell;
                const syncHovered =
                  hoverNorm != null &&
                  hoverNorm.themeIndex === tIdx &&
                  hoverNorm.questionIndex === qIdx;
                const canEmitHover =
                  canSyncBoardHover && !q.used && !turnPlayerBlockedCell && typeof onBoardHoverCellChange === "function";

                return (
                  <motion.button
                    key={qIdx}
                    type="button"
                    data-quiz-point=""
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
                    onPointerEnter={() => {
                      if (canEmitHover) onBoardHoverCellChange({ themeIndex: tIdx, questionIndex: qIdx });
                    }}
                    onPointerLeave={(e) => {
                      if (!canEmitHover) return;
                      const rel = e.relatedTarget as HTMLElement | null;
                      if (rel?.closest?.("[data-quiz-point]")) return;
                      onBoardHoverCellChange(null);
                    }}
                    onClick={() => !cellReadonly && onQuestionClick(tIdx, qIdx)}
                    className={`
                      group relative w-full h-full overflow-hidden rounded-xl border flex flex-col
                      font-display font-bold transition-[box-shadow,background-color,border-color] duration-100 ease-out
                      ${
                        q.used
                          ? "bg-background/20 border-border/50 text-muted-foreground/30 cursor-not-allowed"
                          : `bg-secondary/40 border-accent/30 text-primary ${
                              syncHovered
                                ? "border-accent bg-secondary shadow-[0_0_22px_hsla(280,65%,50%,0.45)]"
                                : ""
                            } ${cellReadonly ? "cursor-default" : "cursor-pointer"}`
                      }
                    `}
                  >
                    {!q.used && (
                      <div
                        className={`relative flex h-full w-full flex-1 flex-col items-center justify-center transition-transform duration-100 ease-out will-change-transform ${
                          syncHovered ? "-translate-y-[3px] scale-[1.06]" : "translate-y-0 scale-100"
                        }`}
                      >
                        <span
                          className="glow-text"
                          style={{ fontSize: "clamp(1rem, 2.2vw, 1.875rem)" }}
                        >
                          {points}
                        </span>
                      </div>
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
        );
      })}
    </div>
  );
}
