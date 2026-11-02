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

/** Startwert der Strecke eines Tages (anders als beim Ghost-Rennen);
 *  `salt` trennt Sprint und Survival. */
export function sprintSeed(day: string, salt = "sprint"): number {
  return hashString(`${salt}:${day}`);
}

/** Die Strecke des Tages: der Vorrat immer wieder neu gemischt hintereinander,
 *  nie derselbe Gegenstand zweimal direkt nacheinander. */
export function sprintQueue<T>(pool: T[], day: string, length = SPRINT_ITEMS, salt = "sprint"): T[] {
  if (pool.length === 0) return [];
  const rand = seededRandom(sprintSeed(day, salt));
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

/* ── Lauf als Code (für Zufallsgegner, supabase/online.sql) ─────
 * Je Wurf 3 Zeichen: Tonne (0–9) + Zeitabstand zum vorigen Wurf in 0,1 s
 * (2 Zeichen Basis 36). Richtig/falsch steht nicht drin – das rechnet das
 * Spiel aus der Tages-Strecke nach. */

const B36_MAX = 1295;
/** Höchstens so viele Würfe kommen in den Code (passt zur Server-Prüfung). */
const CODE_THROWS = 100;

export function encodeSprint(run: GhostRun): string {
  let body = "";
  let prev = 0;
  for (const t of run.throws.slice(0, CODE_THROWS)) {
    // Zeiten gerundet weiterzählen – so wächst kein Rundungsfehler an
    const at = Math.max(prev, Math.round(t.ms / 100));
    body += String(Math.min(Math.max(t.bin, 0), 9)) + Math.min(at - prev, B36_MAX).toString(36).padStart(2, "0");
    prev = at;
  }
  return body;
}

/** Würfe aus einem Code – richtig/falsch nach `correctBins` (die Strecke beginnt
 *  nach ihrem Ende von vorn, wie im Spiel). `null`, wenn der Code nicht passt
 *  (kaputt, zu lang oder Tonne gibt es nicht). */
export function decodeSprint(code: string, correctBins: number[], binCount: number): GhostThrow[] | null {
  // Je Wurf: Ziffer (Tonne) + 2 Zeichen Zeit
  if (!code || code.length > CODE_THROWS * 3 || !/^([0-9][0-9a-z]{2})+$/.test(code)) return null;
  if (correctBins.length === 0) return null;
  const throws: GhostThrow[] = [];
  let ms = 0;
  for (let k = 0; k < code.length; k += 3) {
    const i = k / 3;
    const bin = Number(code[k]);
    if (bin >= binCount) return null;
    ms += parseInt(code.slice(k + 1, k + 3), 36) * 100;
    throws.push({ i, ms, bin, correct: bin === correctBins[i % correctBins.length] });
  }
  return throws;
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
