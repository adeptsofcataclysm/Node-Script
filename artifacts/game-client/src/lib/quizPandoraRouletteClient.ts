import { getAdeptsSessionId } from "@/lib/adeptsSessionId";

/** После «Ящик Пандоры» с квиза — вернуться на сохранённый URL доски. */
export const QUIZ_PANDORA_RETURN_KEY = "adepts_quiz_pandora_return_href";

/** Имена мест 0–4 с доски для автоматического setName на `/game`. */
export const QUIZ_PANDORA_PLAYER_NAMES_KEY = "adepts_quiz_pandora_player_names";

/** Маркер: клиент пришёл с квиза в русскую рулетку. */
export const QUIZ_PANDORA_FROM_QUIZ_KEY = "adepts_quiz_pandora_from";

/** Куда вернуться после экрана «Барабан Лото» (игрок → `/game`, зритель/ведущий зритель → `/spectate`, доска квиза → текущий URL). */
export const QUIZ_PANDORA_LOTTO_POST_URL_KEY = "adepts_quiz_pandora_lotto_post_url";

export function peekFromQuizPandoraSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(QUIZ_PANDORA_FROM_QUIZ_KEY) === "1";
  } catch {
    return false;
  }
}

/** Ник места с доски квиза для автозахода на `/game`. */
export function getQuizPandoraNameForCurrentSeat(): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(QUIZ_PANDORA_PLAYER_NAMES_KEY);
    if (!raw) return "";
    const names = JSON.parse(raw) as unknown;
    if (!Array.isArray(names)) return "";
    const seatRaw = Number(localStorage.getItem("player_seat_index"));
    const seat =
      Number.isInteger(seatRaw) && seatRaw >= 0 && seatRaw <= 4 ? seatRaw : -1;
    if (seat < 0) return "";
    const n = names[seat];
    return typeof n === "string" ? n.trim().slice(0, 20) : "";
  } catch {
    return "";
  }
}

export function clientJoinsPandoraRouletteAsPlayer(): boolean {
  const role = localStorage.getItem("player_role")?.trim().toLowerCase() ?? "";
  if (role === "host" || role === "spectator") return false;
  const seatRaw = Number(localStorage.getItem("player_seat_index"));
  return Number.isInteger(seatRaw) && seatRaw >= 0 && seatRaw <= 4;
}

/** URL возврата к рулетке или доске — вызывать до перехода на `/pandora-lotto`. */
export function getPandoraLottoPostUrl(): string {
  const sessionId = getAdeptsSessionId();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  try {
    if (window.location.pathname.includes("/adepts-game")) {
      return `${window.location.pathname}${window.location.search}`;
    }
  } catch {
    /* ignore */
  }
  const asPlayer = clientJoinsPandoraRouletteAsPlayer();
  const gamePath = asPlayer ? `${base}/game` : `${base}/spectate`;
  const sep = gamePath.includes("?") ? "&" : "?";
  return `${gamePath}${sep}sessionId=${encodeURIComponent(sessionId)}`;
}
