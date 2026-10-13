// Datei: game/logic.ts
// Reine Spielregeln: Zielen, Wertung, Serien, Fieber, Item-Ziehung.

import { type Item } from "@/constants/items";

export type HitResult = "perfect" | "correct" | "wrong";

/* ── Zielen ────────────────────────────────────────────────── */

/** Mindest-Wischweg nach oben, bevor gezielt wird (px). */
const MIN_AIM_DISTANCE = 34;

export type Aim = { binIndex: number; perfect: boolean };

/**
 * Nur die RICHTUNG zählt, nicht die Länge: Die Tonne, deren Richtung
 * (vom Item aus gesehen) dem Wischwinkel am nächsten ist, wird gewählt.
 * „Perfekt“ = sehr genau auf die Mitte der Tonne gezielt.
 */
export function aimFromDrag(
  dx: number,
  dy: number,
  binAngles: number[],
): Aim | null {
  if (dy > -MIN_AIM_DISTANCE * 0.6 || Math.hypot(dx, dy) < MIN_AIM_DISTANCE) {
    return null;
  }
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;

  let best = 0;
  let bestDiff = Infinity;
  binAngles.forEach((a, i) => {
    const diff = Math.abs(angle - a);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });

  const spacing =
    binAngles.length > 1
      ? Math.abs(binAngles[1] - binAngles[0])
      : 30;
  const perfectTolerance = Math.max(spacing * 0.22, 2.5);

  return { binIndex: best, perfect: bestDiff <= perfectTolerance };
}

/* ── Wertung ───────────────────────────────────────────────── */

const BASE_POINTS: Record<HitResult, number> = {
  perfect: 25,
  correct: 10,
  wrong: 0,
};

export const XP_PER_RESULT: Record<HitResult, number> = {
  perfect: 8,
  correct: 5,
  wrong: 0,
};

export const STREAK_TIERS = [
  { min: 0, multiplier: 1 },
  { min: 3, multiplier: 1.5 },
  { min: 5, multiplier: 2 },
  { min: 10, multiplier: 3 },
];

export function getMultiplier(streak: number): number {
  let m = 1;
  for (const tier of STREAK_TIERS) if (streak >= tier.min) m = tier.multiplier;
  return m;
}

/** Fieber: alle 10 Treffer in Folge für einige Sekunden doppelte Punkte. */
export const FEVER_EVERY = 10;
export const FEVER_SECONDS = 8;

export function getPoints(
  result: HitResult,
  streakBefore: number,
  fever: boolean,
): number {
  const base = BASE_POINTS[result];
  if (base === 0) return 0;
  return Math.round(base * getMultiplier(streakBefore) * (fever ? 2 : 1));
}

/* ── Spielstand ────────────────────────────────────────────── */

export type Stats = {
  score: number;
  streak: number;
  maxStreak: number;
  throws: number;
  correct: number;
  perfects: number;
  lastPoints: number;
};

export const INITIAL_STATS: Stats = {
  score: 0,
  streak: 0,
  maxStreak: 0,
  throws: 0,
  correct: 0,
  perfects: 0,
  lastPoints: 0,
};

export type StatsAction =
  | { type: "result"; result: HitResult; points: number }
  | { type: "reset" };

export function statsReducer(state: Stats, action: StatsAction): Stats {
  if (action.type === "reset") return INITIAL_STATS;

  const hit = action.result !== "wrong";
  const streak = hit ? state.streak + 1 : 0;
  return {
    score: state.score + action.points,
    streak,
    maxStreak: Math.max(state.maxStreak, streak),
    throws: state.throws + 1,
    correct: state.correct + (hit ? 1 : 0),
    perfects: state.perfects + (action.result === "perfect" ? 1 : 0),
    lastPoints: action.points,
  };
}

/* ── Item-Ziehung ──────────────────────────────────────────── */

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Shuffle-Bag: jedes Item einmal pro Durchlauf, keine direkte Wiederholung. */
export function drawFromBag(
  bag: { current: Item[] },
  pool: Item[],
  exclude?: string,
): Item | null {
  if (pool.length === 0) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (bag.current.length === 0) bag.current = shuffle(pool);
    const index = bag.current.findIndex((i) => i.name !== exclude);
    if (index !== -1) return bag.current.splice(index, 1)[0];
    bag.current = [];
  }
  return pool[0];
}
