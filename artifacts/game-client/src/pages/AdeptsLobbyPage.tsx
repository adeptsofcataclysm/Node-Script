import { useEffect, useState } from "react";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";
import { useRole } from "@/hooks/useRole";
import { buildQuizBoardUrl } from "@/components/GamePhaseArrows";
import { emitLobbyQuizPresence, notifyQuizPlayerLeft } from "@/lib/trackQuizPlayerPresence";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { LobbyQuizPlayersTable, type LobbyQuizPollPlayerRow } from "@/components/LobbyQuizPlayersTable";
import { computeTopSeatNicks } from "@/lib/computeTopSeatNicks";
import { SEAT_ROSTER_SESSION_KEY } from "@/lib/quizLobbyClientAssignments";
import { ChatPanel } from "@/components/ChatPanel";
import {
  LOBBY_EMOJI_REVEAL_LINES,
  LOBBY_EMOJI_REVEAL_LINE_COUNT,
} from "@/lib/lobbyEmojiRevealLines";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function exitToLoginPage() {
  notifyQuizPlayerLeft();
  try {
    sessionStorage.removeItem(SEAT_ROSTER_SESSION_KEY);
  } catch {
    /* ignore */
  }
  localStorage.removeItem("player_seat_index");
  localStorage.removeItem("player_nick");
  localStorage.removeItem("player_role");
  window.location.replace(`${base}/`);
}

const lobbyExitButtonClass =
  "shrink-0 rounded-lg border border-border/80 bg-card/85 px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur-sm transition hover:border-primary/50 hover:text-foreground";

/** Лобби после логина: до старта игры темы квиза не показываются. */
export function AdeptsLobbyPage() {
  const { isHost } = useRole();
  const { lobbyState, emitStartGame, emitLobbyEmojiNext, emitLobbyEmojiPrev } = useQuizLobbyState();
  const [lobbyTablePlayers, setLobbyTablePlayers] = useState<LobbyQuizPollPlayerRow[]>([]);
  const [scoresByNick, setScoresByNick] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lobbyState?.gameStarted) {
      window.location.replace(buildQuizBoardUrl(lobbyState.boardIndex));
    }
  }, [lobbyState]);

  useEffect(() => {
    let detachSocket: (() => void) | undefined;

    const bind = () => {
      detachSocket?.();
      const s = getQuizNavSocket();
      const mySession = () => getAdeptsSessionId();
      const onRoster = (payload: unknown) => {
        const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        if (o["allSessions"] === true) {
          setLobbyTablePlayers([]);
          return;
        }
        const sid = o["sessionId"];
        if (sid != null && String(sid) !== mySession()) return;
        const pl = o["players"];
        setLobbyTablePlayers(Array.isArray(pl) ? (pl as LobbyQuizPollPlayerRow[]) : []);
      };
      const onConnect = () => {
        emitLobbyQuizPresence();
        s.emit("requestQuizLobbyRoster");
      };
      s.on("quizLobbyRoster", onRoster);
      s.on("connect", onConnect);
      emitLobbyQuizPresence();
      s.emit("requestQuizLobbyRoster");
      const id = setInterval(emitLobbyQuizPresence, 8000);
      detachSocket = () => {
        s.off("quizLobbyRoster", onRoster);
        s.off("connect", onConnect);
        clearInterval(id);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detachSocket?.();
      notifyQuizPlayerLeft();
    };
  }, []);

  if (lobbyState?.gameStarted) {
    return (
      <div className="adepts-quiz-theme flex min-h-screen items-center justify-center text-muted-foreground">
        Переход на доску…
      </div>
    );
  }

  if (lobbyState == null) {
    return (
      <div className="adepts-quiz-theme flex min-h-screen items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  const lineIdx = lobbyState.lobbyEmojiLineIndex;
  const emojiLobbyText =
    lineIdx >= 0 && lineIdx < LOBBY_EMOJI_REVEAL_LINE_COUNT
      ? LOBBY_EMOJI_REVEAL_LINES[lineIdx] ?? ""
      : "";
  const emojiAllShown = lineIdx >= LOBBY_EMOJI_REVEAL_LINE_COUNT - 1;
  const emojiAtStart = lineIdx < 0;

  /** Фиксированная область только между чатом и правым краем / сайдбаром — без перекрытия блоков. */
  const emojiLayerInsetClass = isHost
    ? "left-[calc(0.5rem+min(32vw,360px)+0.5rem)] right-[calc(0.5rem+min(420px,46vw)+0.5rem)] sm:left-[calc(0.75rem+min(32vw,360px)+0.75rem)] sm:right-[calc(0.75rem+min(420px,46vw)+0.75rem)] lg:right-[calc(1rem+min(420px,40vw)+1rem)]"
    : "left-[calc(0.5rem+min(32vw,360px)+0.5rem)] right-3 sm:left-[calc(0.75rem+min(32vw,360px)+0.75rem)] sm:right-4";

  return (
    <div className="adepts-quiz-theme h-screen flex flex-col overflow-hidden text-foreground">
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="font-display text-2xl tracking-wider text-primary glow-text">
            САМЫЙ ДУШНЫЙ 3.0
          </h1>
          <span className="rounded border border-primary/40 px-3 py-1.5 font-display text-sm tracking-wider text-primary/80">
            Лобби
          </span>
        </div>
        <button type="button" onClick={exitToLoginPage} className={lobbyExitButtonClass}>
          Выход
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ChatPanel className="mx-2 mb-2 mt-1 w-[min(32%,360px)] flex-shrink-0 sm:mx-3 sm:mb-3 sm:mt-2" />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Центр в полосе между чатом и сайдбаром; pointer-events-none — клики сквозь пустоту к чату/панели */}
          <div
            className={`pointer-events-none fixed bottom-0 top-16 z-[15] flex min-w-0 flex-col items-center justify-center gap-4 px-1 sm:gap-6 sm:px-2 ${emojiLayerInsetClass}`}
          >
            <div
              className="pointer-events-auto flex w-full max-w-[min(720px,100%)] min-h-[min(48vh,440px)] min-w-0 flex-col items-center justify-center overflow-x-hidden rounded-[1.125rem] border border-amber-400/45 bg-transparent px-3 py-6 text-center shadow-[0_0_20px_rgba(234,179,8,0.35),0_0_48px_rgba(250,204,21,0.18),inset_0_0_24px_rgba(234,179,8,0.06)] sm:min-h-[min(52vh,480px)] sm:rounded-[1.25rem] sm:px-6 sm:py-10 md:px-8"
              style={{
                fontFamily:
                  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif",
              }}
            >
              {emojiLobbyText ? (
                <p
                  className="w-full max-w-full whitespace-pre-wrap break-words text-center font-normal leading-[1.2] tracking-[0.02em]"
                  style={{
                    fontSize: "clamp(2rem, min(9vmin, 10vw), 5.25rem)",
                    wordSpacing: "0.12em",
                  }}
                >
                  {emojiLobbyText}
                </p>
              ) : (
                <p className="max-w-sm px-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Здесь появятся эмодзи, твоя задача разгадать какой босс зашифрован, ответ пиши в чат
                  слева.
                </p>
              )}
            </div>
            {isHost ? (
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <button
                  type="button"
                  disabled={emojiAtStart}
                  onClick={() => emitLobbyEmojiPrev()}
                  className="rounded-xl border-2 border-border/80 bg-card/60 px-8 py-3 font-display text-lg tracking-widest text-foreground/90 shadow-sm transition hover:border-primary/40 hover:bg-card disabled:pointer-events-none disabled:opacity-40"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={emojiAllShown}
                  onClick={() => emitLobbyEmojiNext()}
                  className="rounded-xl border-2 border-primary/60 bg-primary/15 px-10 py-3 font-display text-lg tracking-widest text-primary shadow-[0_0_28px_hsl(280_65%_50%/0.2)] transition hover:border-primary hover:bg-primary/25 disabled:pointer-events-none disabled:opacity-40"
                >
                  Дальше
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden px-2 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-1 lg:pr-4">
            <div className="min-h-0 min-w-0 flex-1" />
            {isHost ? (
              <aside className="flex min-h-0 w-fit max-w-[min(420px,46vw)] shrink-0 flex-col self-stretch overflow-hidden pt-1 lg:max-w-[min(420px,40vw)]">
                <LobbyQuizPlayersTable
                  variant="sidebar"
                  className="h-full min-h-0 w-fit max-w-full"
                  onStartGame={() => emitStartGame(computeTopSeatNicks(lobbyTablePlayers, scoresByNick))}
                  players={lobbyTablePlayers}
                  scoresByNick={scoresByNick}
                  onScoresByNickChange={setScoresByNick}
                />
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
