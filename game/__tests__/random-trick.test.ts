// Test für den Zufalls-Trick (game/trick-levels.ts): gleicher Seed = gleicher
// Trick, und er stammt immer aus den geprüften Leveln/Vorlagen (ggf. gespiegelt).

import { describe, expect, test } from "@jest/globals";

import { DAILY_TEMPLATES, mirrorLevel, randomTrick, TRICK_LEVELS } from "../trick-levels";

describe("Zufalls-Trick", () => {
  test("gleicher Seed = gleicher Trick, immer aus den geprüften Leveln", () => {
    expect(randomTrick(42)).toEqual(randomTrick(42));
    const known = new Set(
      [...TRICK_LEVELS.map(({ id: _id, ...l }) => l), ...DAILY_TEMPLATES].flatMap((l) => [
        JSON.stringify(l),
        JSON.stringify(mirrorLevel(l)),
      ]),
    );
    for (let seed = 1; seed < 60; seed++) {
      const { id, ...level } = randomTrick(seed);
      expect(id).toBe(0);
      expect(known.has(JSON.stringify(level))).toBe(true);
    }
  });
});
