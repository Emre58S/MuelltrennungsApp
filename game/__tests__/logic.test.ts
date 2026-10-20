// Tests für die reinen Spielregeln (game/logic.ts).
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { type Item } from "@/constants/items";

import {
  aimFromDrag,
  dailyItems,
  FEVER_EVERY,
  getMultiplier,
  getPoints,
  INITIAL_STATS,
  itemWeight,
  pickItem,
  recentLimit,
  seededRandom,
  type Stats,
  statsReducer,
} from "../logic";

const item = (name: string, difficulty: Item["difficulty"] = "leicht"): Item => ({
  emoji: "🧪",
  name,
  category: "Restmüll",
  difficulty,
});

describe("Wertung", () => {
  test("Multiplikator steigt mit der Serie", () => {
    expect(getMultiplier(0)).toBe(1);
    expect(getMultiplier(3)).toBe(1.5);
    expect(getMultiplier(5)).toBe(2);
    expect(getMultiplier(10)).toBe(3);
    expect(getMultiplier(50)).toBe(3);
  });

  test("Punkte: falsch gibt nie Punkte, Fieber verdoppelt", () => {
    expect(getPoints("wrong", 10, true)).toBe(0);
    expect(getPoints("correct", 0, false)).toBe(10);
    expect(getPoints("perfect", 0, false)).toBe(25);
    expect(getPoints("correct", 5, false)).toBe(20);
    expect(getPoints("correct", 5, true)).toBe(40);
  });
});

describe("Spielstand", () => {
  const play = (results: ("perfect" | "correct" | "wrong")[]): Stats =>
    results.reduce(
      (s, result) => statsReducer(s, { type: "result", result, points: getPoints(result, s.streak, false) }),
      INITIAL_STATS,
    );

  test("Serie zählt hoch und reißt bei Fehler ab", () => {
    const s = play(["correct", "perfect", "correct", "wrong", "correct"]);
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(3);
    expect(s.throws).toBe(5);
    expect(s.correct).toBe(4);
    expect(s.perfects).toBe(1);
  });

  test("Punkte berücksichtigen die Serie VOR dem Wurf", () => {
    // 10 + 10 + 10 + 15 (Serie 3 → ×1.5)
    const s = play(["correct", "correct", "correct", "correct"]);
    expect(s.score).toBe(45);
  });

  test("Schnelle Würfe: aufeinanderfolgende Reducer-Aufrufe verlieren nichts", () => {
    // Genau das passiert, wenn mehrere Würfe im selben Frame landen
    let s = INITIAL_STATS;
    for (let i = 0; i < FEVER_EVERY; i++) {
      s = statsReducer(s, { type: "result", result: "correct", points: getPoints("correct", s.streak, false) });
    }
    expect(s.streak).toBe(FEVER_EVERY);
    expect(s.throws).toBe(FEVER_EVERY);
  });

  test("reset setzt alles zurück", () => {
    const s = play(["correct", "correct"]);
    expect(statsReducer(s, { type: "reset" })).toEqual(INITIAL_STATS);
  });
});

describe("Zielen", () => {
  const angles = [-30, 0, 30];

  test("zu kurzer oder nach unten gerichteter Wisch zielt nicht", () => {
    expect(aimFromDrag(0, -10, angles)).toBeNull();
    expect(aimFromDrag(0, 80, angles)).toBeNull();
  });

  test("wählt die Tonne mit dem nächsten Winkel", () => {
    expect(aimFromDrag(0, -100, angles)?.binIndex).toBe(1);
    expect(aimFromDrag(-60, -100, angles)?.binIndex).toBe(0);
    expect(aimFromDrag(60, -100, angles)?.binIndex).toBe(2);
  });

  test("perfekt nur bei genauem Zielen", () => {
    expect(aimFromDrag(0, -100, angles)?.perfect).toBe(true);
    expect(aimFromDrag(25, -100, angles)?.perfect).toBe(false);
  });
});

describe("Lernende Item-Auswahl", () => {
  const now = Date.UTC(2026, 9, 20);

  test("oft falsch sortierte Items wiegen mehr", () => {
    const a = item("A");
    const fresh = itemWeight(a, { wrong: 0, streak: 1, lastWrong: 0 }, 20, now);
    const missed = itemWeight(a, { wrong: 3, streak: 0, lastWrong: now - 1000 }, 20, now);
    expect(missed).toBeGreaterThan(fresh * 2);
  });

  test("sicher gekonnte Items kommen seltener", () => {
    const a = item("A");
    const known = itemWeight(a, { wrong: 0, streak: 1, lastWrong: 0 }, 20, now);
    const mastered = itemWeight(a, { wrong: 0, streak: 6, lastWrong: 0 }, 20, now);
    expect(mastered).toBeLessThan(known);
  });

  test("schwere Items erst nach dem Aufwärmen", () => {
    const hard = item("H", "schwer");
    expect(itemWeight(hard, undefined, 0, now)).toBeLessThan(itemWeight(hard, undefined, 20, now));
    const easy = item("E", "leicht");
    expect(itemWeight(easy, undefined, 0, now)).toBeGreaterThan(itemWeight(hard, undefined, 0, now));
  });

  test("zuletzt gezeigte Items kommen nicht direkt wieder", () => {
    const pool = [item("A"), item("B"), item("C")];
    for (let i = 0; i < 50; i++) {
      const picked = pickItem(pool, () => 1, ["A", "B"]);
      expect(picked?.name).toBe("C");
    }
  });

  test("Auswahl folgt den Gewichten", () => {
    const pool = [item("A"), item("B")];
    const rand = seededRandom(1);
    let a = 0;
    for (let i = 0; i < 2000; i++) {
      if (pickItem(pool, (it) => (it.name === "A" ? 3 : 1), [], rand)?.name === "A") a++;
    }
    expect(a / 2000).toBeGreaterThan(0.68);
    expect(a / 2000).toBeLessThan(0.82);
  });

  test("Sperrliste passt sich der Pool-Größe an", () => {
    expect(recentLimit(1)).toBe(0);
    expect(recentLimit(3)).toBe(2);
    expect(recentLimit(40)).toBe(4);
  });
});

describe("Tagesaufgabe", () => {
  const pool = Array.from({ length: 30 }, (_, i) => item(`Item ${i}`));

  test("gleiches Datum → gleiche Items (auch bei anderer Pool-Reihenfolge)", () => {
    const a = dailyItems(pool, "2026-10-20").map((i) => i.name);
    const b = dailyItems([...pool].reverse(), "2026-10-20").map((i) => i.name);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
  });

  test("anderes Datum → andere Auswahl", () => {
    const a = dailyItems(pool, "2026-10-20").map((i) => i.name);
    const b = dailyItems(pool, "2026-10-21").map((i) => i.name);
    expect(a).not.toEqual(b);
  });
});
