import { useEffect, useMemo } from "react";
import { useGameState } from "../hooks/useGameState";
import { Scoreboard } from "@/lib/adepts-scoreboard";
import { QuizBoard } from "@/lib/adepts-quiz-board";
import { QuestionModal } from "@/lib/adepts-question-modal";
import { GamePhaseNav } from "@/components/GamePhaseArrows";
import { QuizBoardReloadButton } from "@/components/QuizBoardReloadButton";
import { useRole } from "@/hooks/useRole";

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

export default function Home() {
  const { isSpectator } = useRole();
  const {
    state,
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
    setActiveQuizCard,
    patchActiveQuizCard,
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
    fetch("/api/track/adepts-game", { method: "POST" }).catch(() => {});
  }, []);

  const active = state.activeQuizCard;
  const openCard =
    active &&
    state.questions[active.themeIndex]?.[active.questionIndex] != null
      ? active
      : null;

  const handleQuestionClick = (themeIndex: number, questionIndex: number) => {
    if (isSpectator) return;
    setActiveQuizCard({ themeIndex, questionIndex, stage: "question" });
  };

  const closeQuestion = () => {
    setActiveQuizCard(null);
  };

  return (
    <div className="adepts-quiz-theme h-screen flex flex-col text-foreground overflow-hidden">
      {/* Hidden video preloader */}
      <div style={{ display: "none" }} aria-hidden="true">
        {videoUrls.map((url) => (
          <video key={url} src={url} preload="auto" muted />
        ))}
      </div>
      <header className="flex-shrink-0 w-full flex items-center gap-6 px-6 py-3 bg-card/80 border-b border-border backdrop-blur-sm">
        <h1 className="font-display text-2xl tracking-wider text-primary glow-text">
          САМЫЙ ДУШНЫЙ 3.0
        </h1>
        <span className="adepts-quiz-badge text-sm font-display tracking-wider text-primary/80 border border-primary/40 px-3 py-1.5 rounded">
          Adepts-game
        </span>
        <div className="ml-auto flex items-center gap-2">
          <QuizBoardReloadButton />
          {!isSpectator && <GamePhaseNav />}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#2ecc71" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 8px #2ecc71" }} />
            Онлайн
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 py-3">
        <QuizBoard
          board={1}
          themes={state.themes}
          questions={state.questions}
          onUpdateTheme={updateThemeName}
          onQuestionClick={handleQuestionClick}
          readonly={isSpectator}
        />
      </main>

      <div className="flex-shrink-0 w-full">
        <Scoreboard
          players={state.players}
          onUpdateName={updatePlayerName}
          onUpdateScore={updatePlayerScore}
          onResetScores={resetScores}
          readonly={isSpectator}
        />
      </div>

      {openCard && (
        <QuestionModal
          board={1}
          isOpen={true}
          themeName={state.themes[openCard.themeIndex]}
          points={(openCard.questionIndex + 1) * 100}
          question={state.questions[openCard.themeIndex][openCard.questionIndex]}
          players={state.players}
          quizStage={openCard.stage}
          onQuizStageChange={(s) => patchActiveQuizCard({ stage: s })}
          readonly={isSpectator}
          onClose={closeQuestion}
          onUpdate={(data) =>
            updateQuestion(openCard.themeIndex, openCard.questionIndex, data)
          }
          onAwardPoints={handleAwardPoints}
        />
      )}
    </div>
  );
}
