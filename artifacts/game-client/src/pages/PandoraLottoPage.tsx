import { useEffect, useMemo } from "react";
import { LottoModal } from "@/components/LottoModal";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { usePandoraLottoPublicViewer } from "@/hooks/usePandoraLottoPublicViewer";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";
import { useRole } from "@/hooks/useRole";
import { useSpectatorSocket } from "@/hooks/useSpectatorSocket";
import { setAdeptsSessionId } from "@/lib/adeptsSessionId";

const BG_URL = "url('/pandora-bg.png')";

/** Общий экран «Барабан Лото» после команды ведущего: ведущий заполняет список, остальные ждут. */
export function PandoraLottoPage() {
  const { isHost } = useRole();
  const { playerNames } = useSpectatorSocket();
  const { lobbyState } = useQuizLobbyState();

  /**
   * Не в автосписок лото: ведущий, места квиза с сервера (`seatPlayerNicks` после startGame),
   * плюс имена с сокета рулетки (на случай расхождения с ростером).
   */
  const lottoAutoExcludeNicks = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (raw: string | undefined) => {
      const t = raw?.trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    };
    if (isHost) push(localStorage.getItem("player_nick") ?? undefined);
    for (const n of lobbyState?.seatPlayerNicks ?? []) push(n);
    for (let i = 0; i < 5; i += 1) push(playerNames[String(i)]);
    return out;
  }, [isHost, lobbyState?.seatPlayerNicks, playerNames]);
  const lottoViewerSnapshot = usePandoraLottoPublicViewer();

  useEffect(() => {
    try {
      const u = new URLSearchParams(window.location.search).get("sessionId");
      if (u?.trim()) setAdeptsSessionId(u.trim());
    } catch {
      /* ignore */
    }
    getQuizNavSocket().emit("requestPandoraLottoState");
  }, []);

  const closeLottoSession = () => {
    getQuizNavSocket().emit("hostPandoraLottoClose");
  };

  const confirmReplace = (winnerNick: string) => {
    const nick = winnerNick.trim().slice(0, 64);
    if (!nick) return;
    getQuizNavSocket().emit("hostPandoraLottoConfirmReplace", { winnerNick: nick });
  };

  return (
    <div className="game-root relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: BG_URL,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.22) contrast(1.15)",
        }}
      />
      <img src="/my-image.png" alt="" className="corner-logo" />

      {isHost ? (
        <LottoModal
          onClose={closeLottoSession}
          onConfirm={confirmReplace}
          autoSpectatorExcludeNicks={lottoAutoExcludeNicks}
        />

      ) : (
        <LottoModal
          readOnly
          snapshot={lottoViewerSnapshot}
          onClose={() => {}}
          onConfirm={(_winnerNick: string) => {
            /* только ведущий шлёт hostPandoraLottoConfirmReplace */
          }}
        />
      )}
    </div>
  );
}
