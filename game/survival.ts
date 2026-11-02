// Datei: game/survival.ts
// Survival (Online-Bereich, ROADMAP R4b): kein Fehler erlaubt, und jeder
// Gegenstand hat nur kurz Zeit – anfangs 3 s, nach 30 s nur noch gut 1 s
// (Höchsttempo). Ein falscher Wurf oder zu langsam = Runde vorbei. Wer mehr
// richtig hat (also länger durchhält), gewinnt. Strecke wie beim Zeit-Sprint
// (game/sprint.ts), Läufe in derselben Form wie im Ghost-Rennen; `ms` ist hier
// der Zeitpunkt des Ausscheidens. Rein und ohne React
// (Tests: __tests__/survival.test.ts).

import { type GhostRun, type GhostThrow, makeRun } from "./ghost";
import { seededRandom } from "./logic";
import { sprintSeed } from "./sprint";

/** Zeit für den ersten Gegenstand (ms). */
export const SURVIVAL_START_MS = 3000;
/** Höchsttempo: so wenig Zeit bleibt am Ende je Gegenstand (ms). */
export const SURVIVAL_MIN_MS = 1100;
/** Nach dieser Zeit ist das Höchsttempo erreicht (ms). */
export const SURVIVAL_RAMP_MS = 30_000;
/** Wer so lange durchhält, hat es geschafft – die Runde endet (ms). */
export const SURVIVAL_MAX_MS = 60_000;

/** Zeit für einen Gegenstand, der `elapsed` ms nach dem Start erscheint. */
export function itemLimit(elapsed: number): number {
  const k = Math.min(Math.max(elapsed / SURVIVAL_RAMP_MS, 0), 1);
  return Math.round(SURVIVAL_START_MS - (SURVIVAL_START_MS - SURVIVAL_MIN_MS) * k);
}

/** Lauf aus den Würfen; `outMs` = Ausscheiden (falscher Wurf, zu langsam oder Schluss). */
export function survivalRun(day: string, throws: GhostThrow[], outMs: number): GhostRun {
  return { ...makeRun(day, throws), ms: Math.min(outMs, SURVIVAL_MAX_MS) };
}

/** Übungs-Ghost: wirft nach gut der Hälfte der Zeit und liegt beim 10. oder
 *  11. Gegenstand daneben – schlagbar, aber nicht geschenkt. */
export function practiceSurvival(day: string, correctBins: number[], binCount: number): GhostRun {
  const rand = seededRandom(sprintSeed(day, "survival") ^ 0x9e3779b9);
  const outAt = rand() < 0.5 ? 9 : 10;
  const throws: GhostThrow[] = [];
  let ms = 0;
  for (let i = 0; i <= outAt && i < correctBins.length; i++) {
    ms += Math.round(itemLimit(ms) * (0.5 + rand() * 0.3));
    const correct = i < outAt;
    const bin = correctBins[i];
    throws.push({ i, ms, bin: correct ? bin : (bin + 1) % binCount, correct });
  }
  return survivalRun(day, throws, ms);
}

export type SurvivalResult = "win" | "lose" | "draw";

/** Mehr richtig gewinnt, gleich viele = Gleichstand. */
export function survivalResult(me: GhostRun, rival: GhostRun): SurvivalResult {
  return me.correct > rival.correct ? "win" : me.correct < rival.correct ? "lose" : "draw";
}
