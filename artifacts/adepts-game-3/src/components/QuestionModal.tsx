import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Question } from "../hooks/useGameState";

interface QuestionModalProps {
  isOpen: boolean;
  themeName: string;
  points: number;
  question: Question;
  onClose: () => void;
  onUpdate: (data: Partial<Question>) => void;
}

export function QuestionModal({
  isOpen,
  themeName,
  points,
  question,
  onClose,
  onUpdate,
}: QuestionModalProps) {
  const [text, setText] = useState("");
  const [answerUrl, setAnswerUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setText(question.text || "");
      setAnswerUrl(question.answerUrl || "");
    }
  }, [isOpen, question]);

  const handleMarkUsed = () => {
    onUpdate({ text, answerUrl, used: !question.used });
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
              transition={{ type: "spring", damping: 25, stiffness: 30 }}
              className="w-full max-w-4xl bg-card border-2 border-accent/40 rounded-xl shadow-[0_0_50px_hsla(280,65%,50%,0.15)] pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div>
                  <div className="text-sm font-bold text-accent uppercase tracking-widest mb-1">
                    {themeName}
                  </div>
                  <div className="font-display text-4xl text-primary glow-text">
                    {points} Points
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

              <div className="p-8 flex-1 overflow-y-auto space-y-8">
                <div className="space-y-4">
                  <Label className="text-lg text-muted-foreground uppercase tracking-wider">Question Text</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      onUpdate({ text: e.target.value });
                    }}
                    placeholder="Enter the question here..."
                    className="min-h-[200px] text-2xl resize-y font-sans leading-relaxed bg-background border-accent/20 focus-visible:ring-accent"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-lg text-muted-foreground uppercase tracking-wider">Answer URL / Media</Label>
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
                        Open Link
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Changes save automatically.
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={onClose} size="lg">
                    Close
                  </Button>
                  <Button
                    variant={question.used ? "secondary" : "default"}
                    size="lg"
                    onClick={handleMarkUsed}
                    className="font-bold tracking-wide"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {question.used ? "Mark as Unplayed" : "Mark as Played"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
