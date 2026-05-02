import { useEffect, useMemo } from "react";
import { LottoModal } from "@/components/LottoModal";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import { usePandoraLottoPublicViewer } from "@/hooks/usePandoraLottoPublicViewer";
import { useRole } from "@/hooks/useRole";
import { useSpectatorSocket } from "@/hooks/useSpectatorSocket";
import { setAdeptsSessionId } from "@/lib/adeptsSessionId";

const BG_URL = "url('/pandora-bg.png')";

/** Общий экран «Барабан Лото» после команды ведущего: ведущий заполняет список, остальные ждут. */
export function PandoraLottoPage() {
  const { isHost } = useRole();
  const { rematch, playerNames } = useSpectatorSocket();

  /** Игроки за столом рулетки + ник ведущего — не в список лото из лобби. */
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
    for (let i = 0; i < 5; i += 1) push(playerNames[String(i)]);
    return out;
  }, [isHost, playerNames]);
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

  const confirmReplace = () => {
    rematch();
    window.setTimeout(() => closeLottoSession(), 200);
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
          onConfirm={() => {}}
        />
      )}
    </div>
  );
}
