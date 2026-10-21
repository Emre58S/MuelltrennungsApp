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

/* ── Zielwurf (freier Wurf, kein Einrasten) ───────────────── */

/** Wisch-Tempo nach oben (px/s), bei dem ein Wurf genau bis zur Tonne fliegt. */
export const IDEAL_FLICK = 2000;
/** Weite: so viele Welt-Einheiten zu kurz/zu weit pro 100 % Tempo-Abweichung. */
const DEPTH_PER_SPEED = 1.5;
/** Öffnung einer Tonne (halbe Breite/Tiefe, Welt-Einheiten) und Randbreite. */
export const OPENING = { halfW: 0.4, halfD: 0.4, rim: 0.16 };

export type FreeShot = {
  /** Seitliche Landestelle (Welt-x auf Höhe der Öffnungen). */
  x: number;
  /** + = zu kurz (Richtung Kamera), − = zu weit (hinter die Tonnen). */
  depth: number;
  /** Tonne, in die der Wurf fällt – oder null (daneben). */
  binIndex: number | null;
  /** Daneben, aber knapp: prallt vom Rand dieser Tonne ab. */
  rimIndex: number | null;
  perfect: boolean;
};

/** Winkel → Welt-x: zwischen den Tonnen linear, außen weitergeführt. */
function angleToX(angle: number, binAngles: number[], binXs: number[]): number {
  const n = binAngles.length;
  if (n === 1) return binXs[0] + (angle - binAngles[0]) * 0.05;
  let i = 0;
  while (i < n - 2 && angle > binAngles[i + 1]) i++;
  const k = (angle - binAngles[i]) / (binAngles[i + 1] - binAngles[i]);
  return binXs[i] + k * (binXs[i + 1] - binXs[i]);
}

/**
 * Wie beim Basketball: die RICHTUNG bestimmt, wo seitlich der Wurf ankommt,
 * das TEMPO, wie weit er fliegt. Nur wenn beides passt, landet er in der Tonne.
 */
export function freeShot(
  dx: number,
  dy: number,
  vy: number,
  binAngles: number[],
  binXs: number[],
): FreeShot | null {
  if (dy > -MIN_AIM_DISTANCE * 0.6 || Math.hypot(dx, dy) < MIN_AIM_DISTANCE) {
    return null;
  }
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const x = angleToX(angle, binAngles, binXs);
  const speed = Math.max(0, -vy) / IDEAL_FLICK;
  const depth = Math.min(Math.max((1 - speed) * DEPTH_PER_SPEED, -1.6), 2.2);

  let best = 0;
  binXs.forEach((bx, i) => {
    if (Math.abs(x - bx) < Math.abs(x - binXs[best])) best = i;
  });
  const ox = Math.abs(x - binXs[best]);
  const oz = Math.abs(depth);
  const inside = ox <= OPENING.halfW && oz <= OPENING.halfD;
  const onRim =
    !inside && ox <= OPENING.halfW + OPENING.rim && oz <= OPENING.halfD + OPENING.rim;

  return {
    x,
    depth,
    binIndex: inside ? best : null,
    rimIndex: onRim ? best : null,
    perfect: inside && ox < 0.12 && oz < 0.12,
  };
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

/* ── Lernende Item-Auswahl ─────────────────────────────────── */

/** Lernstand eines Items (Teilmenge von ItemStat in utils/storage). */
export type LearnStat = { wrong: number; streak: number; lastWrong: number };

const DAY_MS = 86_400_000;
/** So viele Würfe dauert das Aufwärmen, bis schwere Items voll dabei sind. */
const WARMUP_THROWS = 15;

/**
 * Wie oft ein Item drankommen soll:
 *  - oft falsch → häufiger (verblasst mit richtigen Antworten in Folge)
 *  - kürzlich falsch → extra häufig (Wiederholung, solange noch unsicher)
 *  - sicher gekonnt → seltener
 *  - noch nie gesehen → leicht bevorzugt (Sammelbuch füllen)
 *  - Schwierigkeit steigt in der Runde: erst leicht, dann mehr „Fallen“
 */
export function itemWeight(
  item: Item,
  stat: LearnStat | undefined,
  throws: number,
  now: number,
): number {
  let w = 1;
  if (stat) {
    w += (Math.min(stat.wrong, 5) * 0.8) / (1 + stat.streak);
    if (stat.lastWrong > 0 && now - stat.lastWrong < 3 * DAY_MS && stat.streak < 2) w += 1.5;
    if (stat.streak >= 4) w *= 0.5;
  } else {
    w += 0.3;
  }
  const ramp = Math.min(throws / WARMUP_THROWS, 1);
  if (item.difficulty === "schwer") w *= 0.25 + ramp;
  else if (item.difficulty === "mittel") w *= 0.6 + ramp * 0.5;
  else w *= 1.3 - ramp * 0.5;
  return w;
}

/** Gewichtete Auswahl; die letzten Items (`recent`) kommen nicht direkt wieder. */
export function pickItem(
  pool: Item[],
  weightOf: (item: Item) => number,
  recent: string[],
  rand: () => number = Math.random,
): Item | null {
  if (pool.length === 0) return null;
  const fresh = pool.filter((i) => !recent.includes(i.name));
  const list = fresh.length > 0 ? fresh : pool;
  const weights = list.map((i) => Math.max(weightOf(i), 0.01));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/** Wie viele zuletzt gezeigte Items gesperrt sind (abhängig von der Pool-Größe). */
export function recentLimit(poolSize: number) {
  return Math.max(0, Math.min(4, poolSize - 1));
}

/* ── Tagesaufgabe ──────────────────────────────────────────── */

export const DAILY_COUNT = 10;

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kleiner, reproduzierbarer Zufallsgenerator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Die Items der Tagesaufgabe: für alle gleich (nur vom Datum abhängig). */
export function dailyItems(pool: Item[], date: string, count = DAILY_COUNT): Item[] {
  const rand = seededRandom(hashString(`daily:${date}`));
  const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name));
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  }
  return sorted.slice(0, Math.min(count, sorted.length));
}
