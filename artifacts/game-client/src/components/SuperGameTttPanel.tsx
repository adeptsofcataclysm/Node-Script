import type { AdeptsSuperTttState, Player } from "@/lib/adepts-quiz-types";

type SuperGameTttPanelProps = {
  players: Player[];
  superTtt: AdeptsSuperTttState;
  viewerSeatIndex: number;
  isSpectator: boolean;
  /** Ведущий может ставить крестики/нолики за текущий ход (сервер: hostBypass). */
  isHost?: boolean;
  onCellPick: (cellIndex: number) => void;
  /** Только ведущий: очистить клетки и снять оверлей победы. */
  onResetBoard?: () => void;
};

export function SuperGameTttPanel({
  players,
  superTtt,
  viewerSeatIndex,
  isSpectator,
  isHost = false,
  onCellPick,
  onResetBoard,
}: SuperGameTttPanelProps) {
  const cells =
    superTtt.cells.length === 25
      ? superTtt.cells
      : ([...superTtt.cells, ...Array(25).fill(null)] as (typeof superTtt.cells[number] | null)[]).slice(
          0,
          25,
        );

  const px = players[superTtt.seatX]?.name?.trim() || `Игрок ${superTtt.seatX + 1}`;
  const po = players[superTtt.seatO]?.name?.trim() || `Игрок ${superTtt.seatO + 1}`;
  const wantX = superTtt.nextIsX;
  const expectedSeat = wantX ? superTtt.seatX : superTtt.seatO;
  const canPlay =
    !isSpectator &&
    viewerSeatIndex >= 0 &&
    viewerSeatIndex <= 4 &&
    viewerSeatIndex === expectedSeat;
  const canMove = canPlay || isHost;

  return (
    <div className="mx-auto mt-1 flex w-full max-w-[min(100%,17.5rem)] flex-col items-center gap-2 self-center px-1 sm:max-w-[min(100%,19rem)]">
      <p
        className="font-display text-center text-[10px] uppercase leading-tight tracking-[0.14em] text-primary/90 sm:text-xs"
        style={{ fontFamily: "WarCraft, sans-serif", textShadow: "0 0 12px hsla(280,65%,55%,0.3)" }}
      >
        5×5 — четыре в ряд
      </p>
      <div className="flex w-full items-stretch gap-1.5 sm:gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-5 gap-1 rounded-xl border border-accent/35 bg-secondary/25 p-1.5 sm:gap-1 sm:p-2">
          {cells.map((cell, i) => (
            <button
              key={i}
              type="button"
              disabled={cell != null || !canMove}
              onClick={() => onCellPick(i)}
              className={`
              flex aspect-square min-h-0 w-full min-w-0 items-center justify-center rounded-md border text-lg font-black
              transition-[transform,box-shadow,border-color] duration-150 sm:text-xl
              ${
                cell != null
                  ? "border-border/60 bg-background/40 text-foreground cursor-default"
                  : canMove
                    ? "cursor-pointer border-primary/45 bg-primary/10 shadow-[0_0_10px_hsla(280,65%,45%,0.18)] hover:border-primary hover:bg-primary/14 active:scale-[0.96]"
                    : "cursor-default border-border/40 bg-muted/20 text-muted-foreground/35"
              }
            `}
            >
              {cell === "X" ? (
                <span className="text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]">✕</span>
              ) : cell === "O" ? (
                <span className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">0</span>
              ) : null}
            </button>
          ))}
        </div>
        {isHost && onResetBoard ? (
          <button
            type="button"
            onClick={onResetBoard}
            title="Сбросить поле"
            aria-label="Сбросить поле"
            className="flex w-9 shrink-0 flex-col items-center justify-center self-stretch rounded-xl border border-accent/40 bg-secondary/30 px-1 text-lg text-primary/90 transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.97] sm:w-10"
          >
            <span className="select-none leading-none" aria-hidden>
              ↻
            </span>
            <span className="mt-0.5 hidden text-[8px] font-bold uppercase leading-none tracking-tight text-muted-foreground sm:block">
              сброс
            </span>
          </button>
        ) : null}
      </div>
      <div className="flex w-full max-w-full items-stretch justify-center gap-2">
        <div
          className={`flex min-w-0 flex-1 flex-col items-center rounded-lg border px-2 py-1.5 ${
            wantX ? "border-sky-400/55 bg-sky-500/10 ring-1 ring-sky-400/25" : "border-border/50 bg-muted/15"
          }`}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300/90">✕</span>
          <span className="mt-0.5 line-clamp-2 text-center font-display text-xs leading-tight text-foreground sm:text-sm">
            {px}
          </span>
        </div>
        <div
          className={`flex min-w-0 flex-1 flex-col items-center rounded-lg border px-2 py-1.5 ${
            !wantX ? "border-amber-400/50 bg-amber-500/10 ring-1 ring-amber-400/25" : "border-border/50 bg-muted/15"
          }`}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200/90">0</span>
          <span className="mt-0.5 line-clamp-2 text-center font-display text-xs leading-tight text-foreground sm:text-sm">
            {po}
          </span>
        </div>
      </div>
    </div>
  );
}
