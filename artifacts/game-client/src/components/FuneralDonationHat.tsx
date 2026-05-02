import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

/** `public/Шляпа.png` — без фона; URL кодируем для кириллицы. */
function hatImageUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${encodeURIComponent("Шляпа.png")}`;
}

/** Свечение по контуру непрозрачных пикселей (drop-shadow следует альфе PNG). */
const HAT_GLOW =
  "drop-shadow(0 0 1px rgba(254, 249, 195, 0.98)) drop-shadow(0 0 3px rgba(250, 204, 21, 0.95)) drop-shadow(0 0 8px rgba(245, 158, 11, 0.88)) drop-shadow(0 0 18px rgba(217, 119, 6, 0.55)) drop-shadow(0 0 32px rgba(180, 83, 9, 0.38))";

const HAT_GLOW_HOVER =
  "drop-shadow(0 0 2px rgba(254, 252, 232, 1)) drop-shadow(0 0 5px rgba(253, 224, 71, 1)) drop-shadow(0 0 12px rgba(250, 204, 21, 0.92)) drop-shadow(0 0 26px rgba(245, 158, 11, 0.65)) drop-shadow(0 0 42px rgba(217, 119, 6, 0.45))";

const NO_FUNDS = "Увы, у вас нет таких средств";

type Props = {
  /** Только у игроков: клик открывает ввод суммы. Ведущий и зрители видят шляпу без взаимодействия. */
  interactive?: boolean;
  playerScore: number;
  onSubmit: (amount: number) => void;
};

/** Ниже и правее центра кадра — у гроба на «полу»; left смещён к визуальному центру гроба. */
const HAT_WRAP =
  "absolute bottom-[3%] left-[53%] z-20 flex -translate-x-1/2 flex-col items-center";

/** Базовый размер +10% к прежнему min(26vw,140px) / max-w min(48vw,220px). */
const HAT_IMG_CLASS =
  "block h-[min(28.6vw,154px)] w-auto max-w-[min(52.8vw,242px)] object-contain";

/** Кнопка-шляпа и локальный (только у этого клиента) ввод суммы пожертвования. */
export function FuneralDonationHat({ interactive = true, playerScore, onSubmit }: Props) {
  const hatSrc = useMemo(() => hatImageUrl(), []);
  const [panelOpen, setPanelOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hatHover, setHatHover] = useState(false);

  const openPanel = useCallback(() => {
    setError(null);
    setRaw("");
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setError(null);
    setRaw("");
  }, []);

  const confirm = useCallback(() => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError(NO_FUNDS);
      return;
    }
    const amount = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(amount) || amount < 1) {
      setError(NO_FUNDS);
      return;
    }
    if (playerScore < 0 || amount > playerScore) {
      setError(NO_FUNDS);
      return;
    }
    onSubmit(amount);
    closePanel();
  }, [raw, playerScore, onSubmit, closePanel]);

  if (!interactive) {
    return (
      <div className={`pointer-events-none ${HAT_WRAP}`} aria-hidden>
        <div className="relative border-0 bg-transparent p-0 shadow-none">
          <img
            src={hatSrc}
            alt=""
            width={200}
            height={200}
            className={HAT_IMG_CLASS}
            style={{ filter: HAT_GLOW }}
            draggable={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`pointer-events-auto ${HAT_WRAP}`}>
      <button
        type="button"
        onClick={openPanel}
        onPointerEnter={() => setHatHover(true)}
        onPointerLeave={() => setHatHover(false)}
        className="group relative border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-label="Пожертвование"
      >
        <img
          src={hatSrc}
          alt=""
          width={200}
          height={200}
          className={`${HAT_IMG_CLASS} transition-[filter,transform] duration-200 group-hover:scale-[1.03] group-active:scale-[0.98]`}
          style={{ filter: hatHover ? HAT_GLOW_HOVER : HAT_GLOW }}
          draggable={false}
        />
      </button>

      {panelOpen ? (
        <div className="absolute bottom-full left-1/2 z-30 mb-3 w-[min(90vw,220px)] -translate-x-1/2 rounded-lg border border-amber-500/50 bg-zinc-950/95 p-3 pt-2.5 shadow-[0_0_24px_rgba(250,204,21,0.35)] backdrop-blur-md">
          <div className="relative mb-2 flex items-start justify-between gap-2 pr-0.5">
            <p className="min-w-0 flex-1 font-display text-xs leading-snug text-amber-100/90">
              Сумма пожертвования
            </p>
            <button
              type="button"
              onClick={closePanel}
              className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-amber-200/70 transition hover:bg-amber-950/80 hover:text-amber-100"
              aria-label="Закрыть"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") closePanel();
              }}
              className="min-w-0 flex-1 rounded border border-amber-600/40 bg-black/50 px-2 py-1.5 font-mono text-sm text-amber-50 tabular-nums outline-none focus:border-amber-400/70"
              aria-invalid={error != null}
              autoFocus
            />
            <button
              type="button"
              onClick={confirm}
              className="rounded-md border border-amber-500/60 bg-amber-950/60 px-3 py-1.5 font-display text-xs font-semibold text-amber-100 hover:bg-amber-900/70"
            >
              Ок
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-center font-display text-xs text-red-300/95" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
