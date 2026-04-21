import { useState } from "react";
import { useGameState } from "../hooks/useGameState";
import { Scoreboard } from "../components/Scoreboard";
import { QuizBoard } from "../components/QuizBoard";
import { QuestionModal } from "../components/QuestionModal";

export default function Home() {
  const {
    state,
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
  } = useGameState();

  const [activeQuestion, setActiveQuestion] = useState<{
    themeIndex: number;
    questionIndex: number;
  } | null>(null);

  const handleQuestionClick = (themeIndex: number, questionIndex: number) => {
    setActiveQuestion({ themeIndex, questionIndex });
  };

  const closeQuestion = () => {
    setActiveQuestion(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <header className="w-full flex items-center justify-between px-6 py-3 bg-card/80 border-b border-border backdrop-blur-sm">
        <h1 className="font-display text-2xl tracking-wider text-primary glow-text">
          САМЫЙ ДУШНЫЙ 3.0
        </h1>
        <div className="flex items-center gap-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#2ecc71" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 8px #2ecc71" }} />
            Онлайн
          </div>
          <a
            href="https://node-script--gg22last.replit.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-display tracking-wider text-primary/70 hover:text-primary border border-primary/30 hover:border-primary/70 px-3 py-1.5 rounded transition-colors"
          >
            Adepts-game / spectate
          </a>
        </div>
      </header>

      <main className="flex-1 pt-4 pb-4 overflow-y-auto">
        <QuizBoard
          themes={state.themes}
          questions={state.questions}
          onUpdateTheme={updateThemeName}
          onQuestionClick={handleQuestionClick}
        />
      </main>

      <div className="w-full">
        <Scoreboard
          players={state.players}
          onUpdateName={updatePlayerName}
          onUpdateScore={updatePlayerScore}
          onResetScores={resetScores}
        />
      </div>

      {activeQuestion && (
        <QuestionModal
          isOpen={true}
          themeName={state.themes[activeQuestion.themeIndex]}
          points={(activeQuestion.questionIndex + 1) * 100}
          question={
            state.questions[activeQuestion.themeIndex][
              activeQuestion.questionIndex
            ]
          }
          onClose={closeQuestion}
          onUpdate={(data) =>
            updateQuestion(
              activeQuestion.themeIndex,
              activeQuestion.questionIndex,
              data
            )
          }
        />
      )}
    </div>
  );
}
