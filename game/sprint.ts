// Datei: game/sprint.ts
// Zeit-Sprint (Online-Bereich, ROADMAP R4a): 30 Sekunden, so viele richtig wie
// möglich. Die Gegenstände kommen heute für alle in derselben Reihenfolge, der
// Gegner (zum Start: dein bester Sprint von heute oder ein Übungs-Ghost) fliegt
// zur selben Sekunde mit. Wer mehr richtig hat, gewinnt. Läufe nutzen dieselbe
// Form wie im Ghost-Rennen (game/ghost.ts). Rein und ohne React
// (Tests: __tests__/sprint.test.ts).

import { type GhostRun, type GhostThrow, makeRun } from "./ghost";
import { hashString, seededRandom } from "./logic";

/** Dauer eines Sprints (ms). */
export const SPRINT_MS = 30_000;

/** Länge der Strecke – mehr, als jemand in 30 s werfen kann. */
export const SPRINT_ITEMS = 60;

/** Startwert der Sprint-Strecke eines Tages (anders als beim Ghost-Rennen). */
export function sprintSeed(day: string): number {
  return hashString(`sprint:${day}`);
}

/** Die Strecke des Tages: der Vorrat immer wieder neu gemischt hintereinander,
 *  nie derselbe Gegenstand zweimal direkt nacheinander. */
export function sprintQueue<T>(pool: T[], day: string, length = SPRINT_ITEMS): T[] {
  if (pool.length === 0) return [];
  const rand = seededRandom(sprintSeed(day));
  const out: T[] = [];
  while (out.length < length) {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.length > 1 && a[0] === out[out.length - 1]) [a[0], a[1]] = [a[1], a[0]];
    out.push(...a);
  }
  return out.slice(0, length);
}

/** Nur Würfe innerhalb der 30 s zählen. */
export function sprintRun(day: string, throws: GhostThrow[]): GhostRun {
  return makeRun(
    day,
    throws.filter((t) => t.ms <= SPRINT_MS),
  );
}

/** Übungs-Ghost: gut 2,5 s pro Wurf, jeder fünfte daneben – etwa 9 richtig,
 *  schlagbar, aber nicht geschenkt. `correctBins` = richtige Tonne je Gegenstand. */
export function practiceSprint(day: string, correctBins: number[], binCount: number): GhostRun {
  const rand = seededRandom(sprintSeed(day) ^ 0x9e3779b9);
  const throws: GhostThrow[] = [];
  let ms = 0;
  for (let i = 0; i < correctBins.length; i++) {
    ms += Math.round(2200 + rand() * 800);
    if (ms > SPRINT_MS) break;
    const correct = i % 5 !== 3;
    const bin = correctBins[i];
    throws.push({ i, ms, bin: correct ? bin : (bin + 1) % binCount, correct });
  }
  return makeRun(day, throws);
}

export type SprintResult = "win" | "lose" | "draw";

/** Mehr richtig gewinnt, gleich viele = Gleichstand. */
export function sprintResult(me: GhostRun, rival: GhostRun): SprintResult {
  return me.correct > rival.correct ? "win" : me.correct < rival.correct ? "lose" : "draw";
}

/** Gespeicherten Sprint prüfen (nur ein gültiger Lauf von `day` wird Gegner). */
export function parseSprint(raw: string | null, day: string): GhostRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as GhostRun;
    if (run.day !== day || !Array.isArray(run.throws) || run.throws.length === 0) return null;
    return run;
  } catch {
    return null;
  }
}
