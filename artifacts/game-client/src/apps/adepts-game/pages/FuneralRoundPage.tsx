import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameState } from "../hooks/useGameState";
import { Scoreboard } from "@/lib/adepts-scoreboard";
import { GamePhaseNav } from "@/components/GamePhaseArrows";
import { QuizBoardReloadButton } from "@/components/QuizBoardReloadButton";
import { useRole } from "@/hooks/useRole";
import { ChatPanel } from "@/components/ChatPanel";
import { QuizBoardPandoraLottoOverlay } from "@/components/QuizBoardPandoraLottoOverlay";
import { DonationsTable } from "@/components/DonationsTable";
import { FuneralDonationHat } from "@/components/FuneralDonationHat";
import { getAdeptsCommandSocket, readAdeptsPlayerSeatIndexForSocket } from "@/lib/adeptsCommandSocket";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

const BOARD_BG = "/funeral-board-bg.png";
const INTRO_VIDEO = "/funeral-intro.mp4";
const FUNERAL_BG_MUSIC = "/funeral-bg-music.mp3";
const FUNERAL_BG_MUSIC_VOLUME = 0.07;

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return import.meta.env.BASE_URL + url.replace(/^\//, "");
}

export default function FuneralRoundPage() {
  const { isHost, isSeatPlayer } = useRole();
  const {
    catalogReady,
    state,
    trackKey,
    updatePlayerName,
    updatePlayerScore,
    resetScores,
    submitPlayerDonation,
  } = useGameState(2);

  const playerSeat = readAdeptsPlayerSeatIndexForSocket();
  const myScore = state.players[playerSeat]?.score ?? 0;

  const [introDone, setIntroDone] = useState(false);
  /** Только после `onEnded` заставки — не при пропуске ведущим. */
  const [introPlayedThrough, setIntroPlayedThrough] = useState(false);

  useEffect(() => {
    fetch(`/api/track/${trackKey}`, { method: "POST" }).catch(() => {});
  }, [trackKey]);

  useEffect(() => {
    if (!introDone || !introPlayedThrough) return;
    const a = new Audio(resolveUrl(FUNERAL_BG_MUSIC));
    a.loop = true;
    a.volume = FUNERAL_BG_MUSIC_VOLUME;
    a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = "";
    };
  }, [introDone, introPlayedThrough]);

  /** Снова показывать таблицу пожертвований на 3-й квиз-доске после визита на похороны. */
  useEffect(() => {
    getAdeptsCommandSocket().emit("command", { type: "showDonationsTableOnBoard3" });
  }, []);

  const bgStyle = useMemo(
    () => ({
      backgroundImage: `url(${resolveUrl(BOARD_BG)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    []
  );

  const finishIntroAfterFullVideo = useCallback(() => {
    setIntroPlayedThrough(true);
    setIntroDone(true);
  }, []);

  const skipIntroAsHost = useCallback(() => {
    if (!isHost) return;
    setIntroDone(true);
  }, [isHost]);

  const onHostEndFuneral = useCallback(() => {
    getQuizNavSocket().emit("hostFuneralEnd");
  }, []);

  if (!catalogReady) {
    return (
      <div className="adepts-quiz-theme flex h-screen items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="adepts-quiz-theme h-screen flex flex-col text-foreground overflow-hidden">
      {!introDone ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black"
          role="presentation"
          onClick={skipIntroAsHost}
          onKeyDown={(e) => {
            if (!isHost) return;
            if (e.key === "Escape" || e.key === " ") {
              e.preventDefault();
              skipIntroAsHost();
            }
          }}
          tabIndex={isHost ? 0 : -1}
        >
          <video
            className="max-h-full max-w-full object-contain"
            src={resolveUrl(INTRO_VIDEO)}
            autoPlay
            playsInline
            controls={false}
            onEnded={finishIntroAfterFullVideo}
          />
          {isHost ? (
            <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/55">
              Нажмите в любое место, чтобы пропустить заставку
            </p>
          ) : null}
        </div>
      ) : null}

      <header className="relative z-[120] flex w-full flex-shrink-0 items-center gap-6 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm">
        <h1 className="font-display text-2xl tracking-wider text-primary glow-text">САМЫЙ ДУШНЫЙ 3.0</h1>
        <span className="adepts-quiz-badge rounded border border-primary/40 px-3 py-1.5 font-display text-sm tracking-wider text-primary/80">
          Похороны
        </span>
        <div className="ml-auto flex items-center gap-2">
          <QuizBoardReloadButton />
          {isHost && (
            <button
              type="button"
              onClick={onHostEndFuneral}
              className="rounded-md border border-amber-500/50 bg-amber-950/50 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.25)] transition hover:border-amber-400 hover:bg-amber-900/60"
            >
              Закончить похороны
            </button>
          )}
          {isHost && <GamePhaseNav />}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#2ecc71",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#2ecc71",
                boxShadow: "0 0 8px #2ecc71",
              }}
            />
            Онлайн
          </div>
        </div>
      </header>

      <div className="relative z-[110] grid min-h-0 flex-1 grid-cols-[minmax(0,15%)_minmax(0,1fr)_minmax(0,15%)]">
        <aside className="flex min-h-0 min-w-0 flex-col p-2">
          <ChatPanel className="min-h-0 w-full flex-1" />
        </aside>
        <main className="relative flex min-h-0 min-w-0 flex-col py-3">
          <div
            className="relative mx-auto h-full w-full max-w-7xl min-h-0 overflow-visible rounded-lg border border-white/10 px-2"
            aria-label="Сцена похорон"
          >
            <div className="absolute inset-0 rounded-lg" style={bgStyle} />
            {introDone ? (
              <FuneralDonationHat
                interactive={isSeatPlayer}
                playerScore={myScore}
                onSubmit={submitPlayerDonation}
              />
            ) : null}
          </div>
        </main>
        <aside className="flex min-h-0 min-w-0 flex-col p-2 pt-3">
          <DonationsTable donationLog={state.donationLog} />
        </aside>
      </div>

      <div className="relative z-[110] w-full min-w-0 shrink-0">
        <Scoreboard
          players={state.players}
          onUpdateName={updatePlayerName}
          onUpdateScore={updatePlayerScore}
          onResetScores={resetScores}
          readonly={!isHost}
          currentTurnSeat={state.currentTurnSeat}
        />
      </div>

      <QuizBoardPandoraLottoOverlay />
    </div>
  );
}
