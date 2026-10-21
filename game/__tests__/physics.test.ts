// Tests für die Wurf-Physik des Zielwurfs (game/physics.ts).
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";
import * as THREE from "three";

import {
  type Ball,
  type BallEvent,
  BIN_SHAPE,
  type BinCollider,
  firstContact,
  launchBall,
  stepBall,
} from "../physics";

const START = new THREE.Vector3(0, 2.2, 4);
/** Deckel im Zielwurf: weit nach hinten geklappt (wie ein Brett). */
const OPEN = 1.85;

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

  // So übergibt der Flug an die Physik: schnell, schräg nach unten/hinten
  const handedOver = (z: number, vz: number): Ball => ({
    p: new THREE.Vector3(0, BIN_SHAPE.top + 0.25, z),
    v: new THREE.Vector3(0, -5, vz),
    inside: null,
    touched: false,
    via: null,
    still: 0,
  });

  test("zu weit: prallt vom offenen Deckel ab und fällt in die Tonne", () => {
    // Hoch und nach hinten unterwegs – trifft den Deckel über dem hinteren Rand
    const ball = handedOver(-0.2, -5);
    ball.p.y = 2.3;
    ball.v.y = -1.5;
    const { bin, events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
    expect(bin).toBe(0);
    expect(ball.via).toBe("lid");
  });

  test("auf den vorderen Rand, Schwung nach vorn: prallt nach außen ab", () => {
    const ball = handedOver(BIN_SHAPE.openHalfD + 0.1, 3);
    const { bin, events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
    expect(bin).toBeNull();
  });

  test("auf den vorderen Rand, Schwung nach hinten: rollt hinein", () => {
    const ball = handedOver(BIN_SHAPE.openHalfD + 0.1, -1);
    const { bin, events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
    expect(bin).toBe(0);
    expect(ball.via).toBe("rim");
  });

  test("knapp neben der Öffnung (gutmütiger Rand): geht trotzdem rein", () => {
    const ball = handedOver(0, -1);
    ball.p.x = BIN_SHAPE.openHalfW + 0.12;
    ball.v.set(0, -4, 0);
    const { bin } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(bin).toBe(0);
  });

  test("deutlich daneben: kein automatischer Treffer", () => {
    const ball = handedOver(0, -1);
    ball.p.x = BIN_SHAPE.openHalfW + 0.45;
    ball.v.set(0, -4, 0);
    const { bin } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(bin).toBeNull();
  });

  test("schneller Flug durch den dünnen Deckel wird erkannt (kein Durchtunneln)", () => {
    // ~0,45 Einheiten pro Bild: Start und Ende frei, dazwischen die Platte
    const bins = [{ x: 0, z: 0, lid: OPEN }];
    const from = new THREE.Vector3(0, 2.1, -0.45);
    const to = new THREE.Vector3(0, 2.1, -0.9);
    const v = new THREE.Vector3(0, 0, -27);
    const out = new THREE.Vector3();
    expect(firstContact(from, from, v, bins, out)).toBeNull();
    expect(firstContact(to, to, v, bins, out)).toBeNull();
    const hit = firstContact(from, to, v, bins, out);
    expect(hit).not.toBeNull();
    expect(hit!.z).toBeGreaterThan(-0.68);
  });

  test("zu weit: der offene Deckel wirkt wie ein Brett", () => {
    const ball = launchBall(START, target(0, -0.55), 0.6);
    const { events } = simulate(ball, [{ x: 0, z: 0, lid: OPEN }]);
    expect(events.some((e) => e.type === "bounce" && e.bin === 0)).toBe(true);
  });
});
