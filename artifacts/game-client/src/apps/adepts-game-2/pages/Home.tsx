import { useState, useEffect, useMemo } from "react";
import { useGameState } from "../hooks/useGameState";
import { Scoreboard } from "../components/Scoreboard";
import { QuizBoard } from "../components/QuizBoard";
import { QuestionModal } from "../components/QuestionModal";

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

export default function Home() {
  const {
    state,
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
  } = useGameState();

  const handleAwardPoints = (playerIndex: number, points: number) => {
    updatePlayerScore(playerIndex, state.players[playerIndex].score + points);
  };

  const videoUrls = useMemo(() => {
    const urls = new Set<string>();
    state.questions.flat().forEach((q) => {
      if (q.questionUrl && /\.(mp4|webm|ogg)$/i.test(q.questionUrl)) urls.add(resolveUrl(q.questionUrl));
      if (q.answerUrl && /\.(mp4|webm|ogg)$/i.test(q.answerUrl)) urls.add(resolveUrl(q.answerUrl));
    });
    return [...urls];
  }, [state.questions]);

  useEffect(() => {
    fetch("/api/track/adepts-game-2", { method: "POST" }).catch(() => {});
  }, []);

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
    <div className="adepts-quiz-theme h-screen flex flex-col text-foreground overflow-hidden">
      {/* Hidden video preloader */}
      <div style={{ display: "none" }} aria-hidden="true">
        {videoUrls.map((url) => (
          <video key={url} src={url} preload="auto" muted />
        ))}
      </div>
      {/* Fixed online indicator */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 30, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#2ecc71" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 8px #2ecc71" }} />
        Онлайн
      </div>

      <header className="flex-shrink-0 w-full flex items-center gap-6 px-6 py-3 bg-card/80 border-b border-border backdrop-blur-sm">
        <h1 className="font-display text-2xl tracking-wider text-primary glow-text">
          САМЫЙ ДУШНЫЙ 3.0
        </h1>
        <span className="adepts-quiz-badge text-sm font-display tracking-wider text-primary/80 border border-primary/40 px-3 py-1.5 rounded">
          Adepts-game 2
        </span>
      </header>

      <main className="flex-1 min-h-0 py-3">
        <QuizBoard
          themes={state.themes}
          questions={state.questions}
          onUpdateTheme={updateThemeName}
          onQuestionClick={handleQuestionClick}
        />
      </main>

      <div className="flex-shrink-0 w-full">
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
          players={state.players}
          onClose={closeQuestion}
          onUpdate={(data) =>
            updateQuestion(
              activeQuestion.themeIndex,
              activeQuestion.questionIndex,
              data
            )
          }
          onAwardPoints={handleAwardPoints}
        />
      )}
    </div>
  );
}
