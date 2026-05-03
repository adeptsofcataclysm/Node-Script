import { useEffect } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import {
  QUIZ_PANDORA_LOTTO_POST_URL_KEY,
  clientJoinsPandoraRouletteAsPlayer,
  getPandoraLottoPostUrl,
} from "@/lib/quizPandoraRouletteClient";
import { buildQuizBoardUrl, getQuizBoardPhaseIndexForPathname } from "@/components/GamePhaseArrows";
import { getAdeptsSessionId, setAdeptsSessionId } from "@/lib/adeptsSessionId";

/** Редирект на квиз-доску по `hostPandoraLottoOpen`; возврат на `/game`, `/spectate` или доску квиза. */
export function QuizPandoraLottoSync() {
  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();

      const onOpened = (raw?: unknown) => {
        const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        /** Реплей состояния (`requestPandoraLottoState`) не должен снова дергать навигацию. */
        if (o["broadcastSession"] !== true) return;
        try {
          sessionStorage.setItem(QUIZ_PANDORA_LOTTO_POST_URL_KEY, getPandoraLottoPostUrl());
        } catch {
          /* ignore */
        }
        const rawBi = o["boardIndex"];
        const bi = typeof rawBi === "number" ? rawBi : Number(rawBi);
        const safeBi = Number.isInteger(bi) && bi >= 0 && bi <= 4 ? bi : 0;
        const sessionId = getAdeptsSessionId();
        setAdeptsSessionId(sessionId);
        const quizHref = buildQuizBoardUrl(safeBi);
        const sep = quizHref.includes("?") ? "&" : "?";
        window.location.assign(`${quizHref}${sep}sessionId=${encodeURIComponent(sessionId)}`);
      };

      const onReturn = (payload?: unknown) => {
        const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        if (o["toQuizBoard"] === true) {
          const raw = o["boardIndex"];
          const bi = typeof raw === "number" ? raw : Number(raw);
          const safeBi = Number.isInteger(bi) && bi >= 0 && bi <= 4 ? bi : 0;
          try {
            sessionStorage.removeItem(QUIZ_PANDORA_LOTTO_POST_URL_KEY);
          } catch {
            /* ignore */
          }
          try {
            const cur = getQuizBoardPhaseIndexForPathname(window.location.pathname);
            if (cur === safeBi && window.location.pathname.includes("adepts-game")) return;
          } catch {
            /* ignore */
          }
          window.location.assign(buildQuizBoardUrl(safeBi));
          return;
        }

        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const sessionId = getAdeptsSessionId();
        let href: string | null = null;
        try {
          href = sessionStorage.getItem(QUIZ_PANDORA_LOTTO_POST_URL_KEY);
          sessionStorage.removeItem(QUIZ_PANDORA_LOTTO_POST_URL_KEY);
        } catch {
          href = null;
        }
        const asPlayer = clientJoinsPandoraRouletteAsPlayer();
        const fallback = asPlayer
          ? `${base}/game?sessionId=${encodeURIComponent(sessionId)}`
          : `${base}/spectate?sessionId=${encodeURIComponent(sessionId)}`;
        window.location.assign(href && href.length > 0 ? href : fallback);
      };

      s.on("pandoraLottoOpened", onOpened);
      s.on("pandoraLottoReturn", onReturn);
      detach = () => {
        s.off("pandoraLottoOpened", onOpened);
        s.off("pandoraLottoReturn", onReturn);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  return null;
}
