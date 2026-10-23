// Tests für die Trickwurf-Level (game/trick-levels.ts): jedes Level ist mit
// einem fairen Fenster an Würfen lösbar – bei bewegten Reifen auch mit einem
// fairen Zeitfenster – und das auch auf einem kleinen iPhone.
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { levelPeriod, starsFor, TRICK_LEVELS, type TrickLevel } from "../trick-levels";
import { createSolver, sampleTimes, success, throwAt } from "../trick-solver";

const small = createSolver(375, 667);

/** Bester Wurf: unter den Würfen, die zu den meisten Zeitpunkten treffen,
 *  der mittlere (Richtung und Kraft) – dort, wo ein Spieler hinzielt. */
function findBest(level: TrickLevel, hit: typeof success = success) {
  const times = sampleTimes(level, 12);
  const cells: { angle: number; strength: number; times: number[]; n: number }[] = [];
  for (let strength = 0.6; strength <= 0.86; strength += 0.02)
    for (let angle = -28; angle <= 28; angle += 2) {
      const ok = times.filter((t) => hit(level, angle, strength, t));
      if (ok.length) cells.push({ angle, strength, times: ok, n: ok.length });
    }
  const most = Math.max(0, ...cells.map((c) => c.n));
  const top = cells.filter((c) => c.n === most);
  if (!top.length) return null;
  const mid = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1];
  const angle = mid(top.map((c) => c.angle));
  const strength = mid(top.map((c) => c.strength));
  // Den Treffer-Wurf nehmen, der dieser Mitte am nächsten liegt
  const pick = top.reduce((b, c) =>
    Math.abs(c.angle - angle) / 2 + Math.abs(c.strength - strength) / 0.02 <
    Math.abs(b.angle - angle) / 2 + Math.abs(b.strength - strength) / 0.02
      ? c
      : b,
  );
  return { angle: pick.angle, strength: pick.strength, times: pick.times };
}

describe("Trickwurf-Level", () => {
  test.each(TRICK_LEVELS.map((l) => [l.id, l] as const))(
    "Level %i: lösbar mit fairem Fenster",
    (_id, level) => {
      const best = findBest(level);
      expect(best).not.toBeNull();
      const { angle, strength, times } = best!;

      // Zum günstigsten Zeitpunkt (bewegte Reifen: wenn er gut steht):
      // Weiten-Fenster mindestens 0,1 Kraft (≈ 18 px), Richtung mindestens 6°
      let reach = 0;
      let direction = 0;
      for (const time of times) {
        let r = 0;
        for (let k = -0.15; k <= 0.1501; k += 0.01) if (success(level, angle, strength + k, time)) r += 1;
        let d = 0;
        for (let a = -12; a <= 12; a += 1) if (success(level, angle + a, strength, time)) d += 1;
        reach = Math.max(reach, r);
        direction = Math.max(direction, d);
      }
      expect(reach).toBeGreaterThanOrEqual(10);
      expect(direction).toBeGreaterThanOrEqual(6);

      // Bewegte Reifen: das Timing zählt – aber mindestens 20 % der Zeit passt es
      const period = levelPeriod(level);
      if (period > 0) {
        const times = sampleTimes(level, 40);
        const share = times.filter((t) => success(level, angle, strength, t)).length / times.length;
        expect(share).toBeGreaterThanOrEqual(0.2);
        expect(share).toBeLessThan(0.95);
      }

      // Auch auf einem kleinen iPhone (SE) lösbar
      expect(findBest(level, small.success)).not.toBeNull();
    },
    120000,
  );
});

describe("Zielwurf mit echtem Wurf", () => {
  const middle = (strength: number) => throwAt({ props: [] }, 0, strength)?.bin === 1;

  test("Treffer-Fenster: machbar, aber nicht automatisch", () => {
    let hits = 0;
    for (let s = 0; s <= 1.0001; s += 0.01) if (middle(s)) hits += 1;
    // 12–30 % der Zuglänge treffen (≈ 22–55 px auf dem iPhone)
    expect(hits).toBeGreaterThanOrEqual(12);
    expect(hits).toBeLessThanOrEqual(30);
  });

  test("viel zu lang prallt vom Deckel ab und geht daneben", () => {
    expect(middle(0.97)).toBe(false);
    expect(middle(1)).toBe(false);
  });

  test("zu kurz fällt davor", () => {
    expect(middle(0.5)).toBe(false);
  });
});

describe("Sterne", () => {
  test("1. Versuch 3 ★, bis 3 Versuche 2 ★, danach 1 ★", () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(2)).toBe(2);
    expect(starsFor(3)).toBe(2);
    expect(starsFor(4)).toBe(1);
    expect(starsFor(12)).toBe(1);
  });
});
