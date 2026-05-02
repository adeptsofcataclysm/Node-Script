import type { Player } from "@/lib/adepts-quiz-types";

type Props = {
  players: Player[];
  donations: (number | null)[];
};

/** Компактная таблица пожертвований — общая для всех фаз квиза (синхрон через relay). */
export function DonationsTable({ players, donations }: Props) {
  const rows = players.slice(0, 5);
  const d =
    donations.length >= 5
      ? donations
      : [...donations, ...Array(Math.max(0, 5 - donations.length)).fill(null)].slice(0, 5);

  return (
    <div
      className="w-full max-w-[min(100%,14rem)] rounded-lg border-2 border-amber-400/75 bg-gradient-to-b from-amber-950/35 to-black/50 px-2.5 py-2 shadow-[0_0_22px_rgba(250,204,21,0.45),0_0_8px_rgba(251,191,36,0.25)_inset] backdrop-blur-sm"
      aria-label="Пожертвования игроков"
    >
      <table className="w-full border-collapse text-left font-display text-[11px] leading-tight sm:text-xs">
        <caption className="sr-only">Пожертвования по игрокам</caption>
        <thead>
          <tr className="border-b border-amber-500/50 text-amber-100/95">
            <th scope="col" className="pb-1.5 pr-2 font-semibold tracking-wide">
              Игрок
            </th>
            <th scope="col" className="pb-1.5 font-semibold tracking-wide">
              Пожертвования
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id} className="border-b border-white/10 last:border-b-0">
              <td className="max-w-[5.5rem] truncate py-1 pr-2 text-foreground/95" title={p.name}>
                {p.name}
              </td>
              <td className="py-1 tabular-nums text-amber-50/95">
                {d[i] === null || d[i] === undefined ? "—" : d[i]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
