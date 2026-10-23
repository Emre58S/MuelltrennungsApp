// Datei: game/trick-solver.ts
// NUR FÜR TESTS: Löser für Trickwurf-Level. Probiert Würfe (Richtung ×
// Kraft) mit derselben Rechnung wie das Spiel durch (pullShot → echter
// Wurf → Physik) – so lässt sich prüfen, ob ein Level fair lösbar ist.

import * as THREE from "three";

import { BIN_OPENING_Y, computeLayout, shotLanding } from "./layout";
import { FULL_PULL_SHARE, pullShot } from "./logic";
import { type BinCollider, lobVelocity, simulateShot } from "./physics";
import { levelColliders, meetsRequirement, type TrickLevel } from "./trick-levels";

/** Deckel stehen im Trick-Modus offen (wie im Zielwurf). */
const LID_OPEN = 1.85;
const SCREEN_H = 844;

export const layout = computeLayout(390, SCREEN_H, 3);
const bins: BinCollider[] = layout.bins.map((b) => ({ x: b.x, z: b.z, lid: LID_OPEN }));
const binXs = layout.bins.map((b) => b.x);
/** Zuglänge (px) für volle Kraft – wie im Spiel. */
export const FULL_PULL = FULL_PULL_SHARE * SCREEN_H;

/** Ein Wurf: Winkel (Grad, 0 = gerade) und Kraft (0…1 der vollen Zuglänge). */
export function throwAt(level: Pick<TrickLevel, "props" | "chain">, angle: number, strength: number) {
  // Zurückziehen: Finger nach unten, entgegen der Wurfrichtung
  const length = 18 + strength * (FULL_PULL - 18);
  const rad = (angle * Math.PI) / 180;
  const shot = pullShot(-Math.sin(rad) * length, Math.cos(rad) * length, FULL_PULL, layout.binAngles, binXs);
  if (!shot) return null;
  const land = shotLanding(layout, shot);
  const target = new THREE.Vector3(land.x, BIN_OPENING_Y + 0.1, land.z);
  const v = new THREE.Vector3();
  lobVelocity(v, layout.item.position, target);
  return simulateShot(layout.item.position, v, bins, levelColliders(level));
}

export type Solve = {
  /** Anteil erfolgreicher Würfe im Raster. */
  share: number;
  /** Ein erfolgreicher Wurf (Mitte des größten Treffer-Bereichs). */
  best: { angle: number; strength: number } | null;
  /** Treffer in der Zieltonne, aber ohne den nötigen Trick. */
  withoutTrick: number;
  grid: string[];
};

export function solve(level: TrickLevel): Solve {
  const grid: string[] = [];
  let ok = 0;
  let total = 0;
  let withoutTrick = 0;
  const wins: { angle: number; strength: number }[] = [];
  for (let strength = 0; strength <= 1.0001; strength += 0.025) {
    let row = "";
    for (let angle = -30; angle <= 30; angle += 2) {
      total += 1;
      const r = throwAt(level, angle, strength);
      if (r && r.bin === level.target && meetsRequirement(level, r.props)) {
        ok += 1;
        wins.push({ angle, strength });
        row += "#";
      } else if (r && r.bin === level.target) {
        withoutTrick += 1;
        row += "o";
      } else if (r && r.bin !== null) row += "x";
      else row += r?.props.length ? "+" : ".";
    }
    grid.push(`${strength.toFixed(2)} ${row}`);
  }
  const best = wins.length ? wins[Math.floor(wins.length / 2)] : null;
  return { share: ok / total, best, withoutTrick, grid };
}
