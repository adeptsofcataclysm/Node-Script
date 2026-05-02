import { useEffect, useMemo } from "react";
import type { AdeptsBoardId, Question } from "@/lib/adepts-quiz-types";
import { useGameState } from "../hooks/useGameState";
import { Scoreboard } from "@/lib/adepts-scoreboard";
import { QuizBoard } from "@/lib/adepts-quiz-board";
import { isAdeptsWheelFaceDownCell } from "@/lib/isAdeptsWheelFaceDownCell";
import { QuestionModal } from "@/lib/adepts-question-modal";
import { GamePhaseNav } from "@/components/GamePhaseArrows";
import { QuizBoardReloadButton } from "@/components/QuizBoardReloadButton";
import { useRole } from "@/hooks/useRole";
import { ChatPanel } from "@/components/ChatPanel";
import { QuizBoardPandoraLottoOverlay } from "@/components/QuizBoardPandoraLottoOverlay";
import { DonationsTable } from "@/components/DonationsTable";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

const BADGE_LABEL: Record<AdeptsBoardId, string> = {
  1: "Квиз-доска 1",
  2: "Квиз-доска 2",
  3: "Квиз-доска 3",
};

/** Server opened a cell that is not yet in local `questions` (e.g. catalog/API drift) — still show the shell. */
const FALLBACK_OPEN_QUESTION: Question = {
  text: "",
  questionUrl: "",
  answerText: "",
  answerUrl: "",
  used: false,
};

export default function Home({ boardId }: { boardId: AdeptsBoardId }) {
  const { isHost, isSpectator } = useRole();
  const {
    catalogReady,
    state,
    trackKey,
    updatePlayerName,
    updatePlayerScore,
    updateThemeName,
    updateQuestion,
    resetScores,
    setActiveQuizCard,
    setCurrentTurnSeat,
    patchActiveQuizCard,
    setQuizBoardHoverCell,
    emitPickCell,
  } = useGameState(boardId);

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
    fetch(`/api/track/${trackKey}`, { method: "POST" }).catch(() => {});
  }, [trackKey]);

  /** Не блокировать UI целиком: `sync` может прийти с `activeQuizCard` до завершения `fetchAdeptsQuizBoard` — иначе модалка не монтируется (часто у ведущего после pick). */
  if (!catalogReady && state.activeQuizCard == null) {
    return (
      <div className="adepts-quiz-theme flex h-screen items-center justify-center text-muted-foreground">
        Загрузка доски…
      </div>
    );
  }

  const active = state.activeQuizCard;
  const openCard =
    active &&
    Number.isInteger(active.themeIndex) &&
    Number.isInteger(active.questionIndex) &&
    active.themeIndex >= 0 &&
    active.questionIndex >= 0
      ? active
      : null;

  const seatRaw = Number(localStorage.getItem("player_seat_index"));
  const seatIndex =
    Number.isInteger(seatRaw) && seatRaw >= 0 && seatRaw <= 4 ? seatRaw : -1;
  const canOpenCards =
    isHost || (!isSpectator && seatIndex === state.currentTurnSeat);
  const blockTurnPlayerFromPlayedOrFaceDownCells =
    !isHost && !isSpectator && seatIndex >= 0 && seatIndex <= 4 && seatIndex === state.currentTurnSeat;

  const canDismissRaccoonSplash =
    isHost ||
    (!isSpectator && seatIndex >= 0 && seatIndex <= 4 && seatIndex === state.currentTurnSeat);

  const openQuestion =
    openCard != null
      ? (state.questions[openCard.themeIndex]?.[openCard.questionIndex] ?? FALLBACK_OPEN_QUESTION)
      : null;
  const canDismissSplash =
    openQuestion?.splashDismissHostOnly === true ? isHost : canDismissRaccoonSplash;

  const handleQuestionClick = (themeIndex: number, questionIndex: number) => {
    if (!canOpenCards) return;
    const q = state.questions[themeIndex]?.[questionIndex];
    if (
      q &&
      blockTurnPlayerFromPlayedOrFaceDownCells &&
      (q.used || isAdeptsWheelFaceDownCell(q))
    )
      return;
    setQuizBoardHoverCell(null);
    emitPickCell(
      themeIndex,
      questionIndex,
      isHost ? { turnSeat: state.currentTurnSeat } : undefined
    );
  };

  const closeQuestion = () => {
    setQuizBoardHoverCell(null);
    setActiveQuizCard(null);
  };

  return (
    <div className="adepts-quiz-theme h-screen flex flex-col text-foreground overflow-hidden">
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
          {BADGE_LABEL[boardId]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <QuizBoardReloadButton />
          {isHost && <GamePhaseNav />}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#2ecc71" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 8px #2ecc71" }} />
            Онлайн
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,15%)_minmax(0,1fr)_minmax(0,15%)]">
        <aside className="flex min-h-0 min-w-0 flex-col p-2">
          <ChatPanel className="min-h-0 w-full flex-1" />
        </aside>
        <main className="flex min-h-0 min-w-0 flex-col py-3">
          <div className="mx-auto h-full w-full max-w-7xl min-h-0 px-2">
            <QuizBoard
              board={boardId}
              themes={state.themes}
              questions={state.questions}
              onUpdateTheme={updateThemeName}
              onQuestionClick={handleQuestionClick}
              readonly={!canOpenCards}
              themeEditReadonly={!isHost}
              blockTurnPlayerFromPlayedOrFaceDownCells={blockTurnPlayerFromPlayedOrFaceDownCells}
              hoverCell={state.quizBoardHoverCell ?? null}
              canSyncBoardHover={canOpenCards}
              onBoardHoverCellChange={setQuizBoardHoverCell}
            />
          </div>
        </main>
        <aside className="flex min-h-0 min-w-0 flex-col items-end p-2 pt-3">
          <DonationsTable donationLog={state.donationLog} />
        </aside>
      </div>

      <div className="grid shrink-0 grid-cols-[minmax(0,15%)_minmax(0,1fr)_minmax(0,15%)]">
        <div className="min-w-0" aria-hidden="true" />
        <div className="min-w-0">
          <Scoreboard
            players={state.players}
            onUpdateName={updatePlayerName}
            onUpdateScore={updatePlayerScore}
            onResetScores={resetScores}
            readonly={!isHost}
            currentTurnSeat={state.currentTurnSeat}
          />
        </div>
        <div className="min-w-0" aria-hidden="true" />
      </div>

      {openCard && (
        <QuestionModal
          key={`${openCard.themeIndex}-${openCard.questionIndex}`}
          board={boardId}
          isOpen={true}
          themeName={state.themes[openCard.themeIndex] ?? ""}
          points={(openCard.questionIndex + 1) * 100}
          question={openQuestion ?? FALLBACK_OPEN_QUESTION}
          players={state.players}
          quizStage={openCard.stage}
          onQuizStageChange={(s) => patchActiveQuizCard({ stage: s })}
          onPassTurn={() => {
            const seat = state.currentTurnSeat;
            const pts = (openCard.questionIndex + 1) * 100;
            const prev = state.players[seat]?.score ?? 0;
            updatePlayerScore(seat, prev - pts);
            setCurrentTurnSeat((state.currentTurnSeat + 1) % 5);
          }}
          onPassTurnNext={() => setCurrentTurnSeat((state.currentTurnSeat + 1) % 5)}
          currentTurnSeat={state.currentTurnSeat}
          viewerSeatIndex={isHost || isSpectator || seatIndex < 0 ? null : seatIndex}
          allowRaccoonSplashSeatPass={openCard.splashSeatPassUsed !== true}
          splashDismissed={openCard.splashDismissed === true}
          splashDedFlyExitStarted={openCard.splashDedFlyExitStarted === true}
          onDedFlyExitStart={() => patchActiveQuizCard({ splashDedFlyExitStarted: true })}
          canFinalizeDedFlySplashDismiss={isHost}
          canDismissRaccoonSplash={canDismissSplash}
          onDismissSplash={() =>
            patchActiveQuizCard({ splashDismissed: true, splashDedFlyExitStarted: false })
          }
          splashPassHoverSeat={
            typeof openCard.splashPassHoverSeat === "number" &&
            Number.isInteger(openCard.splashPassHoverSeat)
              ? openCard.splashPassHoverSeat
              : null
          }
          onSplashPassHoverSeatChange={(seat) =>
            patchActiveQuizCard({ splashPassHoverSeat: seat })
          }
          onPassTurnToSeat={(target) => {
            patchActiveQuizCard(
              { splashSeatPassUsed: true, splashPassHoverSeat: null },
              { nextTurnSeat: target },
            );
          }}
          readonly={!isHost}
          onClose={closeQuestion}
          onUpdate={(data) =>
            updateQuestion(openCard.themeIndex, openCard.questionIndex, data)
          }
          onAwardPoints={handleAwardPoints}
          onHostBroadcastAdeptsWheel={
            isHost
              ? (payload) => {
                  getQuizNavSocket().emit("hostAdeptsWheelOpen", payload);
                  // Mark the question as used so the cell is grayed-out when returning from the wheel.
                  updateQuestion(openCard.themeIndex, openCard.questionIndex, { used: true });
                  // Close the card on all clients before the wheel page opens.
                  closeQuestion();
                }
              : undefined
          }
          onHostBroadcastPandoraRoulette={
            isHost
              ? () => {
                  const seat =
                    ((Number(state.currentTurnSeat) % 5) + 5) % 5;
                  getQuizNavSocket().emit("hostPandoraRouletteOpen", {
                    returnHref: `${window.location.pathname}${window.location.search}${window.location.hash}`,
                    currentTurnSeat: seat,
                    playerNames: state.players.map((p) =>
                      String(p.name ?? "").trim().slice(0, 64),
                    ),
                  });
                  updateQuestion(openCard.themeIndex, openCard.questionIndex, {
                    used: true,
                  });
                  closeQuestion();
                }
              : undefined
          }
        />
      )}

      <QuizBoardPandoraLottoOverlay />
    </div>
  );
}
