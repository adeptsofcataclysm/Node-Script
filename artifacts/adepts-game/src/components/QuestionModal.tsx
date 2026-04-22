import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Trophy, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-4xl bg-card border-2 border-accent/40 rounded-xl shadow-[0_0_50px_hsla(280,65%,50%,0.15)] pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-bold text-accent uppercase tracking-widest mb-1">
                      {themeName}
                    </div>
                    <div className="font-display text-4xl text-primary glow-text">
                      {points} Points
                    </div>
                  </div>
                  {/* Stage indicator */}
                  <div className="flex items-center gap-2 ml-6">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${stage === "question" ? "bg-primary/20 text-primary border border-primary/50" : "bg-muted/30 text-muted-foreground border border-border"}`}>
                      Вопрос
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${stage === "answer" ? "bg-primary/20 text-primary border border-primary/50" : "bg-muted/30 text-muted-foreground border border-border"}`}>
                      Ответ
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {stage === "question" ? (
                    <motion.div
                      key="question"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.2 }}
                      className="p-8 space-y-6"
                    >
                      <div className="space-y-3">
                        <Label className="text-lg text-muted-foreground uppercase tracking-wider">Вопрос</Label>
                        <Textarea
                          value={text}
                          onChange={(e) => {
                            setText(e.target.value);
                            onUpdate({ text: e.target.value });
                          }}
                          placeholder="Текст вопроса..."
                          className="min-h-[160px] text-2xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                        />
                      </div>
                      {question.questionUrl && (
                        <div className="space-y-3">
                          <Label className="text-lg text-muted-foreground uppercase tracking-wider">Медиа к вопросу</Label>
                          <div className="rounded-lg overflow-hidden border border-accent/20 bg-background/50 flex items-center justify-center">
                            {/\.(mp4|webm|ogg)$/i.test(question.questionUrl) ? (
                              <video
                                src={resolveUrl(question.questionUrl)}
                                controls
                                autoPlay
                                className="max-h-72 max-w-full"
                              />
                            ) : (
                              <>
                                <img
                                  src={resolveUrl(question.questionUrl)}
                                  alt="Question media"
                                  className="max-h-72 max-w-full object-contain"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                    const btn = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement;
                                    if (btn) btn.style.display = "flex";
                                  }}
                                />
                                <a
                                  href={question.questionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: "none" }}
                                  className="flex items-center gap-2 p-4 text-primary hover:text-accent transition-colors"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                  Открыть медиа
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="answer"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.2 }}
                      className="p-8 space-y-6"
                    >
                      {/* Answer text */}
                      <div className="space-y-3">
                        <Label className="text-lg text-muted-foreground uppercase tracking-wider">Ответ</Label>
                        <Textarea
                          value={answerText}
                          onChange={(e) => {
                            setAnswerText(e.target.value);
                            onUpdate({ answerText: e.target.value });
                          }}
                          placeholder="Текст ответа..."
                          className="min-h-[120px] text-xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                        />
                      </div>

                      {/* Answer URL */}
                      <div className="space-y-3">
                        <Label className="text-lg text-muted-foreground uppercase tracking-wider">Медиа к ответу</Label>
                        <div className="flex gap-2">
                          <Input
                            value={answerUrl}
                            onChange={(e) => {
                              setAnswerUrl(e.target.value);
                              onUpdate({ answerUrl: e.target.value });
                            }}
                            placeholder="https://..."
                            className="bg-background border-accent/20 focus-visible:ring-accent"
                          />
                          {answerUrl && (
                            <Button
                              variant="secondary"
                              onClick={() => window.open(answerUrl, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Открыть
                            </Button>
                          )}
                        </div>
                        {answerUrl && (
                          <div className="rounded-lg overflow-hidden border border-accent/20 bg-background/50 flex items-center justify-center">
                            {/\.(mp4|webm|ogg)$/i.test(answerUrl) ? (
                              <video
                                src={resolveUrl(answerUrl)}
                                controls
                                autoPlay
                                className="max-h-72 max-w-full"
                              />
                            ) : (
                              <img
                                src={resolveUrl(answerUrl)}
                                alt="Answer media"
                                className="max-h-56 max-w-full object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Award points */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-primary" />
                          <Label className="text-lg text-muted-foreground uppercase tracking-wider">Начислить очки игроку</Label>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          {players.map((player, idx) => {
                            const isAwarded = awarded === idx;
                            return (
                              <motion.button
                                key={player.id}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
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
              <div className="p-6 border-t border-border bg-muted/30 flex justify-between items-center">
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
                    onClick={() => setStage("answer")}
                    className="font-bold tracking-wide gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Показать ответ
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleSkip}
                    className="font-bold tracking-wide"
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
