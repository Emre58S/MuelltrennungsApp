// Tests für die Trickwurf-Level (game/trick-levels.ts): jedes Level und jede
// Tages-Vorlage ist mit einem fairen Fenster an Würfen lösbar – bei Bewegung
// auch mit einem fairen Zeitfenster, im Wind mit jedem Gewicht – und das auch
// auf einem kleinen iPhone. Dazu: Sterne, Tages-Trick, Gewicht im Zielwurf.
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";
import * as THREE from "three";

import { type Mass, MASS_FEEL } from "../item-mass";
import { BIN_OPENING_Y, shotLanding } from "../layout";
import { FULL_SWIPE_SHARE, swipeShot } from "../logic";
import { lobVelocity, simulateShot } from "../physics";
import {
  bankedOff,
  bonusMet,
  DAILY_TEMPLATES,
  dailyTrick,
  hasWind,
  levelPeriod,
  meetsRequirement,
  mirrorLevel,
  starsFor,
  TRICK_LEVELS,
  type TrickLevel,
} from "../trick-levels";
import { createSolver, layout, sampleTimes, success, throwAt } from "../trick-solver";

type Level = Omit<TrickLevel, "id">;
const small = createSolver(375, 667);

/** Bester Wurf: unter den Würfen, die zu den meisten Zeitpunkten treffen,
 *  der mittlere (Richtung und Kraft) – dort, wo ein Spieler hinzielt. */
function findBest(level: Level, hit: typeof success = success, mass: Mass = "normal") {
  const times = sampleTimes(level, 12);
  const cells: { angle: number; strength: number; times: number[]; n: number }[] = [];
  for (let strength = 0.6; strength <= 0.86; strength += 0.02)
    for (let angle = -28; angle <= 28; angle += 2) {
      const ok = times.filter((t) => hit(level, angle, strength, t, mass));
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

/** Lösbar mit fairem Fenster (für ein Gewicht). */
function expectFair(level: Level, mass: Mass = "normal") {
  const best = findBest(level, success, mass);
  expect(best).not.toBeNull();
  const { angle, strength, times } = best!;

  // Zum günstigsten Zeitpunkt (Bewegung: wenn es gut steht):
  // Weiten-Fenster mindestens 0,1 Kraft (≈ 18 px), Richtung mindestens 6°
  let reach = 0;
  let direction = 0;
  for (const time of times) {
    let r = 0;
    for (let k = -0.15; k <= 0.1501; k += 0.01) if (success(level, angle, strength + k, time, mass)) r += 1;
    let d = 0;
    for (let a = -12; a <= 12; a += 1) if (success(level, angle + a, strength, time, mass)) d += 1;
    reach = Math.max(reach, r);
    direction = Math.max(direction, d);
  }
  expect(reach).toBeGreaterThanOrEqual(10);
  expect(direction).toBeGreaterThanOrEqual(6);

  // Bewegung: das Timing zählt – aber mindestens 20 % der Zeit passt es
  if (levelPeriod(level) > 0) {
    const all = sampleTimes(level, 40);
    const share = all.filter((t) => success(level, angle, strength, t, mass)).length / all.length;
    expect(share).toBeGreaterThanOrEqual(0.2);
    expect(share).toBeLessThan(0.95);
  }
}

const cases: [string, Level][] = [
  ...TRICK_LEVELS.map((l): [string, Level] => [`Level ${l.id}`, l]),
  ...DAILY_TEMPLATES.map((l, i): [string, Level] => [`Tages-Vorlage ${i + 1}`, l]),
];

describe("Trickwurf-Level", () => {
  test.each(cases)(
    "%s: lösbar mit fairem Fenster (auch auf kleinem iPhone, im Wind mit jedem Gewicht)",
    (_name, level) => {
      expectFair(level);
      // Wind: Leichtes treibt weit ab, Schweres kaum – lösbar muss es mit allem sein
      if (hasWind(level)) {
        expectFair(level, "leicht");
        expectFair(level, "schwer");
      }
      expect(findBest(level, small.success)).not.toBeNull();
    },
    240000,
  );

  test("Gespiegelte Level sind genauso lösbar (Szene ist symmetrisch)", () => {
    const level = TRICK_LEVELS.find((l) => l.id === 13)!;
    expect(findBest(mirrorLevel(level))).not.toBeNull();
  }, 120000);

  test("Wind schiebt leichte Gegenstände weiter als schwere", () => {
    const level = TRICK_LEVELS.find((l) => l.id === 9)!;
    // Gerade auf die rechte Tonne gezielt: Mit Wind landet es nicht dort – leicht noch weniger
    const straight = (mass: Mass) => {
      let hits = 0;
      for (let s = 0.6; s <= 0.86; s += 0.02) if (success(level, 18.7, s, 0, mass)) hits += 1;
      return hits;
    };
    expect(straight("leicht")).toBeLessThanOrEqual(straight("schwer"));
  });

  // Bonus „Swish“ muss mit normalen Würfen erreichbar sein – nicht nur mit
  // einem Glückswurf: im Spieler-Raster (Kraft 0,6–0,86, Richtung in 2°)
  // mindestens drei verschiedene saubere Würfe (also mindestens 4° breit) –
  // auf dem großen UND dem kleinen iPhone
  const swishCases = cases
    .filter(([, l]) => l.bonus === "swish")
    .flatMap(([name, l]): [string, string, Level, typeof small][] => [
      [name, "groß", l, { layout, throwAt, success }],
      [name, "klein", l, small],
    ]);
  test.each(swishCases)(
    "%s (%s): Swish-Bonus ist mit mehreren normalen Würfen erreichbar",
    (_name, _device, level, solver) => {
      const times = sampleTimes(level, 12);
      const cells: { angle: number; strength: number }[] = [];
      for (let strength = 0.6; strength <= 0.8601; strength += 0.02)
        for (let angle = -28; angle <= 28; angle += 2)
          for (const time of times) {
            const r = solver.throwAt(level, angle, strength, time);
            if (r && r.clean && r.bin === level.target && meetsRequirement(level, r.props)) {
              cells.push({ angle, strength });
              break;
            }
          }
      expect(cells.length).toBeGreaterThanOrEqual(3);
    },
    240000,
  );

  // Bonus „Bandenwurf“: mehrere normale Würfe prallen vom Schild in die Zieltonne
  const bankCases = cases
    .filter(([, l]) => l.bonus === "bank")
    .flatMap(([name, l]): [string, string, Level, typeof small][] => [
      [name, "groß", l, { layout, throwAt, success }],
      [name, "klein", l, small],
    ]);
  test.each(bankCases)(
    "%s (%s): Bandenwurf-Bonus ist mit mehreren normalen Würfen erreichbar",
    (_name, _device, level, solver) => {
      let cells = 0;
      for (let strength = 0.6; strength <= 0.8601; strength += 0.02)
        for (let angle = -28; angle <= 28; angle += 2) {
          const r = solver.throwAt(level, angle, strength, 0);
          if (r && r.bin === level.target && bankedOff(level, r.props)) cells += 1;
        }
      expect(cells).toBeGreaterThanOrEqual(3);
    },
    240000,
  );
});

describe("Tages-Trick", () => {
  test("für alle gleich und täglich anders", () => {
    expect(dailyTrick("2026-10-26")).toEqual(dailyTrick("2026-10-26"));
    const days = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
    const distinct = new Set(days.map((d) => JSON.stringify(dailyTrick(d))));
    expect(distinct.size).toBeGreaterThan(1);
    expect(dailyTrick("2026-10-26").id).toBe(0);
  });
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

  test("schwer und leicht: anderer Bogen, aber ebenso treffbar", () => {
    const bins = layout.bins.map((b) => ({ x: b.x, z: b.z, lid: 1.85 }));
    const full = FULL_SWIPE_SHARE * 844;
    const hitsFor = (mass: Mass) => {
      let hits = 0;
      for (let s = 0; s <= 1.0001; s += 0.01) {
        const shot = swipeShot(0, -(18 + s * (full - 18)), full, layout.binAngles, layout.bins.map((b) => b.x));
        if (!shot) continue;
        const land = shotLanding(layout, shot);
        const v = new THREE.Vector3();
        lobVelocity(v, layout.item.position, new THREE.Vector3(land.x, BIN_OPENING_Y + 0.1, land.z), MASS_FEEL[mass].loft);
        if (simulateShot(layout.item.position, v, bins).bin === 1) hits += 1;
      }
      return hits;
    };
    for (const mass of ["leicht", "schwer"] as Mass[]) {
      expect(hitsFor(mass)).toBeGreaterThanOrEqual(10);
      expect(hitsFor(mass)).toBeLessThanOrEqual(34);
    }
  });
});

describe("Sterne", () => {
  test("★ geschafft · ★ höchstens 3 Versuche · ★ Bonus-Ziel", () => {
    expect(starsFor(1, true)).toBe(3);
    expect(starsFor(1, false)).toBe(2);
    expect(starsFor(3, false)).toBe(2);
    expect(starsFor(4, false)).toBe(1);
    expect(starsFor(6, true)).toBe(2);
  });

  test("Bonus-Ziele: Swish = ohne Berührung, firstTry = 1. Versuch, bank = übers Schild", () => {
    expect(bonusMet("swish", { attempts: 4, clean: true })).toBe(true);
    expect(bonusMet("swish", { attempts: 1, clean: false })).toBe(false);
    expect(bonusMet("firstTry", { attempts: 1, clean: false })).toBe(true);
    expect(bonusMet("firstTry", { attempts: 2, clean: true })).toBe(false);
    expect(bonusMet("bank", { attempts: 1, clean: true })).toBe(false);
    expect(bonusMet("bank", { attempts: 5, clean: false, banked: true })).toBe(true);
  });
});
