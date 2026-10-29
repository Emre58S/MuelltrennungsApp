// Tests für die Medaillen je Gegenstand (game/mastery.ts) und die neuen
// Gold-Wurfspuren (game/rewards.ts).

import { describe, expect, test } from "@jest/globals";

import { goldCount, MEDAL_AT, medalFor, medalUp, nextMedal } from "../mastery";
import { isUnlocked, newlyUnlocked, TRAILS } from "../rewards";

describe("Medaillen", () => {
  test("Stufen nach richtigen Würfen", () => {
    expect(medalFor(0)).toBeNull();
    expect(medalFor(MEDAL_AT.bronze - 1)).toBeNull();
    expect(medalFor(MEDAL_AT.bronze)).toBe("bronze");
    expect(medalFor(MEDAL_AT.silver)).toBe("silver");
    expect(medalFor(MEDAL_AT.gold)).toBe("gold");
    expect(medalFor(999)).toBe("gold");
  });

  test("Aufstieg genau beim Erreichen – sonst nicht", () => {
    expect(medalUp(MEDAL_AT.bronze - 1, MEDAL_AT.bronze)).toBe("bronze");
    expect(medalUp(MEDAL_AT.bronze, MEDAL_AT.bronze + 1)).toBeNull();
    expect(medalUp(MEDAL_AT.gold - 1, MEDAL_AT.gold)).toBe("gold");
    expect(medalUp(MEDAL_AT.gold, MEDAL_AT.gold + 1)).toBeNull();
  });

  test("Weg zur nächsten Medaille", () => {
    expect(nextMedal(0)).toEqual({ medal: "bronze", left: MEDAL_AT.bronze });
    expect(nextMedal(MEDAL_AT.bronze)).toEqual({ medal: "silver", left: MEDAL_AT.silver - MEDAL_AT.bronze });
    expect(nextMedal(MEDAL_AT.gold)).toBeNull();
  });

  test("Gold zählen", () => {
    expect(goldCount({ a: { correct: MEDAL_AT.gold }, b: { correct: 2 }, c: { correct: 40 } })).toBe(2);
    expect(goldCount({})).toBe(0);
  });

  test("Gold-Spuren: frei ab genug Gold-Gegenständen, alte Stände ohne gold bleiben gültig", () => {
    const smaragd = TRAILS.find((r) => r.id === "smaragd")!;
    expect(isUnlocked(smaragd, { stars: 99, level: 99 })).toBe(false);
    expect(isUnlocked(smaragd, { stars: 0, level: 0, gold: smaragd.gold! })).toBe(true);
    const fresh = newlyUnlocked({ stars: 0, level: 0, gold: smaragd.gold! - 1 }, { stars: 0, level: 0, gold: smaragd.gold! });
    expect(fresh.map((r) => r.id)).toEqual(["smaragd"]);
  });
});
