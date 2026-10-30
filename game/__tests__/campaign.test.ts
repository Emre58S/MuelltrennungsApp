// Tests für die Kampagne (game/campaign.ts): Welten, Pools, Sterne, Freischalten.

import { describe, expect, test } from "@jest/globals";

import {
  currentStation,
  introExamples,
  isUnlocked,
  nextStation,
  type Station,
  STATIONS,
  starsFor,
  stationBins,
  stationPool,
  stationQueue,
  withStars,
  WORLDS,
} from "@/game/campaign";

describe("Welten und Stationen", () => {
  test("Welt 1 Papier vs. Rest, dann je eine neue Tonne, zuletzt Knifflige Fälle", () => {
    expect(WORLDS[0].bins).toEqual(["papier", "rest"]);
    expect(WORLDS[0].newBins).toEqual(["papier", "rest"]);
    for (let w = 1; w < WORLDS.length; w++) {
      const added = WORLDS[w].bins.filter((b) => !WORLDS[w - 1].bins.includes(b));
      expect(added).toEqual(WORLDS[w].newBins);
    }
    const last = WORLDS[WORLDS.length - 1];
    expect(last.newBins).toEqual([]);
    expect(last.bins.length).toBe(6);
  });

  test("Knifflige Fälle: jeder Name gibt es wirklich, mehrere Tonnen je Station", () => {
    for (const s of WORLDS[WORLDS.length - 1].stations) {
      expect(s.items).toBeDefined();
      expect(stationPool(s).length).toBe(s.items?.length);
      expect(new Set(stationPool(s).map((it) => it.category)).size).toBeGreaterThanOrEqual(3);
    }
  });

  test("Keine Tonne allein reicht fürs Ziel (Stationen mit fester Liste)", () => {
    for (const s of STATIONS.filter((st) => st.items)) {
      const pool = stationPool(s);
      const counts = new Map<string, number>();
      for (const it of pool) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
      const most = Math.max(...counts.values());
      expect((most / pool.length) * s.total).toBeLessThan(s.goal);
    }
  });

  test("Lernkarte: 3 Beispiele für jede neue Tonne", () => {
    for (const w of WORLDS) {
      for (const b of w.newBins) expect(introExamples(b)).toHaveLength(3);
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
    for (const s of STATIONS.filter((st) => !st.items)) {
      const pool = stationPool(s);
      const cats = new Set(stationBins(s).map((b) => b.category));
      expect(pool.length).toBeGreaterThanOrEqual(4);
      for (const c of cats) expect(pool.some((it) => it.category === c)).toBe(true);
      for (const it of pool) expect(cats.has(it.category)).toBe(true);
    }
  });

  test("Erste Station einer Lern-Welt nur leichte Gegenstände", () => {
    for (const w of WORLDS.filter((wo) => wo.newBins.length > 0)) {
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

describe("Runde einer Station", () => {
  test("jede Station hat genug Würfe, nur Gegenstände aus dem Pool, ohne Doppelte", () => {
    for (const s of STATIONS) {
      const queue = stationQueue(s);
      const pool = new Set(stationPool(s));
      expect(queue).toHaveLength(s.total);
      expect(queue.every((it) => pool.has(it))).toBe(true);
      if (pool.size >= s.total) expect(new Set(queue).size).toBe(s.total);
      for (let i = 1; i < queue.length; i++) expect(queue[i]).not.toBe(queue[i - 1]);
    }
  });

  test("kleiner Pool: neu mischen, nie zweimal hintereinander", () => {
    const small: Station = { ...STATIONS[0], items: ["Zeitung", "Kaugummi"], total: 10 };
    for (let n = 0; n < 20; n++) {
      const queue = stationQueue(small);
      expect(queue).toHaveLength(10);
      for (let i = 1; i < queue.length; i++) expect(queue[i]).not.toBe(queue[i - 1]);
    }
  });

  test("nächste Station", () => {
    expect(nextStation("1-1")?.id).toBe("1-2");
    expect(nextStation("1-4")?.id).toBe("2-1");
    expect(nextStation(STATIONS[STATIONS.length - 1].id)).toBeUndefined();
  });
});
