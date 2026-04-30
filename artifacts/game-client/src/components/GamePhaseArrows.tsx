import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Phase = { href: string; label: string };

const PHASES: Phase[] = [
  { href: "/adepts-game/", label: "Квиз-доска 1" },
  { href: "/adepts-game-2/", label: "Квиз-доска 2" },
  { href: "/adepts-game-3/", label: "Квиз-доска 3" },
];

/** Routes that render their own inline phase nav inside a header. */
const HEADER_NAV_ROUTES = ["/adepts-game", "/adepts-game-2", "/adepts-game-3"];

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

function usePhaseIndex() {
  const [location] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return useMemo(() => {
    const fullPath = typeof window !== "undefined" ? window.location.pathname : location;
    const rel = stripBase(fullPath, base);
    return { index: phaseIndexForPath(rel), rel };
  }, [location, base]);
}

/** Floating pill fixed at bottom-center. Rendered globally for pages without a header. */
export function GamePhaseArrows() {
  const { index, rel } = usePhaseIndex();

  const isHeaderRoute = HEADER_NAV_ROUTES.some((r) => normalize(rel).startsWith(normalize(r)));
  if (index < 0 || isHeaderRoute) return null;

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

/** Compact inline nav for use inside a page header.
 *  Uses plain <a> tags so nested wouter routers don't mangle the absolute hrefs. */
export function GamePhaseNav() {
  const { index } = usePhaseIndex();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  if (index < 0) return null;

  const prev = index > 0 ? PHASES[index - 1] : null;
  const next = index < PHASES.length - 1 ? PHASES[index + 1] : null;

  const toHref = (phase: Phase) => base + phase.href;

  return (
    <nav className="flex items-center gap-0.5" aria-label="Переход между фазами игры">
      {prev ? (
        <a
          href={toHref(prev)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-amber-300"
          title={`Назад: ${prev.label}`}
          aria-label={`Предыдущая фаза: ${prev.label}`}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </a>
      ) : (
        <span className="flex h-7 w-7 items-center justify-center text-white/20" aria-hidden>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      <span className="px-1 text-[10px] font-mono text-white/50 tabular-nums">
        {index + 1}/{PHASES.length}
      </span>

      {next ? (
        <a
          href={toHref(next)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-amber-300"
          title={`Вперёд: ${next.label}`}
          aria-label={`Следующая фаза: ${next.label}`}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </a>
      ) : (
        <span className="flex h-7 w-7 items-center justify-center text-white/20" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
