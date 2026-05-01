/** Клиентский запасной ключ, если сервер уже очистил returnHref. */
export const QUIZ_ADEPTS_WHEEL_RETURN_KEY = "adepts_quiz_wheel_return_href";

/** После «Самый Душный» — при следующей загрузке доски закрыть открытую карточку и синхронизировать. */
export const QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG = "adepts_quiz_close_card_after_wheel_return";

export function consumeAdeptsWheelReturnCloseQuizCardFlag(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    if (sessionStorage.getItem(QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG) !== "1") return false;
    sessionStorage.removeItem(QUIZ_ADEPTS_WHEEL_CLOSE_CARD_FLAG);
    return true;
  } catch {
    return false;
  }
}

export function quizAdeptsWheelBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function buildQuizAdeptsWheelSpinUrl(): string {
  return `${quizAdeptsWheelBasePath()}/adepts/spin`;
}

export function buildQuizAdeptsWheelWatchUrl(): string {
  return `${quizAdeptsWheelBasePath()}/adepts/watch`;
}

export function clientCanSpinAdeptsWheel(currentTurnSeat: number): boolean {
  const role = localStorage.getItem("player_role");
  const isHost = role === "host";
  const isSpectator = role === "spectator";
  const seatRaw = Number(localStorage.getItem("player_seat_index"));
  const seatIndex =
    Number.isInteger(seatRaw) && seatRaw >= 0 && seatRaw <= 4 ? seatRaw : -1;
  const turn = Number.isInteger(currentTurnSeat)
    ? ((Number(currentTurnSeat) % 5) + 5) % 5
    : 0;
  return isHost || (!isSpectator && seatIndex >= 0 && seatIndex === turn);
}
