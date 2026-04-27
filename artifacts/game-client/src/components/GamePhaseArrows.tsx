import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Phase = { href: string; label: string };

/** Same order as the admin hub: wheel → pandora → three quiz boards. */
const PHASES: Phase[] = [
  { href: "/", label: "Колесо — ведущий" },
  { href: "/adepts", label: "Колесо — ведущий Adepts" },
  { href: "/watch", label: "Колесо — зрители" },
  { href: "/game", label: "Пандора — игроки" },
  { href: "/spectate", label: "Пандора — ведущий" },
  { href: "/adepts-game/", label: "Квиз-доска 1" },
  { href: "/adepts-game-2/", label: "Квиз-доска 2" },
  { href: "/adepts-game-3/", label: "Квиз-доска 3" },
];

function stripBase(pathname: string, base: string): string {
  const b = base.replace(/\/$/, "");
  if (!b) return pathname || "/";
  if (pathname.startsWith(b)) {
    const rest = pathname.slice(b.length) || "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname || "/";
}

function normalize(p: string): string {
  if (p === "/" || p === "") return "/";
  return p.replace(/\/+$/, "") || "/";
}

function phaseIndexForPath(relPath: string): number {
  const norm = normalize(relPath);
  for (let i = 0; i < PHASES.length; i++) {
    const key = normalize(PHASES[i].href);
    if (norm === key) return i;
    if (key !== "/" && norm.startsWith(`${key}/`)) return i;
  }
  return -1;
}

export function GamePhaseArrows() {
  const [location] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const index = useMemo(() => {
    const fullPath = typeof window !== "undefined" ? window.location.pathname : location;
    const rel = stripBase(fullPath, base);
    return phaseIndexForPath(rel);
  }, [location, base]);

  if (index < 0) return null;

  const prev = index > 0 ? PHASES[index - 1] : null;
  const next = index < PHASES.length - 1 ? PHASES[index + 1] : null;

  return (
    <nav
      className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-1.5 shadow-lg backdrop-blur-md"
      aria-label="Переход между фазами игры"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-amber-300"
          title={`Назад: ${prev.label}`}
          aria-label={`Предыдущая фаза: ${prev.label}`}
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
        </Link>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center text-white/25" aria-hidden>
          <ChevronLeft className="h-7 w-7" />
        </span>
      )}

      <div className="min-w-0 max-w-[min(50vw,220px)] px-2 text-center text-[10px] font-mono leading-tight text-amber-100/80 sm:text-xs">
        <div className="whitespace-nowrap">Фаза {index + 1} / {PHASES.length}</div>
        <div className="truncate text-white/70">{PHASES[index]!.label}</div>
      </div>

      {next ? (
        <Link
          href={next.href}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-amber-300"
          title={`Вперёд: ${next.label}`}
          aria-label={`Следующая фаза: ${next.label}`}
        >
          <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
        </Link>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center text-white/25" aria-hidden>
          <ChevronRight className="h-7 w-7" />
        </span>
      )}
    </nav>
  );
}
