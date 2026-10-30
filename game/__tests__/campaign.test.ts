// Tests für die Kampagne (game/campaign.ts): Welten, Pools, Sterne, Freischalten.

import { describe, expect, test } from "@jest/globals";

import {
  currentStation,
  isUnlocked,
  type Station,
  STATIONS,
  starsFor,
  stationBins,
  stationPool,
  withStars,
  WORLDS,
} from "@/game/campaign";

describe("Welten und Stationen", () => {
  test("Jede Welt bringt genau eine neue Tonne (Welt 1: Papier vs. Rest)", () => {
    expect(WORLDS[0].bins).toEqual(["papier", "rest"]);
    for (let w = 1; w < WORLDS.length; w++) {
      const added = WORLDS[w].bins.filter((b) => !WORLDS[w - 1].bins.includes(b));
      expect(added).toEqual([WORLDS[w].newBin]);
    }
  });

  test("IDs sind eindeutig", () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  test("Jede Station: Ziel erreichbar und alle 3 Sternstufen möglich", () => {
    for (const s of STATIONS) {
      expect(s.goal).toBeGreaterThan(0);
      expect(s.goal).toBeLessThanOrEqual(s.total - 2);
      expect(starsFor(s, s.total - 1)).toBe(2);
    }
  });

  test("Pool hat Gegenstände für jede Tonne der Station – und nur für diese", () => {
    for (const s of STATIONS) {
      const pool = stationPool(s);
      const cats = new Set(stationBins(s).map((b) => b.category));
      expect(pool.length).toBeGreaterThanOrEqual(4);
      for (const c of cats) expect(pool.some((it) => it.category === c)).toBe(true);
      for (const it of pool) expect(cats.has(it.category)).toBe(true);
    }
  });

  test("Erste Station einer Welt nur leichte Gegenstände", () => {
    for (const w of WORLDS) {
      expect(stationPool(w.stations[0]).every((it) => it.difficulty === "leicht")).toBe(true);
    }
  });
});

describe("Sterne", () => {
  const station: Station = { id: "x", bins: ["papier", "rest"], upTo: "leicht", total: 10, goal: 7 };

  test("Ziel = 1, mehr = 2, alles = 3, darunter 0", () => {
    expect(starsFor(station, 6)).toBe(0);
    expect(starsFor(station, 7)).toBe(1);
    expect(starsFor(station, 9)).toBe(2);
    expect(starsFor(station, 10)).toBe(3);
  });

  test("Bester Lauf bleibt", () => {
    const a = withStars({}, "1-1", 2);
    expect(withStars(a, "1-1", 1)).toBe(a);
    expect(withStars(a, "1-1", 3)["1-1"]).toBe(3);
  });
});

describe("Freischalten", () => {
  test("Erste Station frei, nächste ab 1 Stern", () => {
    expect(isUnlocked({}, "1-1")).toBe(true);
    expect(isUnlocked({}, "1-2")).toBe(false);
    expect(isUnlocked({ "1-1": 1 }, "1-2")).toBe(true);
    expect(isUnlocked({ "1-4": 1 }, "2-1")).toBe(true);
    expect(isUnlocked({}, "9-9")).toBe(false);
  });

  test("Weiter geht es bei der ersten Station ohne Stern", () => {
    expect(currentStation({}).id).toBe("1-1");
    expect(currentStation({ "1-1": 3, "1-2": 1 }).id).toBe("1-3");
    const all = Object.fromEntries(STATIONS.map((s) => [s.id, 1]));
    expect(currentStation(all).id).toBe(STATIONS[STATIONS.length - 1].id);
  });
});
