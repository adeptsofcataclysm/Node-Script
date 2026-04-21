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
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <div className="fixed top-0 left-0 right-0 z-10">
        <Scoreboard
          players={state.players}
          onUpdateName={updatePlayerName}
          onUpdateScore={updatePlayerScore}
          onResetScores={resetScores}
        />
      </div>

      <main className="flex-1 pt-48 pb-12 overflow-y-auto">
        <QuizBoard
          themes={state.themes}
          questions={state.questions}
          onUpdateTheme={updateThemeName}
          onQuestionClick={handleQuestionClick}
        />
      </main>

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
