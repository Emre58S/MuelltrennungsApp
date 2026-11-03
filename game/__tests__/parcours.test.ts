// Tests für die Parcours-Runde (game/parcours.ts): Punkte je Wurf, gleiche Strecke für alle.

import { describe, expect, test } from "@jest/globals";

import { dailyParcoursId, decodeParcours, encodeParcours, ghostPointsAt, parseParcoursRun, PARCOURS_ITEMS, parcoursPoints, parcoursQueue } from "../parcours";
import { PARCOURS } from "../trick-levels";

describe("Parcours-Runde", () => {
  test("Punkte: falsch 0 · richtig 1 · Trick 3 · Swish +1", () => {
    expect(parcoursPoints({ correct: false, trick: true, clean: true })).toBe(0);
    expect(parcoursPoints({ correct: true, trick: false, clean: false })).toBe(1);
    expect(parcoursPoints({ correct: true, trick: false, clean: true })).toBe(1);
    expect(parcoursPoints({ correct: true, trick: true, clean: false })).toBe(3);
    expect(parcoursPoints({ correct: true, trick: true, clean: true })).toBe(4);
  });

  test("Strecke: für alle gleich, je Parcours und Tag anders, ohne direkte Doppelte", () => {
    const pool = ["a", "b", "c", "d", "e", "f"];
    const q = parcoursQueue(pool, "2026-11-03", 1);
    expect(q).toHaveLength(PARCOURS_ITEMS);
    expect(parcoursQueue(pool, "2026-11-03", 1)).toEqual(q);
    expect(parcoursQueue(pool, "2026-11-03", 2)).not.toEqual(q);
    expect(parcoursQueue(pool, "2026-11-04", 1)).not.toEqual(q);
    for (let i = 1; i < q.length; i++) expect(q[i]).not.toBe(q[i - 1]);
  });

  test("Zeit je Parcours 20–30 s", () => {
    for (const p of PARCOURS) expect([20, 25, 30]).toContain(p.seconds);
  });

  test("Parcours des Tages: gleich für alle, mal dieser, mal jener", () => {
    const ids = PARCOURS.map((p) => p.id);
    expect(dailyParcoursId("2026-11-03", ids)).toBe(dailyParcoursId("2026-11-03", ids));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => dailyParcoursId(`2026-11-${String(i + 1).padStart(2, "0")}`, ids)));
    expect(seen.size).toBeGreaterThan(1);
    for (const id of seen) expect(ids).toContain(id);
  });

  test("Ghost: Punkte nur bis zur Rundenzeit, kaputte Läufe fallen weg", () => {
    const run = { points: 7, hits: [[1200, 1], [4000, 4], [9000, 7]] as [number, number][] };
    expect(ghostPointsAt(run, 0)).toBe(0);
    expect(ghostPointsAt(run, 1200)).toBe(1);
    expect(ghostPointsAt(run, 8999)).toBe(4);
    expect(ghostPointsAt(run, 30000)).toBe(7);
    expect(parseParcoursRun(run)).toEqual(run);
    expect(parseParcoursRun({ points: 0, hits: [] })).toBeNull();
    expect(parseParcoursRun({ points: 3, hits: [[500, 3], [100, 1]] })).toBeNull();
    expect(parseParcoursRun("x")).toBeNull();
  });

  test("Lauf-Code für den Server: hin und zurück, Unsinn fällt weg", () => {
    const run = { points: 8, hits: [[1230, 1], [4000, 4], [12960, 8]] as [number, number][] };
    const code = encodeParcours(run);
    expect(code).toMatch(/^([1-4][0-9a-z]{2})+$/);
    expect(code).toHaveLength(9);
    const back = decodeParcours(code);
    expect(back?.points).toBe(8);
    expect(back?.hits.map(([, total]) => total)).toEqual([1, 4, 8]);
    // Zeiten auf Zehntel genau
    back?.hits.forEach(([ms], i) => expect(Math.abs(ms - run.hits[i][0])).toBeLessThanOrEqual(100));
    expect(decodeParcours("")).toBeNull();
    expect(decodeParcours("5aa")).toBeNull();
    expect(decodeParcours("1a")).toBeNull();
  });
});
