// Datei: game/trick-solver.ts
// NUR FÜR TESTS: Löser für Trickwurf-Level. Probiert Würfe (Richtung ×
// Kraft × Abwurf-Zeitpunkt) mit derselben Rechnung wie das Spiel durch
// (swipeShot → echter Wurf → Physik) – so lässt sich prüfen, ob ein Level
// fair lösbar ist.

import * as THREE from "three";

import { BIN_OPENING_Y, computeLayout, shotLanding } from "./layout";
import { FULL_SWIPE_SHARE, swipeShot } from "./logic";
import { type BinCollider, lobVelocity, simulateShot } from "./physics";
import { levelColliders, levelPeriod, meetsRequirement, type TrickLevel } from "./trick-levels";

/** Deckel stehen im Trick-Modus offen (wie im Zielwurf). */
const LID_OPEN = 1.85;

export function createSolver(width = 390, height = 844) {
  const layout = computeLayout(width, height, 3);
  const bins: BinCollider[] = layout.bins.map((b) => ({ x: b.x, z: b.z, lid: LID_OPEN }));
  const binXs = layout.bins.map((b) => b.x);
  /** Wischlänge (px) für volle Kraft – wie im Spiel. */
  const full = FULL_SWIPE_SHARE * height;

  /** Ein Wurf: Winkel (Grad, 0 = gerade), Kraft (0…1; Wischlänge oder -tempo)
   *  und Szenen-Zeit beim Abwurf (bewegte Reifen). */
  function throwAt(level: Pick<TrickLevel, "props">, angle: number, strength: number, time = 0) {
    // Halten-Modus: Wischlänge = Kraft (ein schneller Wurf mit gleicher Kraft fliegt gleich)
    const length = 18 + strength * (full - 18);
    const rad = (angle * Math.PI) / 180;
    const shot = swipeShot(Math.sin(rad) * length, -Math.cos(rad) * length, full, layout.binAngles, binXs);
    if (!shot) return null;
    const land = shotLanding(layout, shot);
    const target = new THREE.Vector3(land.x, BIN_OPENING_Y + 0.1, land.z);
    const v = new THREE.Vector3();
    lobVelocity(v, layout.item.position, target);
    return simulateShot(layout.item.position, v, bins, levelColliders(level), time);
  }

  const success = (level: TrickLevel, angle: number, strength: number, time = 0) => {
    const r = throwAt(level, angle, strength, time);
    return !!r && r.bin === level.target && meetsRequirement(level, r.props);
  };

  return { layout, throwAt, success };
}

export const { layout, throwAt, success } = createSolver();

export type Solve = {
  /** Anteil erfolgreicher Würfe im Raster (über alle Zeitpunkte). */
  share: number;
  /** Bester Wurf: der mit den meisten erfolgreichen Zeitpunkten. */
  best: { angle: number; strength: number; time: number } | null;
  /** Treffer in der Zieltonne, aber ohne den nötigen Reifen. */
  withoutTrick: number;
  grid: string[];
};

/** Abwurf-Zeitpunkte, die probiert werden (ruhende Level: nur einer). */
export function sampleTimes(level: TrickLevel, count: number): number[] {
  const period = levelPeriod(level);
  return period > 0 ? Array.from({ length: count }, (_, i) => (period * i) / count) : [0];
}

export function solve(level: TrickLevel, solver = { throwAt }): Solve {
  const grid: string[] = [];
  const times = sampleTimes(level, 12);
  let ok = 0;
  let total = 0;
  let withoutTrick = 0;
  const cells: { angle: number; strength: number; time: number; wins: number }[] = [];
  for (let strength = 0; strength <= 1.0001; strength += 0.02) {
    let row = "";
    for (let angle = -30; angle <= 30; angle += 2) {
      let wins = 0;
      let firstWin = 0;
      let plain = false;
      for (const time of times) {
        total += 1;
        const r = solver.throwAt(level, angle, strength, time);
        if (r && r.bin === level.target && meetsRequirement(level, r.props)) {
          if (wins === 0) firstWin = time;
          wins += 1;
        } else if (r && r.bin === level.target) {
          withoutTrick += 1;
          plain = true;
        }
      }
      ok += wins;
      if (wins > 0) cells.push({ angle, strength, time: firstWin, wins });
      row += wins === times.length ? "#" : wins > 0 ? "*" : plain ? "o" : ".";
    }
    grid.push(`${strength.toFixed(2)} ${row}`);
  }
  // Bester Wurf: Mitte der Würfe mit den meisten erfolgreichen Zeitpunkten
  const most = Math.max(0, ...cells.map((c) => c.wins));
  const top = cells.filter((c) => c.wins === most);
  const pick = top[Math.floor(top.length / 2)];
  const best = pick ? { angle: pick.angle, strength: pick.strength, time: pick.time } : null;
  return { share: ok / total, best, withoutTrick, grid };
}
