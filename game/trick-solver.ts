// Datei: game/trick-solver.ts
// NUR FÜR TESTS: Löser für Trickwurf-Level. Probiert Würfe (Richtung ×
// Wischstärke) mit derselben Rechnung wie das Spiel durch (freeShot → feste
// Flugbahn → Physik) – so lässt sich prüfen, ob ein Level fair lösbar ist.

import * as THREE from "three";

import { BIN_OPENING_Y, computeLayout } from "./layout";
import { freeShot, IDEAL_FLICK } from "./logic";
import { type BinCollider, simulateThrow } from "./physics";
import { levelColliders, meetsRequirement, type TrickLevel } from "./trick-levels";

/** Deckel stehen im Trick-Modus offen (wie im Zielwurf). */
const LID_OPEN = 1.85;

export const layout = computeLayout(390, 844, 3);
const bins: BinCollider[] = layout.bins.map((b) => ({ x: b.x, z: b.z, lid: LID_OPEN }));
const binXs = layout.bins.map((b) => b.x);

/** Ein Wurf: Winkel (Grad, 0 = gerade) und Stärke (1 = Ideal-Tempo). */
export function throwAt(level: TrickLevel, angle: number, strength: number) {
  const dx = Math.tan((angle * Math.PI) / 180) * 100;
  const vy = -strength * IDEAL_FLICK;
  const shot = freeShot(dx, -100, vy, layout.binAngles, binXs);
  if (!shot) return null;
  const start = layout.item.position;
  const z = Math.min(shot.depth, start.z - 1.2);
  const target = new THREE.Vector3(shot.x, BIN_OPENING_Y + 0.1, z);
  const power = Math.min(Math.max(0.8 + (strength * IDEAL_FLICK) / 5000, 0.8), 1.3);
  return simulateThrow(start, target, power, bins, levelColliders(level));
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
  for (let strength = 0.25; strength <= 1.6001; strength += 0.05) {
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
      } else row += r?.props.length ? "+" : ".";
    }
    grid.push(`${strength.toFixed(2)} ${row}`);
  }
  const best = wins.length ? wins[Math.floor(wins.length / 2)] : null;
  return { share: ok / total, best, withoutTrick, grid };
}
