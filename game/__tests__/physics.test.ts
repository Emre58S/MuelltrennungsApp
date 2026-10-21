// Tests für die Wurf-Physik des Zielwurfs (game/physics.ts).
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";
import * as THREE from "three";

import {
  type Ball,
  type BallEvent,
  BIN_SHAPE,
  type BinCollider,
  launchBall,
  stepBall,
} from "../physics";

const START = new THREE.Vector3(0, 2.2, 4);
const OPEN = 1.0;

/** Bis zu 4 s simulieren; Ergebnis: gefangen in Tonne X oder null. */
function simulate(ball: Ball, bins: BinCollider[]) {
  const events: BallEvent[] = [];
  for (let t = 0; t < 4; t += 1 / 60) {
    stepBall(ball, 1 / 60, bins, events);
    const capture = events.find((e) => e.type === "capture");
    if (capture && capture.type === "capture") return { bin: capture.bin, events };
  }
  return { bin: null, events };
}

const target = (x: number, z: number) => new THREE.Vector3(x, BIN_SHAPE.top + 0.1, z);

describe("Zielwurf-Physik", () => {
  test("Wurf mitten in die offene Tonne landet darin – ohne Anstoßen", () => {
    const ball = launchBall(START, target(0, 0), 1.2);
    const { bin } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(bin).toBe(0);
    expect(ball.touched).toBe(false);
  });

  test("bei geschlossenem Deckel prallt der Wurf ab", () => {
    const ball = launchBall(START, target(0, 0), 1.2);
    const { bin, events } = simulate(ball, [{ x: 0, z: 0, lid: 0 }]);
    expect(bin).toBeNull();
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
  });

  test("zwischen zwei Tonnen fällt der Wurf zu Boden", () => {
    const ball = launchBall(START, target(0, 0), 1.2);
    const { bin } = simulate(ball, [
      { x: -1.3, z: 0, lid: OPEN },
      { x: 1.3, z: 0, lid: OPEN },
    ]);
    expect(bin).toBeNull();
    expect(ball.p.y).toBeLessThan(0.2);
  });

  test("zu kurz: prallt vorn an der Tonne ab, landet nicht darin", () => {
    const ball = launchBall(START, target(0, 0.75), 1.2);
    const { bin, events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(bin).toBeNull();
    expect(events.some((e) => e.type === "bounce")).toBe(true);
  });

  test("zu weit: der offene Deckel wirkt wie ein Brett", () => {
    const ball = launchBall(START, target(0, -0.55), 0.6);
    const { events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
  });
});
