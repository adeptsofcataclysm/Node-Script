import { useEffect } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import {
  QUIZ_PANDORA_FROM_QUIZ_KEY,
  QUIZ_PANDORA_PLAYER_NAMES_KEY,
  QUIZ_PANDORA_RETURN_KEY,
  clientJoinsPandoraRouletteAsPlayer,
} from "@/lib/quizPandoraRouletteClient";
import { getAdeptsSessionId, setAdeptsSessionId } from "@/lib/adeptsSessionId";

type OpenedPayload = {
  returnHref?: unknown;
  currentTurnSeat?: unknown;
  playerNames?: unknown;
};

function normalizeOpened(raw: unknown): {
  returnHref: string;
  currentTurnSeat: number;
  playerNames: string[];
} | null {
  const po = raw && typeof raw === "object" ? (raw as OpenedPayload) : {};
  const href = po.returnHref;
  if (typeof href !== "string" || href.length === 0 || href.length > 2048) return null;
  const rawSeat = po.currentTurnSeat;
  const n = typeof rawSeat === "number" ? rawSeat : Number(rawSeat);
  const currentTurnSeat =
    Number.isInteger(n) && n >= 0 && n <= 4 ? n : 0;
  const rawNames = po.playerNames;
  const playerNames = Array.isArray(rawNames)
    ? rawNames.map((x) => String(x ?? "").trim().slice(0, 64)).slice(0, 5)
    : [];
  while (playerNames.length < 5) playerNames.push("");
  return { returnHref: href, currentTurnSeat, playerNames };
}

/** Переход на `/game` или `/spectate` по команде ведущего (`/quiz-nav`), как колесо адептов. */
export function QuizPandoraRouletteSync() {
  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();

      const onOpened = (raw: unknown) => {
        try {
          const p = window.location.pathname.replace(/\/$/, "");
          if (p.endsWith("/pandora-lotto") || p.includes("/pandora-lotto/")) return;
        } catch {
          /* ignore */
        }
        const po = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        /**
         * Реплей `requestPandoraRouletteState`: если флаг на сервере устарел после возврата с рулетки,
         * не уводить ведущего/зрителя с квиз-доски повторно на `/spectate`.
         * Игрок за столом (место 0–4) при активной рулетке после перезагрузки/реконнекта страницы
         * как раз должен попасть на `/game` — для него этот ранний выход не применяем.
         */
        if (po["stateReplay"] === true) {
          try {
            if (
              window.location.pathname.includes("/adepts-game") &&
              !clientJoinsPandoraRouletteAsPlayer()
            ) {
              return;
            }
          } catch {
            /* ignore */
          }
        }
        const parsed = normalizeOpened(raw);
        if (!parsed) return;
        try {
          sessionStorage.setItem(QUIZ_PANDORA_RETURN_KEY, parsed.returnHref);
          sessionStorage.setItem(
            QUIZ_PANDORA_PLAYER_NAMES_KEY,
            JSON.stringify(parsed.playerNames),
          );
          sessionStorage.setItem(QUIZ_PANDORA_FROM_QUIZ_KEY, "1");
        } catch {
          /* ignore */
        }

        if (clientJoinsPandoraRouletteAsPlayer()) {
          const seatRaw = Number(localStorage.getItem("player_seat_index"));
          const seat =
            Number.isInteger(seatRaw) && seatRaw >= 0 && seatRaw <= 4 ? seatRaw : -1;
          const name = seat >= 0 ? parsed.playerNames[seat] : "";
          if (name && String(name).trim()) {
            try {
              sessionStorage.setItem("pandora_player_name", String(name).trim().slice(0, 20));
            } catch {
              /* ignore */
            }
          }
        }

        const sessionId = getAdeptsSessionId();
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const asPlayer = clientJoinsPandoraRouletteAsPlayer();
        const targetPath = asPlayer ? `${base}/game` : `${base}/spectate`;
        setAdeptsSessionId(sessionId);
        const sep = targetPath.includes("?") ? "&" : "?";
        const target = `${targetPath}${sep}sessionId=${encodeURIComponent(sessionId)}`;
        window.location.assign(target);
      };

      const onReturn = (raw: unknown) => {
        const po = raw && typeof raw === "object" ? (raw as { returnHref?: unknown }) : {};
        let href =
          typeof po.returnHref === "string" && po.returnHref.length > 0
            ? po.returnHref
            : null;
        if (!href) {
          try {
            href = sessionStorage.getItem(QUIZ_PANDORA_RETURN_KEY);
          } catch {
            href = null;
          }
        }
        const fallback = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/adepts-game/`;
        try {
          sessionStorage.removeItem(QUIZ_PANDORA_FROM_QUIZ_KEY);
          sessionStorage.removeItem(QUIZ_PANDORA_PLAYER_NAMES_KEY);
        } catch {
          /* ignore */
        }
        window.location.assign(href || fallback);
      };

      s.on("pandoraRouletteOpened", onOpened);
      s.on("pandoraRouletteReturn", onReturn);
      detach = () => {
        s.off("pandoraRouletteOpened", onOpened);
        s.off("pandoraRouletteReturn", onReturn);
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
