import type { DonationLogEntry } from "@/lib/donationLog";

type Props = {
  donationLog: DonationLogEntry[];
};

/** Журнал пожертвований — общий для всех фаз квиза (синхрон через relay). */
export function DonationsTable({ donationLog }: Props) {
  const rows = [...(donationLog ?? [])].sort(
    (a, b) => (a.seatIndex ?? 100) - (b.seatIndex ?? 100)
  );

  return (
    <div
      className="w-full max-w-[min(100%,14rem)] rounded-lg border-2 border-amber-400/75 bg-gradient-to-b from-amber-950/35 to-black/50 px-2.5 py-2 shadow-[0_0_22px_rgba(250,204,21,0.45),0_0_8px_rgba(251,191,36,0.25)_inset] backdrop-blur-sm"
      aria-label="Пожертвования игроков"
    >
      <table className="w-full border-collapse text-left font-display text-[11px] leading-tight sm:text-xs">
        <caption className="sr-only">Журнал пожертвований</caption>
        <thead>
          <tr className="border-b border-amber-500/50 text-amber-100/95">
            <th scope="col" className="pb-1.5 pr-2 font-semibold tracking-wide">
              Игрок
            </th>
            <th scope="col" className="pb-1.5 font-semibold tracking-wide">
              Пожертвование
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-2 text-center text-muted-foreground/80">
                —
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-white/10 last:border-b-0">
                <td className="max-w-[5.5rem] truncate py-1 pr-2 text-foreground/95" title={row.name}>
                  {row.name}
                </td>
                <td className="py-1 tabular-nums text-amber-50/95">{row.amount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
