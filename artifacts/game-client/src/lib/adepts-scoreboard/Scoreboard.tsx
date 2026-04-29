import { useState, useRef, useEffect } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/adepts-quiz-types";

interface ScoreboardProps {
  players: Player[];
  onUpdateName: (index: number, name: string) => void;
  onUpdateScore: (index: number, score: number) => void;
  onResetScores: () => void;
}

function NameInput({
  name,
  onCommit,
}: {
  name: string;
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
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); }
        }}
        className="text-center font-bold w-full px-2 py-1 rounded-md outline-none bg-background/90 border-2 border-primary text-lg mb-2"
        style={{ color: "hsl(var(--foreground))" }}
      />
    );
  }

  return (
    <span
      onClick={open}
      title="Нажмите, чтобы изменить имя"
      className="text-center font-bold text-lg mb-2 block cursor-pointer hover:opacity-75 transition-opacity select-none truncate w-full px-2"
    >
      {name}
    </span>
  );
}

function ScoreInput({
  score,
  onCommit,
}: {
  score: number;
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
    onCommit(isNaN(n) ? score : n);
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
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); }
        }}
        className="text-center font-display text-4xl font-bold w-24 px-1 rounded-md outline-none bg-background/90 border-2 border-primary glow-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ color: "hsl(var(--primary))" }}
      />
    );
  }

  return (
    <span
      onClick={open}
      title="Нажмите, чтобы ввести очки"
      className="font-display text-4xl font-bold glow-text w-24 text-center cursor-pointer select-none hover:opacity-75 transition-opacity block"
    >
      {score}
    </span>
  );
}

export function Scoreboard({
  players,
  onUpdateName,
  onUpdateScore,
  onResetScores,
}: ScoreboardProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="w-full bg-card/80 border-t border-border p-4 backdrop-blur-sm">
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-3">
          {confirmReset ? (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-sm text-destructive">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onResetScores();
                  setConfirmReset(false);
                }}
              >
                Yes, Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Scores
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {players.map((player, index) => (
          <div
            key={player.id}
            className="flex flex-col items-center bg-background/50 p-4 rounded-lg border border-border relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <NameInput
              name={player.name}
              onCommit={(val) => onUpdateName(index, val)}
            />

            <div className="flex items-center justify-center gap-2 w-full">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onUpdateScore(index, player.score - 100)}
              >
                <Minus className="w-4 h-4" />
              </Button>

              <ScoreInput
                score={player.score}
                onCommit={(val) => onUpdateScore(index, val)}
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onUpdateScore(index, player.score + 100)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
