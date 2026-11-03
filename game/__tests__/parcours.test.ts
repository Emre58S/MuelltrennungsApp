// Tests für die Parcours-Runde (game/parcours.ts): Punkte je Wurf, gleiche Strecke für alle.

import { describe, expect, test } from "@jest/globals";

import { dailyParcoursId, PARCOURS_ITEMS, parcoursPoints, parcoursQueue } from "../parcours";
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
});
