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
      <main className="flex-1 pt-6 pb-6 overflow-y-auto">
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
