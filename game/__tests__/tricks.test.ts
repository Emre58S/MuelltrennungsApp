// Tests für die Trickwurf-Level (game/trick-levels.ts): jedes Level ist mit
// einem fairen Fenster an Würfen lösbar – und ohne Trick zählt es nicht.
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { meetsRequirement, starsFor, TRICK_LEVELS, type TrickLevel } from "../trick-levels";
import { solve, throwAt } from "../trick-solver";

const success = (level: TrickLevel, angle: number, strength: number) => {
  const r = throwAt(level, angle, strength);
  return !!r && r.bin === level.target && meetsRequirement(level, r.props);
};

describe("Trickwurf-Level", () => {
  test.each(TRICK_LEVELS.map((l) => [l.id, l] as const))(
    "Level %i: lösbar, faires Fenster, ohne Trick zählt nicht",
    (_id, level) => {
      const s = solve(level);
      expect(s.best).not.toBeNull();
      const { angle, strength } = s.best!;

      // Tempo-Fenster am besten Wurf: mindestens ±0,04 Stärke
      let tempo = 0;
      for (let k = -0.1; k <= 0.1001; k += 0.01) if (success(level, angle, strength + k)) tempo += 1;
      expect(tempo).toBeGreaterThanOrEqual(8);

      // Richtungs-Fenster: mindestens 5° breit
      let direction = 0;
      for (let a = -12; a <= 12; a += 1) if (success(level, angle + a, strength)) direction += 1;
      expect(direction).toBeGreaterThanOrEqual(5);

      // Ein direkter Treffer in die Zieltonne ist möglich – zählt aber nicht
      expect(s.withoutTrick).toBeGreaterThan(0);
    },
    60000,
  );
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
