import { useEffect } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import {
  QUIZ_PANDORA_LOTTO_POST_URL_KEY,
  clientJoinsPandoraRouletteAsPlayer,
  getPandoraLottoPostUrl,
} from "@/lib/quizPandoraRouletteClient";
import { getAdeptsSessionId, setAdeptsSessionId } from "@/lib/adeptsSessionId";

function isOnPandoraLottoRoute(): boolean {
  try {
    const p = window.location.pathname.replace(/\/$/, "");
    return p.endsWith("/pandora-lotto") || p.includes("/pandora-lotto/");
  } catch {
    return false;
  }
}

/** Переход на `/pandora-lotto` по команде ведущего; возврат на `/game`, `/spectate` или доску квиза. */
export function QuizPandoraLottoSync() {
  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();

      const onOpened = () => {
        if (isOnPandoraLottoRoute()) return;
        try {
          sessionStorage.setItem(QUIZ_PANDORA_LOTTO_POST_URL_KEY, getPandoraLottoPostUrl());
        } catch {
          /* ignore */
        }
        const sessionId = getAdeptsSessionId();
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        setAdeptsSessionId(sessionId);
        const target = `${base}/pandora-lotto?sessionId=${encodeURIComponent(sessionId)}`;
        window.location.assign(target);
      };

      const onReturn = () => {
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
