import { useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Player } from "../hooks/useGameState";

interface ScoreboardProps {
  players: Player[];
  onUpdateName: (index: number, name: string) => void;
  onUpdateScore: (index: number, score: number) => void;
  onResetScores: () => void;
}

export function Scoreboard({
  players,
  onUpdateName,
  onUpdateScore,
  onResetScores,
}: ScoreboardProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="w-full bg-card/80 border-b border-border p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl tracking-wider text-primary">
          ADEPTS GAME
        </h2>
        <div className="flex gap-2">
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
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <Input
              value={player.name}
              onChange={(e) => onUpdateName(index, e.target.value)}
              className="text-center font-bold bg-transparent border-transparent hover:border-border focus:border-primary transition-colors text-lg mb-2"
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
              
              <Input
                type="number"
                value={player.score}
                onChange={(e) => onUpdateScore(index, parseInt(e.target.value) || 0)}
                className="text-center font-display text-4xl font-bold bg-transparent border-none glow-text w-24 px-0 focus-visible:ring-0"
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
