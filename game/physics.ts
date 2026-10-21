// Datei: game/physics.ts
// Kleine Wurf-Physik für den Zielwurf: Schwerkraft, Abprallen an Tonnenwand,
// Rand und (offenem) Deckel, Boden und Rückwand. Ob ein Wurf trifft, ergibt
// sich hier – auch vom Rand hineinrollen oder vom Deckel abprallen geht.
// Rein und ohne React, damit es sich testen lässt (siehe __tests__).

import * as THREE from "three";

/** Schwerkraft (Welt-Einheiten/s²; eine Tonne ist 1,6 hoch). */
export const GRAVITY = 16;
/** Kollisions-Radius eines geworfenen Gegenstands. */
export const BALL_R = 0.14;
const BACK_WALL_Z = -2.4;

/** Maße der Tonne (siehe components/game/trash-bin.tsx). */
export const BIN_SHAPE = {
  halfW: 0.56,
  halfD: 0.53,
  top: 1.6,
  openHalfW: 0.46,
  openHalfD: 0.42,
  hingeY: 1.58,
  hingeZ: -0.53,
  lidLen: 1.1,
  lidHalfW: 0.58,
};
/** Ab diesem Winkel (rad) ist der Deckel offen genug zum Hineinfallen. */
const LID_OPEN_MIN = 0.35;

export type BinCollider = {
  x: number;
  z: number;
  /** Deckel-Winkel in rad (0 = zu, ~1 = offen). */
  lid: number;
};

export type Ball = {
  p: THREE.Vector3;
  v: THREE.Vector3;
  /** Tonne, in deren Öffnung der Ball gerade fällt. */
  inside: number | null;
  /** Schon irgendwo angestoßen (sonst „Perfekt“ bei Treffer). */
  touched: boolean;
  /** Wie lange der Ball schon fast still liegt (s). */
  still: number;
};

export type BallEvent =
  | { type: "capture"; bin: number }
  | { type: "bounce"; bin: number | null; speed: number };

/** Wurf so abschicken, dass er (ohne Hindernis) durch `target` fällt –
 *  mit Scheitel `apex` über dem höheren der beiden Punkte. */
export function launchBall(
  start: THREE.Vector3,
  target: THREE.Vector3,
  apex: number,
): Ball {
  const top = Math.max(start.y, target.y) + Math.max(apex, 0.2);
  const vy = Math.sqrt(2 * GRAVITY * (top - start.y));
  // Absteigende Lösung von start.y + vy·t − g·t²/2 = target.y
  const t = (vy + Math.sqrt(Math.max(vy * vy - 2 * GRAVITY * (target.y - start.y), 0))) / GRAVITY;
  return {
    p: start.clone(),
    v: new THREE.Vector3((target.x - start.x) / t, vy, (target.z - start.z) / t),
    inside: null,
    touched: false,
    still: 0,
  };
}

const n = new THREE.Vector3();
const rel = new THREE.Vector3();

/** Ball aus einer Fläche schieben und abprallen lassen. */
function bounce(ball: Ball, normal: THREE.Vector3, depth: number, restitution: number): number {
  ball.p.addScaledVector(normal, depth);
  const vn = ball.v.dot(normal);
  if (vn >= 0) return 0;
  ball.v.addScaledVector(normal, -(1 + restitution) * vn);
  // Reibung entlang der Fläche
  const tangential = ball.v.clone().addScaledVector(normal, -ball.v.dot(normal));
  ball.v.addScaledVector(tangential, -0.12);
  return -vn;
}

function collideBin(ball: Ball, bin: BinCollider, i: number, events: BallEvent[]) {
  const s = BIN_SHAPE;
  const r = BALL_R;
  const p = ball.p;
  const lx = p.x - bin.x;
  const lz = p.z - bin.z;
  const open = bin.lid > LID_OPEN_MIN;
  const inOpening = Math.abs(lx) < s.openHalfW && Math.abs(lz) < s.openHalfD;

  if (open && inOpening && p.y < s.top + r) {
    if (p.y > s.top - r && ball.inside !== i) {
      // Kante der Öffnung (Rand) – nächster Punkt auf dem Öffnungs-Rand
      const ex = s.openHalfW - Math.abs(lx);
      const ez = s.openHalfD - Math.abs(lz);
      const qx = ex < ez ? Math.sign(lx) * s.openHalfW : lx;
      const qz = ex < ez ? lz : Math.sign(lz) * s.openHalfD;
      n.set(lx - qx, p.y - s.top, lz - qz);
      const d = n.length();
      if (d < r && d > 1e-6) {
        n.divideScalar(d);
        const speed = bounce(ball, n, r - d, 0.5);
        if (speed > 0.4) {
          ball.touched = true;
          events.push({ type: "bounce", bin: i, speed });
        }
      }
      if (p.y < s.top) ball.inside = i;
      return;
    }
    // Innen: an den Innenwänden halten, nach unten fallen lassen
    ball.inside = i;
    const mx = s.openHalfW - r;
    const mz = s.openHalfD - r;
    if (Math.abs(lx) > mx) {
      p.x = bin.x + Math.sign(lx) * mx;
      ball.v.x *= -0.3;
    }
    if (Math.abs(lz) > mz) {
      p.z = bin.z + Math.sign(lz) * mz;
      ball.v.z *= -0.3;
    }
    if (p.y < s.top - 0.5) events.push({ type: "capture", bin: i });
    return;
  }

  // Außen: Tonnen-Korpus als Kasten (Wände + Rand oben)
  const cx = THREE.MathUtils.clamp(lx, -s.halfW, s.halfW);
  const cy = THREE.MathUtils.clamp(p.y, 0, s.top);
  const cz = THREE.MathUtils.clamp(lz, -s.halfD, s.halfD);
  n.set(lx - cx, p.y - cy, lz - cz);
  const d = n.length();
  if (d >= r) return;
  if (d < 1e-6) n.set(0, 1, 0);
  else n.divideScalar(d);
  const speed = bounce(ball, n, r - d, 0.45);
  if (speed > 0.4) {
    ball.touched = true;
    events.push({ type: "bounce", bin: i, speed });
  }
}

function collideLid(ball: Ball, bin: BinCollider, i: number, events: BallEvent[]) {
  const s = BIN_SHAPE;
  const lid = bin.lid;
  // Deckel als Platte: vom Scharnier hinten nach vorn/oben (Winkel `lid`)
  const uy = Math.sin(lid);
  const uz = Math.cos(lid);
  rel.set(ball.p.x - bin.x, ball.p.y - s.hingeY, ball.p.z - (bin.z + s.hingeZ));
  if (Math.abs(rel.x) > s.lidHalfW) return;
  const along = rel.y * uy + rel.z * uz;
  if (along < 0 || along > s.lidLen) return;
  // Normale: senkrecht zur Platte (zeigt nach oben/hinten)
  n.set(0, uz, -uy);
  const dist = rel.dot(n);
  const reach = BALL_R + 0.03;
  if (Math.abs(dist) >= reach) return;
  const side = dist >= 0 ? 1 : -1;
  n.multiplyScalar(side);
  const speed = bounce(ball, n, reach - Math.abs(dist), 0.5);
  if (speed > 0.4) {
    ball.touched = true;
    events.push({ type: "bounce", bin: i, speed });
  }
}

/** Ball einen Zeitschritt weiter (intern in kleinen Teilschritten). */
export function stepBall(ball: Ball, dt: number, bins: BinCollider[], events: BallEvent[]) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    ball.v.y -= GRAVITY * h;
    ball.p.addScaledVector(ball.v, h);

    bins.forEach((bin, i) => {
      collideBin(ball, bin, i, events);
      collideLid(ball, bin, i, events);
    });

    // Boden: abprallen, dann rollen und ausrollen
    if (ball.p.y < BALL_R) {
      ball.p.y = BALL_R;
      if (ball.v.y < 0) {
        const speed = -ball.v.y;
        ball.v.y = speed > 0.8 ? speed * 0.42 : 0;
        if (speed > 0.8) events.push({ type: "bounce", bin: null, speed });
      }
      ball.v.x *= 1 - 2.2 * h;
      ball.v.z *= 1 - 2.2 * h;
    }
    // Rückwand (Hauswand/Mauer hinter den Tonnen)
    if (ball.p.z < BACK_WALL_Z + BALL_R && ball.v.z < 0) {
      ball.p.z = BACK_WALL_Z + BALL_R;
      ball.v.z *= -0.4;
    }
  }
  ball.still = ball.v.length() < 0.3 ? ball.still + dt : 0;
}

/** Fertig: liegt still oder ist in einer Tonne verschwunden. */
export function ballSettled(ball: Ball): boolean {
  return ball.still > 0.25;
}
