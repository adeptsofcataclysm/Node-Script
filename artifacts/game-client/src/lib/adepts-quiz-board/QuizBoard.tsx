import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getQuizThemeIconUrl } from "@/lib/quizThemeIcons";
import { isAdeptsWheelFaceDownCell } from "@/lib/isAdeptsWheelFaceDownCell";
import type { QuizBoardHoverCell } from "@/lib/quizBoardHover";
import type { AdeptsBoardId, Question } from "@/lib/adepts-quiz-types";
import { Button } from "@/components/ui/button";

function resolveQuizAssetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

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
  /** When true, theme titles cannot be edited (e.g. only the host may rename themes). */
  themeEditReadonly?: boolean;
  /** Доска 4: карточка открыта через pickCell — показ на столе с кнопкой «Закрыть». */
  superGameActiveCard?: { themeIndex: number; questionIndex: number } | null;
  superGameOpenQuestion?: Question | null;
  canCloseSuperGameCard?: boolean;
  onCloseSuperGameCard?: () => void;
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
  themeEditReadonly,
  superGameActiveCard,
  superGameOpenQuestion,
  canCloseSuperGameCard = false,
  onCloseSuperGameCard,
}: QuizBoardProps) {
  const [editingTheme, setEditingTheme] = useState<number | null>(null);
  const [themeDraft, setThemeDraft] = useState("");
  const theme2LineBreaks = board === 2;
  const themeRowLocked = themeEditReadonly ?? readonly;

  useEffect(() => {
    if (editingTheme === null) return;
    setThemeDraft(themes[editingTheme] ?? "");
  }, [editingTheme, themes]);

  const hoverNorm = useMemo(
    () => normalizeBoardHover(hoverCell, themes.length, questions),
    [hoverCell, themes.length, questions]
  );

  if (board === 4) {
    const title = (themes[0] ?? "").trim() || "СУПЕР ИГРА!";
    const row = questions[0] ?? [];
    const superCardLabelSize = "clamp(0.62rem, 2.1vmin + 0.35vw, 1.05rem)";
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-full flex-col items-center justify-center gap-3 px-2 py-2 sm:gap-4 sm:px-4 sm:py-4">
        <motion.h2
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 text-center font-display text-[clamp(1.1rem,3.2vmin+0.5vw,1.85rem)] uppercase tracking-[0.2em] text-primary glow-text sm:tracking-[0.25em]"
          style={{ fontFamily: "WarCraft, sans-serif", textShadow: "0 0 28px hsla(280,65%,55%,0.45)" }}
        >
          {title}
        </motion.h2>
        <div
          className="mx-auto grid aspect-square w-full max-w-full shrink-0 grid-cols-2 grid-rows-2 gap-[clamp(0.35rem,1.4vmin,0.9rem)] sm:gap-3 md:gap-4"
          style={{ width: "min(92vw, min(52dvh, 34rem))" }}
        >
          {row.map((q, qIdx) => {
            const turnPlayerBlockedCell =
              blockTurnPlayerFromPlayedOrFaceDownCells &&
              (q.used || isAdeptsWheelFaceDownCell(q));
            const isThisOpen =
              superGameActiveCard != null &&
              superGameActiveCard.themeIndex === 0 &&
              superGameActiveCard.questionIndex === qIdx;
            const cellReadonly = readonly || (turnPlayerBlockedCell && !isThisOpen);
            const syncHovered =
              hoverNorm != null && hoverNorm.themeIndex === 0 && hoverNorm.questionIndex === qIdx;
            const canEmitHover =
              canSyncBoardHover &&
              !q.used &&
              !turnPlayerBlockedCell &&
              typeof onBoardHoverCellChange === "function";
            const prizeImgSrc = (() => {
              const raw = isThisOpen ? (superGameOpenQuestion?.questionUrl ?? q.questionUrl) : q.questionUrl;
              const u = String(raw ?? "").trim();
              return u ? resolveQuizAssetUrl(u) : resolveQuizAssetUrl("/lor-adeptov-icon.png");
            })();

            return (
              <div
                key={qIdx}
                className="min-h-0 min-w-0 [perspective:min(1100px,95vmin)]"
                data-quiz-point=""
                onPointerEnter={() => {
                  if (canEmitHover) onBoardHoverCellChange({ themeIndex: 0, questionIndex: qIdx });
                }}
                onPointerLeave={(e) => {
                  if (!canEmitHover) return;
                  const rel = e.relatedTarget as HTMLElement | null;
                  if (rel?.closest?.("[data-quiz-point]")) return;
                  onBoardHoverCellChange?.(null);
                }}
              >
                {!q.used && !isThisOpen ? (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: qIdx * 0.05, type: "spring", damping: 20, stiffness: 200 }}
                    disabled={cellReadonly}
                    onClick={() => !cellReadonly && onQuestionClick(0, qIdx)}
                    className={`
                      relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded-2xl border-2 text-center font-display font-bold
                      transition-[box-shadow,border-color] duration-150
                      ${
                        syncHovered
                          ? "border-accent bg-secondary shadow-[0_0_22px_hsla(280,65%,50%,0.45)]"
                          : "border-accent/40 bg-secondary/50"
                      }
                      ${cellReadonly ? "cursor-default opacity-60" : "cursor-pointer hover:border-accent"}
                    `}
                  >
                    <span
                      className="glow-text flex h-full w-full items-center justify-center px-[clamp(0.15rem,0.8vmin,0.45rem)] leading-tight"
                      style={{ fontSize: superCardLabelSize }}
                    >
                      Открой меня!
                    </span>
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: qIdx * 0.05, type: "spring", damping: 20, stiffness: 200 }}
                    className="relative h-full min-h-0 w-full min-w-0"
                  >
                    <motion.div
                      className="relative h-full w-full"
                      initial={{ rotateY: q.used ? 180 : 0 }}
                      animate={{ rotateY: q.used || isThisOpen ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border-2 border-accent/40 bg-secondary/50 [backface-visibility:hidden]"
                        style={{ WebkitBackfaceVisibility: "hidden" }}
                      >
                        <span
                          className="glow-text px-[clamp(0.15rem,0.8vmin,0.45rem)] text-center leading-tight"
                          style={{ fontSize: superCardLabelSize }}
                        >
                          Открой меня!
                        </span>
                      </div>
                      <div
                        className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-accent/45 bg-card [backface-visibility:hidden] [transform:rotateY(180deg)]"
                        style={{ WebkitBackfaceVisibility: "hidden" }}
                      >
                        {q.used ? (
                          <div className="relative h-full w-full overflow-hidden">
                            <img
                              src={prizeImgSrc}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover opacity-[0.35] grayscale"
                              draggable={false}
                            />
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background/55 to-background/25 p-2">
                              <div className="h-px w-[72%] rotate-[-18deg] bg-muted-foreground/45" />
                              <div className="mt-3 h-px w-[72%] rotate-[18deg] bg-muted-foreground/35" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative h-full w-full overflow-hidden">
                            <img
                              src={prizeImgSrc}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              draggable={false}
                            />
                            {canCloseSuperGameCard && typeof onCloseSuperGameCard === "function" ? (
                              <div className="absolute bottom-1.5 right-1.5 z-10 sm:bottom-2 sm:right-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="font-display text-xs uppercase tracking-wider shadow-md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCloseSuperGameCard();
                                  }}
                                >
                                  Закрыть
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-full flex-col gap-2 px-2 py-2 sm:px-4 sm:py-4">
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
              className={`w-[21%] relative flex items-center rounded-xl overflow-hidden group ${themeRowLocked ? "cursor-default" : "cursor-text"}`}
              style={{
                background: "linear-gradient(105deg, hsla(270,40%,12%,0.95) 0%, hsla(270,30%,9%,0.7) 100%)",
                borderLeft: "3px solid hsla(280,65%,58%,0.85)",
                border: "1px solid hsla(280,40%,35%,0.4)",
                borderLeftWidth: "3px",
                borderLeftColor: "hsla(280,65%,58%,0.85)",
                boxShadow: "inset 0 0 30px hsla(280,60%,15%,0.4)",
              }}
              onClick={() => !themeRowLocked && setEditingTheme(tIdx)}
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
                    value={themeDraft}
                    onChange={(e) => setThemeDraft(e.target.value)}
                    onBlur={() => {
                      void onUpdateTheme(tIdx, themeDraft);
                      setEditingTheme(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
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
