// Tests für die reinen Spielregeln (game/logic.ts).
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { type Item } from "@/constants/items";

import {
  aimFromDrag,
  dailyItems,
  FEVER_EVERY,
  aimBonus,
  missAssist,
  pullShot,
  pullStrength,
  SWEET_STRENGTH,
  throwDepth,
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

describe("Zielwurf (zurückziehen und loslassen)", () => {
  const angles = [-30, 0, 30];
  const xs = [-1.3, 0, 1.3];
  const full = 200;
  /** Zuglänge (px) für eine bestimmte Kraft. */
  const pull = (strength: number) => 18 + strength * (full - 18);
  /** Finger nach unten gezogen, Wurfrichtung `deg` (0 = gerade). */
  const at = (deg: number, length: number, opts = {}) => {
    const rad = (deg * Math.PI) / 180;
    return pullShot(-Math.sin(rad) * length, Math.cos(rad) * length, full, angles, xs, opts);
  };

  test("gerade und genau richtig gezogen: mitten in die mittlere Tonne", () => {
    const shot = at(0, pull(SWEET_STRENGTH));
    expect(shot?.binIndex).toBe(1);
    expect(shot?.perfect).toBe(true);
  });

  test("zu kurz gezogen fällt vor die Tonne, zu lang fliegt drüber", () => {
    const short = at(0, pull(0.2));
    expect(short?.binIndex).toBeNull();
    expect(short?.depth).toBeGreaterThan(0);
    const long = at(0, pull(1));
    expect(long?.binIndex).toBeNull();
    expect(long?.depth).toBeLessThan(0);
  });

  test("seitlich ziehen wirft zur Gegenseite", () => {
    // Finger nach unten LINKS → Wurf nach rechts
    expect(pullShot(-58, 100, full, angles, xs)?.binIndex).toBe(2);
    expect(pullShot(58, 100, full, angles, xs)?.binIndex).toBe(0);
  });

  test("zwischen zwei Tonnen geht daneben", () => {
    expect(at(15, pull(SWEET_STRENGTH))?.binIndex).toBeNull();
  });

  test("knapp daneben trifft den Rand", () => {
    const rim = at(0, pull(0.47));
    expect(rim?.binIndex).toBeNull();
    expect(rim?.rimIndex).toBe(1);
  });

  test("je länger gezogen, desto weiter der Wurf", () => {
    for (let s = 0; s < 1; s += 0.1) expect(throwDepth(s)).toBeGreaterThan(throwDepth(s + 0.1));
    expect(throwDepth(SWEET_STRENGTH)).toBe(0);
    // Rund um die Tonne gutmütig: ±0,03 Kraft bleibt in der Öffnung (0,4)
    expect(Math.abs(throwDepth(SWEET_STRENGTH - 0.03))).toBeLessThan(0.4);
    expect(Math.abs(throwDepth(SWEET_STRENGTH + 0.03))).toBeLessThan(0.4);
  });

  test("Kraft aus der Zuglänge: 0 am Anfang, 1 ab voller Länge", () => {
    expect(pullStrength(18, full)).toBe(0);
    expect(pullStrength(full, full)).toBe(1);
    expect(pullStrength(full * 2, full)).toBe(1);
  });

  test("Richtungshilfe: knapp neben der Tonne wird hineingezogen", () => {
    // ~0,5 neben der mittleren Tonne → ohne Hilfe außerhalb (0,4)
    expect(at((0.5 / 1.3) * 30, pull(SWEET_STRENGTH))?.binIndex).toBe(1);
  });

  test("zu wenig oder nach oben gezogen: kein Wurf", () => {
    expect(pullShot(0, 10, full, angles, xs)).toBeNull();
    expect(pullShot(0, -120, full, angles, xs)).toBeNull();
  });
});

describe("Zielwurf: Pech-Hilfe", () => {
  test("Pech-Hilfe erst ab 2 Fehlwürfen, dann zunehmend", () => {
    expect(missAssist(0)).toBe(0);
    expect(missAssist(1)).toBe(0);
    expect(missAssist(2)).toBe(0.5);
    expect(missAssist(3)).toBe(1);
    expect(missAssist(9)).toBe(1);
  });

  test("Pech-Hilfe macht knappe Fehlwürfe zu Treffern, weite nicht", () => {
    const angles = [-30, 0, 30];
    const xs = [-1.3, 0, 1.3];
    const full = 200;
    const length = (strength: number) => 18 + strength * (full - 18);
    const close = pullShot(0, length(0.47), full, angles, xs);
    expect(close?.binIndex).toBeNull();
    const helped = pullShot(0, length(0.47), full, angles, xs, { assist: 1 });
    expect(helped?.binIndex).toBe(1);
    const far = pullShot(0, length(0.3), full, angles, xs, { assist: 1 });
    expect(far?.binIndex).toBeNull();
  });
});

describe("Zielwurf-Boni", () => {
  test("Swish bringt Zeit, Deckel Punkte und Zeit, Rand etwas Punkte", () => {
    expect(aimBonus({ perfect: true, via: null }, 30)).toEqual({ factor: 1, seconds: 2 });
    expect(aimBonus({ perfect: false, via: "lid" }, 30)).toEqual({ factor: 1.5, seconds: 1 });
    expect(aimBonus({ perfect: false, via: "rim" }, 30)).toEqual({ factor: 1.2, seconds: 0 });
    expect(aimBonus({ perfect: false, via: "wall" }, 30)).toEqual({ factor: 1, seconds: 0 });
  });

  test("Endspurt verdoppelt in den letzten 10 Sekunden", () => {
    expect(aimBonus({ perfect: false, via: null }, 10).factor).toBe(2);
    expect(aimBonus({ perfect: false, via: "lid" }, 5).factor).toBe(3);
    expect(aimBonus({ perfect: false, via: null }, 11).factor).toBe(1);
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
