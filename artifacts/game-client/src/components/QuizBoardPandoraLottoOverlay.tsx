import { useMemo } from "react";
import { LottoModal } from "@/components/LottoModal";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { usePandoraLottoPublicViewer } from "@/hooks/usePandoraLottoPublicViewer";
import { useQuizLobbyState } from "@/hooks/useQuizLobbyState";
import { useRole } from "@/hooks/useRole";

/**
 * Полноэкранное «Барабан Лото» поверх квиз-доски после `hostPandoraLottoOpen`
 * (все уже на `/adepts-game/…` по редиректу из `QuizPandoraLottoSync`).
 */
export function QuizBoardPandoraLottoOverlay() {
  const { isHost } = useRole();
  const { lobbyState } = useQuizLobbyState();
  const snapshot = usePandoraLottoPublicViewer();

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
    return out;
  }, [isHost, lobbyState?.seatPlayerNicks]);

  const closeLottoSession = () => {
    getQuizNavSocket().emit("hostPandoraLottoClose");
  };

  const confirmReplace = (winnerNick: string) => {
    const nick = winnerNick.trim().slice(0, 64);
    if (!nick) return;
    getQuizNavSocket().emit("hostPandoraLottoConfirmReplace", { winnerNick: nick });
  };

  if (snapshot === null) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      {isHost ? (
        <LottoModal
          onClose={closeLottoSession}
          onConfirm={confirmReplace}
          autoSpectatorExcludeNicks={lottoAutoExcludeNicks}
        />
      ) : (
        <LottoModal
          readOnly
          snapshot={snapshot}
          onClose={() => {}}
          onConfirm={(_winnerNick: string) => {}}
        />
      )}
    </div>
  );
}
