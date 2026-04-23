import { useState, useEffect } from "react";
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

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg)$/i.test(url);
}

function adaptiveSize(str: string, sizes: [number, string][], fallback: string) {
  for (const [limit, cls] of sizes) {
    if (str.length <= limit) return cls;
  }
  return fallback;
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

  useEffect(() => {
    if (isOpen) {
      setText(question.text || "");
      setAnswerText(question.answerText || "");
      setAnswerUrl(question.answerUrl || "");
      setAwarded(null);
      setStage("question");
      setIsEditing(false);
    }
  }, [isOpen, question]);

  const handleAward = (playerIndex: number) => {
    onAwardPoints(playerIndex, points);
    onUpdate({ text, answerText, answerUrl, used: true });
    setAwarded(playerIndex);
    onClose();
  };

  const handleSkip = () => {
    onUpdate({ text, answerText, answerUrl, used: true });
    onClose();
  };

  const questionFontSize = adaptiveSize(text, [
    [40, "text-5xl"],
    [80, "text-4xl"],
    [140, "text-3xl"],
  ], "text-2xl");

  const answerFontSize = adaptiveSize(answerText, [
    [20, "text-6xl"],
    [40, "text-5xl"],
    [80, "text-4xl"],
  ], "text-3xl");

  const answerWords = answerText.split(/\s+/).filter(Boolean);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-5xl bg-card border-2 border-accent/40 rounded-2xl shadow-[0_0_80px_hsla(280,65%,50%,0.2)] pointer-events-auto overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-[0.2em] mb-1">
                      {themeName}
                    </div>
                    <div className="font-display text-5xl text-primary glow-text leading-none">
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
                    onClick={onClose}
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
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
                        <div className="p-8">
                          <Textarea
                            value={text}
                            onChange={(e) => {
                              setText(e.target.value);
                              onUpdate({ text: e.target.value });
                            }}
                            placeholder="Текст вопроса..."
                            className="min-h-[160px] text-xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                          />
                        </div>
                      ) : (
                        <>
                          {question.questionUrl && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1, duration: 0.35 }}
                              className="px-8 pt-8 flex justify-center"
                            >
                              {isVideo(question.questionUrl) ? (
                                <video
                                  src={resolveUrl(question.questionUrl)}
                                  controls
                                  autoPlay
                                  preload="auto"
                                  className="max-h-80 rounded-xl shadow-lg"
                                />
                              ) : (
                                <img
                                  src={resolveUrl(question.questionUrl)}
                                  alt="Question media"
                                  className="max-h-72 rounded-xl object-contain shadow-lg"
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
                          <div className="flex flex-col items-center justify-center px-12 py-10 min-h-[180px]">
                            <motion.p
                              key={text}
                              initial={{ opacity: 0, y: 28, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              className={`font-display ${questionFontSize} text-center leading-snug tracking-wide text-foreground whitespace-pre-wrap`}
                              style={{ textShadow: "0 0 60px hsla(280,65%,70%,0.12)" }}
                            >
                              {text || "—"}
                            </motion.p>
                          </div>
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
                        <div className="p-8 space-y-4">
                          <Textarea
                            value={answerText}
                            onChange={(e) => {
                              setAnswerText(e.target.value);
                              onUpdate({ answerText: e.target.value });
                            }}
                            placeholder="Текст ответа..."
                            className="min-h-[100px] text-xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={answerUrl}
                              onChange={(e) => {
                                setAnswerUrl(e.target.value);
                                onUpdate({ answerUrl: e.target.value });
                              }}
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
                              className="px-8 pt-8 flex justify-center"
                            >
                              {isVideo(answerUrl) ? (
                                <video
                                  src={resolveUrl(answerUrl)}
                                  controls
                                  autoPlay
                                  preload="auto"
                                  className="max-h-80 rounded-xl shadow-lg"
                                />
                              ) : (
                                <img
                                  src={resolveUrl(answerUrl)}
                                  alt="Answer media"
                                  className="max-h-64 rounded-xl object-contain shadow-lg"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                            </motion.div>
                          )}
                          <div className="flex flex-col items-center justify-center px-12 py-10 min-h-[140px]">
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
                                  className={`font-display ${answerFontSize} text-primary glow-text leading-tight`}
                                >
                                  {word}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Award points */}
                      <div className="px-8 pb-8 pt-4 space-y-3 border-t border-border/40 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Начислить очки игроку
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
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
                                  flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2
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
                                    <Trophy className="w-6 h-6 text-primary" />
                                  </motion.div>
                                ) : (
                                  <span className="text-2xl font-bold text-primary glow-text">+{points}</span>
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-border/60 bg-muted/20 flex justify-between items-center">
                {question.used ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      onUpdate({ used: false });
                      onClose();
                    }}
                    className="font-bold tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    Сделать карточку активной
                  </Button>
                ) : (
                  <div />
                )}

                {stage === "question" ? (
                  <Button
                    size="lg"
                    onClick={() => { setStage("answer"); setIsEditing(false); }}
                    className="font-bold tracking-wide gap-2 text-base px-8"
                  >
                    <Eye className="w-5 h-5" />
                    Показать ответ
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
