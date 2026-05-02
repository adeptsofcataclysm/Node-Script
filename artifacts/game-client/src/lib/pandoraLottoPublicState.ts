/** Публичное состояние лото — рассылается всем с `/quiz-nav` для экрана наблюдателя. */
export type PandoraLottoPublicState = {
  phase: "setup" | "drum";
  names: string[];
  drumPhase: "spinning" | "rolling" | "revealed";
  drumKey: number;
  /** После «Остановить барабан» — общий индекс победителя для физики барабана */
  winnerIndex: number | null;
};

export const DEFAULT_PANDORA_LOTTO_PUBLIC: PandoraLottoPublicState = {
  phase: "setup",
  names: [],
  drumPhase: "spinning",
  drumKey: 0,
  winnerIndex: null,
};

export function parsePandoraLottoPublicState(raw: unknown): PandoraLottoPublicState | null {
  if (raw === null) return null;
  const po = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const phase = po.phase === "drum" ? "drum" : "setup";
  const rawNames = po.names;
  const names = Array.isArray(rawNames)
    ? rawNames.map((x) => String(x ?? "").trim().slice(0, 16)).filter(Boolean).slice(0, 12)
    : [];
  const dp = po.drumPhase;
  const drumPhase =
    dp === "rolling" || dp === "revealed" || dp === "spinning" ? dp : "spinning";
  const rawKey = po.drumKey;
  const kn = typeof rawKey === "number" ? rawKey : Number(rawKey);
  const drumKey = Number.isInteger(kn) && kn >= 0 && kn < 1_000_000 ? kn : 0;
  const wiRaw = po.winnerIndex;
  let winnerIndex: number | null = null;
  if (wiRaw !== null && wiRaw !== undefined && names.length > 0) {
    const n = typeof wiRaw === "number" ? wiRaw : Number(wiRaw);
    if (Number.isInteger(n) && n >= 0 && n < names.length) winnerIndex = n;
  }
  if (phase === "setup") {
    return { phase: "setup", names, drumPhase: "spinning", drumKey, winnerIndex: null };
  }
  let win = winnerIndex;
  if (drumPhase === "spinning") win = null;
  return { phase: "drum", names, drumPhase, drumKey, winnerIndex: win };
}
