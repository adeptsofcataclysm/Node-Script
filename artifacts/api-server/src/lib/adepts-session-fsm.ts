import type { AdeptsPhase, AdeptsRoundIndex } from "./adepts-session-types";

function roundIndex(v: unknown): AdeptsRoundIndex | null {
  if (v === 1 || v === 2 || v === 3) return v;
  return null;
}

/** Parse JSON body `to` / `phase` into a well-formed phase, or null. */
export function parseAdeptsPhase(input: unknown): AdeptsPhase | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const kind = o["kind"];
  if (kind === "lobby") return { kind: "lobby" };
  if (kind === "opening_show") return { kind: "opening_show" };
  if (kind === "spectator_picks") return { kind: "spectator_picks" };
  if (kind === "story_video") return { kind: "story_video" };
  if (kind === "donations") return { kind: "donations" };
  if (kind === "game_over") return { kind: "game_over" };
  if (kind === "round") {
    const r = roundIndex(o["roundIndex"]);
    if (!r) return null;
    return { kind: "round", roundIndex: r };
  }
  if (kind === "mini_wheel") {
    const r = roundIndex(o["roundIndex"]);
    if (!r) return null;
    return { kind: "mini_wheel", roundIndex: r };
  }
  if (kind === "mini_roulette") {
    const r = roundIndex(o["roundIndex"]);
    if (!r) return null;
    return { kind: "mini_roulette", roundIndex: r };
  }
  return null;
}

function phaseKey(p: AdeptsPhase): string {
  switch (p.kind) {
    case "lobby":
    case "opening_show":
    case "spectator_picks":
    case "story_video":
    case "donations":
    case "game_over":
      return p.kind;
    case "round":
    case "mini_wheel":
    case "mini_roulette":
      return `${p.kind}:${p.roundIndex}`;
  }
}

/**
 * Allowed Host-driven phase moves (main spine + enter/exit mini-games that overlay a round).
 * Terminal: game_over has no outgoing edges.
 */
const ALLOWED: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["lobby", new Set(["opening_show"])],
  ["opening_show", new Set(["spectator_picks"])],
  ["spectator_picks", new Set(["round:1"])],
  ["round:1", new Set(["round:2", "mini_wheel:1", "mini_roulette:1"])],
  ["round:2", new Set(["story_video", "mini_wheel:2", "mini_roulette:2"])],
  ["round:3", new Set(["game_over", "mini_wheel:3", "mini_roulette:3"])],
  ["mini_wheel:1", new Set(["round:1"])],
  ["mini_wheel:2", new Set(["round:2"])],
  ["mini_wheel:3", new Set(["round:3"])],
  ["mini_roulette:1", new Set(["round:1"])],
  ["mini_roulette:2", new Set(["round:2"])],
  ["mini_roulette:3", new Set(["round:3"])],
  ["story_video", new Set(["donations"])],
  ["donations", new Set(["round:3"])],
]);

export function canTransitionAdeptsPhase(from: AdeptsPhase, to: AdeptsPhase): boolean {
  const fromKey = phaseKey(from);
  const toKey = phaseKey(to);
  const next = ALLOWED.get(fromKey);
  return next?.has(toKey) ?? false;
}
