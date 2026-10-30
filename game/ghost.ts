// Datei: game/ghost.ts
// Ghost-Rennen (1 gegen 1 nacheinander, wie ein Geister-Fahrer im Rennspiel):
// Jeden Tag gibt es eine feste Strecke aus 10 Gegenständen (für alle gleich,
// aus dem Datum gemischt). Dein bester Lauf von heute wird aufgezeichnet und
// fliegt beim nächsten Lauf als durchsichtiger Ghost zur selben Sekunde mit.
// Noch kein Lauf heute? Dann wirft ein Übungs-Ghost mit.
// Gewonnen hat, wer mehr richtig sortiert – bei Gleichstand der Schnellere.
// Ein Lauf ist nur eine kleine Liste von Würfen – so kann er später auch
// verschickt werden (Herausforderung per Code). Rein und ohne React
// (Tests: __tests__/ghost.test.ts).

import { hashString, seededRandom } from "./logic";

/** Gegenstände pro Lauf. */
export const GHOST_ITEMS = 10;

/** Ein Wurf im Lauf: Gegenstand (Index in der Strecke), Zeit ab Start (ms),
 *  gewählte Tonne und ob richtig. */
export type GhostThrow = { i: number; ms: number; bin: number; correct: boolean };

export type GhostRun = {
  /** Tag der Strecke (YYYY-MM-DD). */
  day: string;
  throws: GhostThrow[];
  correct: number;
  /** Zeit des letzten Wurfs (ms ab Start). */
  ms: number;
};

/** Startwert der Tages-Strecke. */
export function ghostSeed(day: string): number {
  return hashString(`ghost:${day}`);
}

/** Die Strecke des Tages: GHOST_ITEMS Gegenstände, für alle gleich gemischt. */
export function ghostQueue<T>(pool: T[], day: string): T[] {
  const rand = seededRandom(ghostSeed(day));
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, GHOST_ITEMS);
}

/** Lauf aus den Würfen zusammenfassen. */
export function makeRun(day: string, throws: GhostThrow[]): GhostRun {
  return {
    day,
    throws,
    correct: throws.filter((t) => t.correct).length,
    ms: throws.length ? throws[throws.length - 1].ms : 0,
  };
}

/** Übungs-Ghost: ruhiges Tempo (gut 2,5 s pro Wurf), zwei Fehler – schlagbar,
 *  aber nicht geschenkt. `correctBins` = richtige Tonne je Gegenstand. */
export function practiceRun(day: string, correctBins: number[], binCount: number): GhostRun {
  const rand = seededRandom(ghostSeed(day) ^ 0x9e3779b9);
  const wrong = new Set<number>();
  while (wrong.size < Math.min(2, correctBins.length)) wrong.add(Math.floor(rand() * correctBins.length));
  let ms = 0;
  const throws = correctBins.map((bin, i): GhostThrow => {
    ms += Math.round(2100 + rand() * 1000);
    const correct = !wrong.has(i);
    return { i, ms, bin: correct ? bin : (bin + 1) % binCount, correct };
  });
  return makeRun(day, throws);
}

/** Richtige Würfe bis zur Zeit `ms` (für den Live-Stand). */
export function scoreAt(run: GhostRun, ms: number): number {
  let n = 0;
  for (const t of run.throws) if (t.correct && t.ms <= ms) n += 1;
  return n;
}

/** Ist Lauf `a` besser als `b`? Mehr richtig – bei Gleichstand schneller. */
export function beats(a: GhostRun, b: GhostRun): boolean {
  return a.correct > b.correct || (a.correct === b.correct && a.ms < b.ms);
}

export type GhostResult = "win" | "lose" | "draw";

export function ghostResult(me: GhostRun, ghost: GhostRun): GhostResult {
  return beats(me, ghost) ? "win" : beats(ghost, me) ? "lose" : "draw";
}

/** Tauziehen: −1 … 1, positiv = der Ghost liegt vorn. */
export function ghostTug(me: number, ghost: number): number {
  return Math.max(-0.9, Math.min(0.9, (ghost - me) / 5));
}

/** Gespeicherten Lauf prüfen (nur ein gültiger Lauf von `day` wird Ghost). */
export function parseRun(raw: string | null, day: string): GhostRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as GhostRun;
    if (run.day !== day || !Array.isArray(run.throws) || run.throws.length === 0) return null;
    return run;
  } catch {
    return null;
  }
}
