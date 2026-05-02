/** Строка таблицы: один игрок (место); повторные пожертвования суммируются по `seatIndex`. */
export type DonationLogEntry = {
  id: string;
  name: string;
  amount: number;
  /** 0–4; если нет (старые данные) — строка могла быть объединена только по имени. */
  seatIndex?: number;
};

export function normalizeDonationLog(raw: unknown): DonationLogEntry[] | null {
  if (!Array.isArray(raw)) return null;
  type PartialEntry = { id: string; name: string; amount: number; seatIndex?: number };
  const parsed: PartialEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 64) : "";
    const amtRaw = o.amount;
    const amt = typeof amtRaw === "number" ? amtRaw : Number(amtRaw);
    const siRaw = o.seatIndex;
    const seatIndex =
      typeof siRaw === "number" && Number.isInteger(siRaw) && siRaw >= 0 && siRaw <= 4
        ? siRaw
        : undefined;
    if (!id || !Number.isFinite(amt) || !Number.isInteger(amt)) continue;
    parsed.push({
      id,
      name: name || "Игрок",
      amount: amt,
      seatIndex,
    });
  }

  const bySeat = new Map<number, DonationLogEntry>();
  const legacyByName = new Map<string, DonationLogEntry>();

  for (const p of parsed) {
    if (p.seatIndex !== undefined) {
      const prev = bySeat.get(p.seatIndex);
      if (prev) {
        bySeat.set(p.seatIndex, {
          id: prev.id,
          name: p.name || prev.name,
          amount: prev.amount + p.amount,
          seatIndex: p.seatIndex,
        });
      } else {
        bySeat.set(p.seatIndex, {
          id: p.id,
          name: p.name,
          amount: p.amount,
          seatIndex: p.seatIndex,
        });
      }
    } else {
      const key = p.name;
      const prev = legacyByName.get(key);
      if (prev) {
        legacyByName.set(key, {
          id: prev.id,
          name: prev.name,
          amount: prev.amount + p.amount,
        });
      } else {
        legacyByName.set(key, {
          id: p.id,
          name: p.name,
          amount: p.amount,
        });
      }
    }
  }

  const fromSeats = [...bySeat.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, e]) => e);
  const fromLegacy = [...legacyByName.values()];

  return [...fromSeats, ...fromLegacy];
}
