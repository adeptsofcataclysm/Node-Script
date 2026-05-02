import { useEffect, useState } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import {
  parsePandoraLottoPublicState,
  type PandoraLottoPublicState,
} from "@/lib/pandoraLottoPublicState";

/** Снимок лото с `/quiz-nav` для оверлея на квиз-доске и страницы `/pandora-lotto`. */
export function usePandoraLottoPublicViewer(): PandoraLottoPublicState | null {
  const [snapshot, setSnapshot] = useState<PandoraLottoPublicState | null>(null);

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();
      const requestState = () => {
        s.emit("requestPandoraLottoState");
      };
      const onState = (raw: unknown) => {
        const p = parsePandoraLottoPublicState(raw);
        if (p) setSnapshot(p);
      };
      const onReturn = () => {
        setSnapshot(null);
      };
      const onConnect = () => {
        requestState();
      };
      s.on("pandoraLottoPublicState", onState);
      s.on("pandoraLottoReturn", onReturn);
      s.on("connect", onConnect);
      if (s.connected) requestState();
      detach = () => {
        s.off("pandoraLottoPublicState", onState);
        s.off("pandoraLottoReturn", onReturn);
        s.off("connect", onConnect);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  return snapshot;
}
