// Tests für das Ghost-Rennen (game/ghost.ts): gleiche Strecke für alle,
// Wertung (mehr richtig, dann schneller), Übungs-Ghost, Live-Stand.

import { describe, expect, test } from "@jest/globals";

import {
  beats,
  GHOST_ITEMS,
  ghostQueue,
  ghostResult,
  ghostTug,
  makeRun,
  parseRun,
  practiceRun,
  scoreAt,
} from "../ghost";

const pool = Array.from({ length: 40 }, (_, i) => `item${i}`);

describe("Strecke", () => {
  test("für alle gleich, täglich anders, ohne Doppelte", () => {
    const a = ghostQueue(pool, "2026-10-30");
    expect(a).toEqual(ghostQueue(pool, "2026-10-30"));
    expect(a).toHaveLength(GHOST_ITEMS);
    expect(new Set(a).size).toBe(GHOST_ITEMS);
    expect(ghostQueue(pool, "2026-10-31")).not.toEqual(a);
  });
});

describe("Wertung", () => {
  const run = (correct: boolean[], step: number) =>
    makeRun(
      "d",
      correct.map((c, i) => ({ i, ms: (i + 1) * step, bin: 0, correct: c })),
    );

  test("mehr richtig gewinnt, auch wenn langsamer", () => {
    const slow = run([true, true, true], 3000);
    const fast = run([true, false, true], 1000);
    expect(beats(slow, fast)).toBe(true);
    expect(ghostResult(fast, slow)).toBe("lose");
  });

  test("Gleichstand: der Schnellere gewinnt; ganz gleich = unentschieden", () => {
    expect(ghostResult(run([true, true], 1000), run([true, true], 2000))).toBe("win");
    expect(ghostResult(run([true, true], 1000), run([true, true], 1000))).toBe("draw");
  });

  test("Live-Stand zählt nur richtige Würfe bis jetzt", () => {
    const r = run([true, false, true], 1000);
    expect(scoreAt(r, 500)).toBe(0);
    expect(scoreAt(r, 2500)).toBe(1);
    expect(scoreAt(r, 3000)).toBe(2);
    expect(r.ms).toBe(3000);
  });

  test("Tauziehen: positiv, wenn der Ghost vorn liegt, begrenzt", () => {
    expect(ghostTug(2, 3)).toBeGreaterThan(0);
    expect(ghostTug(3, 2)).toBeLessThan(0);
    expect(ghostTug(0, 50)).toBe(0.9);
  });
});

describe("Übungs-Ghost", () => {
  test("ruhiges Tempo, genau zwei Fehler in eine andere Tonne", () => {
    const bins = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0];
    const r = practiceRun("2026-10-30", bins, 3);
    expect(r.throws).toHaveLength(10);
    expect(r.correct).toBe(8);
    for (const t of r.throws) expect(t.bin === bins[t.i]).toBe(t.correct);
    expect(r.ms / 10).toBeGreaterThanOrEqual(2100);
    expect(r.ms / 10).toBeLessThanOrEqual(3100);
  });
});

describe("Speichern", () => {
  test("nur ein gültiger Lauf von heute wird Ghost", () => {
    const r = makeRun("2026-10-30", [{ i: 0, ms: 900, bin: 1, correct: true }]);
    expect(parseRun(JSON.stringify(r), "2026-10-30")).toEqual(r);
    expect(parseRun(JSON.stringify(r), "2026-10-31")).toBeNull();
    expect(parseRun("kaputt", "2026-10-30")).toBeNull();
    expect(parseRun(null, "2026-10-30")).toBeNull();
  });
});
