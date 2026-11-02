// Tests für die Kampagne (game/campaign.ts): Welten, Pools, Sterne, Freischalten.

import { describe, expect, test } from "@jest/globals";

import { TRICK_LEVELS } from "@/game/trick-levels";

import {
  currentStation,
  freePlayBins,
  headStartStars,
  parseFreeBins,
  introExamples,
  isUnlocked,
  nextStation,
  stationMode,
  stationStars,
  trickTarget,
  TRICKS_PER_WORLD,
  worldTricks,
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
    expect(isUnlocked({ "1-7": 1 }, "2-1")).toBe(true);
    // schon gespielt bleibt frei, auch wenn davor eine Station dazukam
    expect(isUnlocked({ "1-6": 1, "2-1": 2 }, "2-1")).toBe(true);
    expect(isUnlocked({ "1-6": 1 }, "2-1")).toBe(false);
    expect(isUnlocked({}, "9-9")).toBe(false);
  });

  test("Weiter geht es bei der ersten Station ohne Stern", () => {
    expect(currentStation({}).id).toBe("1-1");
    expect(currentStation({ "1-1": 3, "1-2": 1 }).id).toBe("1-3");
    const all = Object.fromEntries(STATIONS.map((s) => [s.id, 1]));
    expect(currentStation(all).id).toBe(STATIONS[STATIONS.length - 1].id);
  });

  test("Freies Spiel: Tonnen der aktuellen Welt", () => {
    expect(freePlayBins({})).toEqual(["papier", "rest"]);
    const world1 = Object.fromEntries(WORLDS[0].stations.map((s) => [s.id, 1]));
    expect(freePlayBins(world1)).toEqual(WORLDS[1].bins);
    const all = Object.fromEntries(STATIONS.map((s) => [s.id, 1]));
    expect(freePlayBins(all)).toHaveLength(6);
  });

  test("Vorsprung nach Level: bekannte Welten gelten als geschafft", () => {
    expect(headStartStars(1)).toEqual({});
    // Papier kommt mit Level 3 – erst ab Level 4 „schon länger bekannt“
    expect(headStartStars(3)).toEqual({});
    expect(currentStation(headStartStars(4)).id).toBe("3-1");
    expect(currentStation(headStartStars(6)).id).toBe("5-1");
    expect(currentStation(headStartStars(8)).id).toBe("6-1");
    expect(currentStation(headStartStars(99)).id).toBe("6-1");
    expect(Object.values(headStartStars(99)).every((n) => n === 1)).toBe(true);
  });

  test("Freies Spiel: Tonnen aus dem Link", () => {
    expect(parseFreeBins("papier,rest")).toEqual(["papier", "rest"]);
    expect(parseFreeBins("papier,quatsch,glas")).toEqual(["papier", "glas"]);
    expect(parseFreeBins("papier")).toBeUndefined();
    expect(parseFreeBins(undefined)).toBeUndefined();
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
    expect(nextStation("1-7")?.id).toBe("2-1");
    expect(nextStation(STATIONS[STATIONS.length - 1].id)).toBeUndefined();
  });
});

describe("Stations-Arten", () => {
  test("jede Lern-Welt: einmal Ohne Fehler, einmal Zeit, Start normal, vor dem Boss normal", () => {
    for (const w of WORLDS.filter((wo) => wo.newBins.length > 0)) {
      const kinds = w.stations.map((s) => s.kind);
      expect(kinds.filter((k) => k === "survival")).toHaveLength(1);
      expect(kinds.filter((k) => k === "time")).toHaveLength(1);
      expect(kinds[0]).toBeUndefined();
      expect(kinds[kinds.length - 2]).toBeUndefined();
    }
  });

  test("Spielart der Runde folgt der Art", () => {
    const of = (kind?: string) => STATIONS.find((s) => s.kind === kind)!;
    expect(stationMode(of(undefined))).toBe("endless");
    expect(stationMode(of("survival"))).toBe("survival");
    expect(stationMode(of("time"))).toBe("time");
  });
});

describe("Trick-Schule", () => {
  test("alle 24 Trick-Level verteilt, je Welt 4, keines doppelt", () => {
    const all = WORLDS.flatMap((w) => worldTricks(w));
    expect(WORLDS.length * TRICKS_PER_WORLD).toBe(TRICK_LEVELS.length);
    expect(new Set(all).size).toBe(TRICK_LEVELS.length);
    expect(all.every((id) => TRICK_LEVELS.some((l) => l.id === id))).toBe(true);
  });

  test("startet das erste offene Level; gesperrt, solange das davor fehlt", () => {
    expect(trickTarget(WORLDS[0], {})).toEqual({ level: 1, locked: false });
    expect(trickTarget(WORLDS[0], { 1: 2, 2: 1 })).toEqual({ level: 3, locked: false });
    expect(trickTarget(WORLDS[1], {})).toEqual({ level: 5, locked: true });
    expect(trickTarget(WORLDS[1], { 4: 1 })).toEqual({ level: 5, locked: false });
    // alles mit Stern: das mit den wenigsten
    expect(trickTarget(WORLDS[0], { 1: 3, 2: 1, 3: 3, 4: 2 }).level).toBe(2);
  });
});

describe("Boss", () => {
  test("jede Welt endet mit genau einem Boss: 10 in Folge, höchstens 20 Würfe, Runde wie Üben", () => {
    for (const w of WORLDS) {
      const bosses = w.stations.filter((st) => st.kind === "boss");
      expect(bosses).toHaveLength(1);
      expect(w.stations[w.stations.length - 1]).toBe(bosses[0]);
      expect(bosses[0].goal).toBe(10);
      expect(bosses[0].total).toBe(20);
      expect(stationMode(bosses[0])).toBe("endless");
      expect(stationPool(bosses[0]).length).toBeGreaterThanOrEqual(10);
    }
  });

  test("Sterne: Serie zählt, Fehler entscheiden über 2 und 3", () => {
    const boss = STATIONS.find((st) => st.kind === "boss")!;
    expect(stationStars(boss, { correct: 9, throws: 9, maxStreak: 9 })).toBe(0);
    expect(stationStars(boss, { correct: 10, throws: 10, maxStreak: 10 })).toBe(3);
    expect(stationStars(boss, { correct: 12, throws: 15, maxStreak: 10 })).toBe(2);
    expect(stationStars(boss, { correct: 14, throws: 20, maxStreak: 10 })).toBe(1);
    // ohne 10 in Folge: kein Stern, auch bei vielen richtigen
    expect(stationStars(boss, { correct: 18, throws: 20, maxStreak: 8 })).toBe(0);
  });

  test("andere Stationen: Sterne wie bisher", () => {
    const s0 = STATIONS[0];
    expect(stationStars(s0, { correct: 7, throws: 10, maxStreak: 3 })).toBe(starsFor(s0, 7));
  });
});
