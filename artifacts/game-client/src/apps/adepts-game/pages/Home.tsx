import { useEffect, useMemo, useRef, useState } from "react";
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
import { AdeptsCreditsRollOverlay } from "@/components/AdeptsCreditsRollOverlay";
import { SuperGameTttPanel } from "@/components/SuperGameTttPanel";
import { Button } from "@/components/ui/button";
import { getAdeptsCommandSocket } from "@/lib/adeptsCommandSocket";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

/** Вопрос 400 = индекс 3. Бонус дед-слеша: тема «Маунты» по названию или любой dedFly в каталоге. */
function shouldEmitDedFlyDonationBonus(
  themeName: string | undefined,
  questionIndex: number,
  splashVariant: string | undefined,
): boolean {
  if (questionIndex !== 3) return false;
  if (splashVariant === "dedFly") return true;
  const n = String(themeName ?? "")
    .trim()
    .toLowerCase();
  return n.includes("маунт") || n.includes("mount");
}

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

const BADGE_LABEL: Record<AdeptsBoardId, string> = {
  1: "Квиз-доска 1",
  2: "Квиз-доска 2",
  3: "Квиз-доска 3",
  4: "СУПЕР ИГРА!",
};

/** Фон при переходе супер-игры на крестики-нолики (один раз за появление поля). */
const SUPER_GAME_TTT_BGM = "/super-game-pump-it.mp3";

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
    setCreditsRoll,
    emitSuperTttPick,
    emitSuperTttResetBoard,
    emitCloseSuperGameCard,
  } = useGameState(boardId);

  const superTttBgmStartedRef = useRef(false);
  const superTttBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const stopBgm = () => {
      const el = superTttBgmAudioRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
        superTttBgmAudioRef.current = null;
      }
    };

    if (boardId !== 4) {
      superTttBgmStartedRef.current = false;
      stopBgm();
      return;
    }
    if (state.superTttWinner) {
      stopBgm();
      return;
    }
    if (!state.superTtt) {
      superTttBgmStartedRef.current = false;
      stopBgm();
      return;
    }
    if (superTttBgmStartedRef.current) return;
    superTttBgmStartedRef.current = true;
    const audio = new Audio(resolveUrl(SUPER_GAME_TTT_BGM));
    audio.volume = 0.17;
    audio.loop = false;
    superTttBgmAudioRef.current = audio;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
      if (superTttBgmAudioRef.current === audio) superTttBgmAudioRef.current = null;
    };
  }, [boardId, Boolean(state.superTtt), state.superTttWinner?.atMs, state.superTttWinner?.nick]);

  const [, setWinnerTick] = useState(0);
  useEffect(() => {
    const w = state.superTttWinner;
    if (!w || typeof w.atMs !== "number") return;
    const left = Math.max(0, w.atMs + 5000 - Date.now());
    if (left <= 0) return;
    const t = window.setInterval(() => setWinnerTick((n) => n + 1), 200);
    const done = window.setTimeout(() => {
      clearInterval(t);
      setWinnerTick((n) => n + 1);
    }, left);
    return () => {
      clearInterval(t);
      clearTimeout(done);
    };
  }, [state.superTttWinner?.atMs, state.superTttWinner?.nick]);

  const superWinnerOverlay =
    boardId === 4 &&
    state.superTttWinner &&
    Date.now() - state.superTttWinner.atMs < 5000 ? (
      <div
        className="pointer-events-none fixed inset-0 z-[190] flex items-center justify-center bg-black/50 p-4"
        aria-live="polite"
      >
        <div
          className="max-w-[min(96vw,520px)] rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-950/95 to-zinc-950/95 px-6 py-8 text-center shadow-[0_0_60px_hsla(43,96%,56%,0.35)]"
          style={{ fontFamily: "WarCraft, sans-serif" }}
        >
          <p className="text-balance text-xl uppercase leading-snug tracking-wide text-amber-100 sm:text-2xl">
            ПОЗДРАВЛЯЕМ!{" "}
            <span className="text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
              {state.superTttWinner.nick}
            </span>{" "}
            САМЫЙ ДУШНЫЙ!!!
          </p>
        </div>
      </div>
    ) : null;

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

  const canCloseSuperGameCard =
    boardId === 4 &&
    openCard != null &&
    (isHost ||
      (!isSpectator && seatIndex >= 0 && seatIndex <= 4 && seatIndex === state.currentTurnSeat));

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

  const showDonationsTable =
    boardId === 3 && state.hideDonationsTableOnBoard3 !== true;
  /** Chat | board | donations (or empty rail same width as chat) so the board stays viewport-centered on every round. */
  const threeColGridClass =
    "grid min-h-0 flex-1 grid-cols-[minmax(0,15%)_minmax(0,1fr)_minmax(0,15%)] gap-2";

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="adepts-quiz-badge text-sm font-display tracking-wider text-primary/80 border border-primary/40 px-3 py-1.5 rounded">
            {BADGE_LABEL[boardId]}
          </span>
          {boardId === 4 && isHost ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-display text-xs uppercase tracking-wider border-primary/50 text-primary/90 hover:bg-primary/10"
              onClick={() => setCreditsRoll(true)}
            >
              Титры
            </Button>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <QuizBoardReloadButton />
          {isHost && <GamePhaseNav />}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#2ecc71" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 8px #2ecc71" }} />
            Онлайн
          </div>
        </div>
      </header>

      <div className={threeColGridClass}>
        <aside className="flex min-h-0 min-w-0 flex-col p-2">
          <ChatPanel className="min-h-0 w-full flex-1" />
        </aside>
        <main className="flex h-full min-h-0 min-w-0 flex-col py-3">
          <div className="adepts-quiz-board-scroll flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center overflow-y-auto overflow-x-hidden">
            {boardId !== 4 || !state.superTtt ? (
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
                superGameActiveCard={boardId === 4 ? openCard : null}
                superGameOpenQuestion={boardId === 4 ? openQuestion : null}
                canCloseSuperGameCard={canCloseSuperGameCard}
                onCloseSuperGameCard={() => {
                  if (!openCard || boardId !== 4) return;
                  emitCloseSuperGameCard(openCard.themeIndex, openCard.questionIndex);
                }}
              />
            ) : null}
            {boardId === 4 && state.superTtt ? (
              <SuperGameTttPanel
                players={state.players}
                superTtt={state.superTtt}
                viewerSeatIndex={seatIndex}
                isSpectator={isSpectator}
                isHost={isHost}
                onCellPick={(cell) => emitSuperTttPick(cell)}
                onResetBoard={isHost ? emitSuperTttResetBoard : undefined}
              />
            ) : null}
          </div>
        </main>
        <aside
          className="flex min-h-0 min-w-0 flex-col p-2"
          aria-hidden={!showDonationsTable}
        >
          {showDonationsTable ? (
            <DonationsTable donationLog={state.donationLog} />
          ) : (
            <div className="min-h-0 flex-1" aria-hidden />
          )}
        </aside>
      </div>

      <div className="w-full min-w-0 shrink-0">
        <Scoreboard
          players={state.players}
          onUpdateName={updatePlayerName}
          onUpdateScore={updatePlayerScore}
          onResetScores={resetScores}
          readonly={!isHost}
          currentTurnSeat={state.currentTurnSeat}
        />
      </div>

      {openCard && boardId !== 4 && (
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
          onDedFlyExitStart={() => {
            patchActiveQuizCard({ splashDedFlyExitStarted: true });
            if (!isHost || !openCard) return;
            const qMeta = state.questions[openCard.themeIndex]?.[openCard.questionIndex];
            if (
              shouldEmitDedFlyDonationBonus(
                state.themes[openCard.themeIndex],
                openCard.questionIndex,
                qMeta?.splashVariant,
              )
            ) {
              queueMicrotask(() => {
                getAdeptsCommandSocket().emit("command", {
                  type: "hostMounts400DedDonationBonus",
                  themeIndex: openCard.themeIndex,
                  questionIndex: openCard.questionIndex,
                });
              });
            }
          }}
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

      {(boardId === 3 || boardId === 4) && state.creditsRollActive === true ? (
        <AdeptsCreditsRollOverlay
          open
          startedAt={state.creditsRollStartedAt}
          isHost={isHost}
          onHostClose={() => setCreditsRoll(false)}
        />
      ) : null}

      {superWinnerOverlay}
    </div>
  );
}
