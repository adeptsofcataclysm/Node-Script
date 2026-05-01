import { useEffect } from "react";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";
import {
  QUIZ_ADEPTS_WHEEL_RETURN_KEY,
  QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG,
  buildQuizAdeptsWheelSpinUrl,
  buildQuizAdeptsWheelWatchUrl,
  clientCanSpinAdeptsWheel,
} from "@/lib/quizAdeptsWheelClient";

type OpenedPayload = { returnHref?: unknown; currentTurnSeat?: unknown };

function normalizeOpenedPayload(raw: unknown): { returnHref: string; currentTurnSeat: number } | null {
  const po = raw && typeof raw === "object" ? (raw as OpenedPayload) : {};
  const href = po.returnHref;
  if (typeof href !== "string" || href.length === 0 || href.length > 2048) return null;
  const rawSeat = po.currentTurnSeat;
  const n = typeof rawSeat === "number" ? rawSeat : Number(rawSeat);
  const currentTurnSeat =
    Number.isInteger(n) && n >= 0 && n <= 4 ? n : 0;
  return { returnHref: href, currentTurnSeat };
}

/** Синхронный переход на колесо / возврат на доску по событиям ведущего (`/quiz-nav`). */
export function QuizAdeptsWheelSync() {
  useEffect(() => {
    const s = getQuizNavSocket();

    const onOpened = (raw: unknown) => {
      const parsed = normalizeOpenedPayload(raw);
      if (!parsed) return;
      try {
        sessionStorage.setItem(QUIZ_ADEPTS_WHEEL_RETURN_KEY, parsed.returnHref);
      } catch {
        /* ignore */
      }
      const target = clientCanSpinAdeptsWheel(parsed.currentTurnSeat)
        ? buildQuizAdeptsWheelSpinUrl()
        : buildQuizAdeptsWheelWatchUrl();
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
          href = sessionStorage.getItem(QUIZ_ADEPTS_WHEEL_RETURN_KEY);
        } catch {
          href = null;
        }
      }
      const fallback = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/adepts-game/`;
      try {
        sessionStorage.setItem(QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG, "1");
      } catch {
        /* ignore */
      }
      window.location.assign(href || fallback);
    };

    s.on("adeptsWheelOpened", onOpened);
    s.on("adeptsWheelReturn", onReturn);
    return () => {
      s.off("adeptsWheelOpened", onOpened);
      s.off("adeptsWheelReturn", onReturn);
    };
  }, []);

  return null;
}
