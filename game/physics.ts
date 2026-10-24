// Datei: game/physics.ts
// Kleine Wurf-Physik für Zielwurf und Trickwürfe: Schwerkraft, Abprallen an
// Tonnenwand, Rand und (offenem) Deckel, an Reifen (durchfliegen oder vom
// Rohr abprallen), Boden und Rückwand. Ob ein Wurf trifft, ergibt sich hier – auch vom
// Rand hineinrollen oder vom Deckel abprallen geht. Geworfen wird echt (ab
// dem Loslassen, lobVelocity); simulateShot() und firstTouch() rechnen in
// denselben festen Schritten wie die Szene – Vorschau = Wurf = Test.
// Dazu die feste Flugbahn der klassischen Modi (Wischen ins Ziel).
// Rein und ohne React, damit es sich testen lässt (siehe __tests__).

import * as THREE from "three";

/** Schwerkraft (Welt-Einheiten/s²; eine Tonne ist 1,6 hoch). Höher = flotter
 *  Flug bei gleicher Kurve (der Abwurf wird passend schneller). */
export const GRAVITY = 25;
/** Kollisions-Radius eines geworfenen Gegenstands. */
export const BALL_R = 0.12;
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
  /** Gutmütiger Rand: Wer bis so weit (Welt-Einheiten) neben der Öffnung auf
   *  den Rand prallt, bekommt einen Schubs nach innen – je knapper, desto mehr.
   *  Weiter daneben berührt den Rand nicht: kein automatischer Treffer. */
  funnel: 0.24,
};
/** Größter Schubs nach innen beim Rand-Abprallen (Welt-Einheiten/s). */
const RIM_NUDGE = 2.25;
/** Brett-Wurf: so stark wird der Abpraller vom Deckel Richtung Öffnung gelenkt
 *  (Mitte des Deckels; ganz außen deutlich weniger). */
const BANK_ASSIST = 0.8;
/** Ab diesem Winkel (rad) ist der Deckel offen genug zum Hineinfallen. */
const LID_OPEN_MIN = 0.35;
/** Deckel federt: Wer viel zu lang wirft, prallt zurück über die Tonne. */
const LID_RESTITUTION = 0.55;

/* ── Feste Flugbahn (klassische Modi) ─────────────────────── */

/** Dauer der festen Flugbahn (s): knackig, aber zum Mitverfolgen. */
export const FLIGHT_TIME = 0.42;
/** Bogenhöhe der festen Flugbahn zwischen zwei Punkten. */
export function arcFor(start: THREE.Vector3, end: THREE.Vector3) {
  return 0.9 + start.distanceTo(end) * 0.12;
}

/** Bogen eines Wurfs: kräftiger Wisch → flacher, sanfter → höher. */
export function throwArc(start: THREE.Vector3, target: THREE.Vector3, power = 1) {
  return arcFor(start, target) * (1.35 - power * 0.35);
}

/** Punkt auf der festen Wurfparabel (t = 0…1). */
export function flightPoint(
  out: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  arc: number,
) {
  out.lerpVectors(start, end, t);
  out.y += Math.sin(t * Math.PI) * arc;
  return out;
}

/* ── Reifen (Trickwürfe) ─────────────────────────────────── */

/** Bewegung eines Reifens über die Zeit (s): hin und her entlang einer Achse
 *  oder Drehen um die senkrechte Achse. Rein zeitabhängig – Vorschau, Szene
 *  und Tests sehen denselben Reifen zur selben Zeit. */
export type RingMotion =
  | { kind: "slide"; axis: "x" | "y"; amp: number; period: number; phase?: number }
  | { kind: "spin"; period: number; phase?: number };

/** Reifen, durch den man werfen muss. Steht senkrecht (zeigt zur Kamera). */
export type PropCollider = {
  kind: "ring";
  id: number;
  x: number;
  y: number;
  z: number;
  /** Radius bis zur Mitte des Rohrs. */
  radius: number;
  /** Dicke des Rohrs (Radius). */
  tube: number;
  motion?: RingMotion;
};

const TAU = Math.PI * 2;

/** Mitte und Blickrichtung (Normale) eines Reifens zur Zeit `time`. */
export function ringPose(ring: PropCollider, time: number, center: THREE.Vector3, normal: THREE.Vector3) {
  center.set(ring.x, ring.y, ring.z);
  normal.set(0, 0, 1);
  const m = ring.motion;
  if (!m) return;
  const angle = (time / m.period) * TAU + (m.phase ?? 0);
  if (m.kind === "slide") center[m.axis] += Math.sin(angle) * m.amp;
  else normal.set(Math.sin(angle), 0, Math.cos(angle));
}

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
  /** Woran zuletzt an einer Tonne abgeprallt (für „Über den Deckel!“). */
  via: BinPart | null;
  /** Wie lange der Ball schon fast still liegt (s). */
  still: number;
  /** Uhr der Szene (s) – bewegte Reifen hängen davon ab. */
  time: number;
};

export type BinPart = "rim" | "wall" | "lid";

export type BallEvent =
  | { type: "capture"; bin: number }
  | {
      type: "bounce";
      bin: number | null;
      speed: number;
      part: BinPart | "ring" | "ground";
      /** Reifen (Trickwürfe), falls einer berührt wurde. */
      prop?: number;
    }
  /** Sauber durch einen Reifen geflogen. */
  | { type: "pass"; prop: number };

function touch(ball: Ball, events: BallEvent[], bin: number, part: BinPart, speed: number) {
  if (speed <= 0.4) return;
  ball.touched = true;
  ball.via = part;
  events.push({ type: "bounce", bin, speed, part });
}

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
    via: null,
    still: 0,
    time: 0,
  };
}

// Wiederverwendete Hilfsvektoren: keine neuen Objekte pro Teilschritt
// (sonst räumt der Speicher-Sammler mitten im Spiel auf → Ruckler)
const n = new THREE.Vector3();
const rel = new THREE.Vector3();
const tangential = new THREE.Vector3();
const point = new THREE.Vector3();
const prevP = new THREE.Vector3();

/** Ball aus einer Fläche schieben und abprallen lassen. */
function bounce(ball: Ball, normal: THREE.Vector3, depth: number, restitution: number): number {
  ball.p.addScaledVector(normal, depth);
  const vn = ball.v.dot(normal);
  if (vn >= 0) return 0;
  ball.v.addScaledVector(normal, -(1 + restitution) * vn);
  // Reibung entlang der Fläche
  tangential.copy(ball.v).addScaledVector(normal, -ball.v.dot(normal));
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
        touch(ball, events, i, "rim", bounce(ball, n, r - d, 0.5));
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
  // Oben auf dem Rand-Kranz oder seitlich an der Wand
  const onRim = n.y > 0.5;
  const speed = bounce(ball, n, r - d, 0.42);
  touch(ball, events, i, onRim ? "rim" : "wall", speed);
  if (onRim && open && speed > 0.4) {
    // Gutmütiger Rand: knapp daneben → Schubs Richtung Öffnung
    const ox = Math.max(Math.abs(lx) - s.openHalfW, 0);
    const oz = Math.max(Math.abs(lz) - s.openHalfD, 0);
    const off = Math.hypot(ox, oz);
    if (off > 0 && off < s.funnel) {
      const nudge = (1 - off / (s.funnel + 0.1)) * RIM_NUDGE;
      ball.v.x -= Math.sign(lx) * nudge * (ox / off);
      ball.v.z -= Math.sign(lz) * nudge * (oz / off);
    }
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
  const firstLid = ball.via !== "lid";
  const speed = bounce(ball, n, reach - Math.abs(dist), LID_RESTITUTION);
  touch(ball, events, i, "lid", speed);
  // Von vorn ans offene Brett: meistens Richtung Öffnung abprallen lassen
  if (firstLid && side < 0 && speed > 0.4 && lid > LID_OPEN_MIN) bankAssist(ball, bin, along);
}

/** Brett-Wurf: Abpraller vom Deckel meist in die Öffnung lenken – weniger,
 *  je weiter außen der Deckel getroffen wurde (kein automatischer Treffer). */
function bankAssist(ball: Ball, bin: BinCollider, along: number) {
  const s = BIN_SHAPE;
  const lx = ball.p.x - bin.x;
  const outer = Math.min(Math.abs(lx) / s.lidHalfW, 1);
  // Weit oben am Deckel (viel zu lang geworfen) hilft nichts mehr
  const high = THREE.MathUtils.clamp((0.6 - along) / 0.3, 0, 1);
  const strength = BANK_ASSIST * (1 - outer * 0.7) * high;
  // Zeit, bis der Ball (mit aktuellem Auf/Ab) auf Höhe der Öffnung fällt
  const drop = Math.max(ball.p.y - (s.top - 0.2), 0.05);
  const vy = ball.v.y;
  const t = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY;
  // Ziel: etwas vor der Mitte der Öffnung (der Deckel steht hinten)
  const vx = (bin.x + lx * 0.3 - ball.p.x) / t;
  const vz = (bin.z + 0.05 - ball.p.z) / t;
  ball.v.x += (vx - ball.v.x) * strength;
  ball.v.z += (vz - ball.v.z) * strength;
}

const ringCenter = new THREE.Vector3();
const ringNormal = new THREE.Vector3();
const prevRel = new THREE.Vector3();

/** Reifen: am Rohr abprallen; die Ebene innerhalb des Rings durchqueren = „pass“. */
function collideRing(ball: Ball, ring: PropCollider, prev: THREE.Vector3, events: BallEvent[]) {
  ringPose(ring, ball.time, ringCenter, ringNormal);
  rel.subVectors(ball.p, ringCenter);
  // Abstand zur Ebene und Lage in der Ebene
  const along = rel.dot(ringNormal);
  tangential.copy(rel).addScaledVector(ringNormal, -along);
  const inPlane = tangential.length();
  if (Math.abs(along) > ring.tube + BALL_R + 0.3 || inPlane > ring.radius + ring.tube + BALL_R) return;

  // Durchflogen? (Seite der Ebene gewechselt, innen genug Platz)
  prevRel.subVectors(prev, ringCenter);
  const before = prevRel.dot(ringNormal);
  if (Math.sign(before) !== Math.sign(along) && inPlane < ring.radius - ring.tube - BALL_R * 0.5)
    events.push({ type: "pass", prop: ring.id });

  // Nächster Punkt auf dem Rohr-Kreis
  if (inPlane < 1e-6) return;
  point.copy(ringCenter).addScaledVector(tangential, ring.radius / inPlane);
  n.subVectors(ball.p, point);
  const d = n.length();
  const reach = ring.tube + BALL_R;
  if (d >= reach || d < 1e-6) return;
  n.divideScalar(d);
  const speed = bounce(ball, n, reach - d, 0.5);
  if (speed <= 0.4) return;
  ball.touched = true;
  events.push({ type: "bounce", bin: null, speed, part: "ring", prop: ring.id });
}

/** Ball einen Zeitschritt weiter (intern in kleinen Teilschritten). */
export function stepBall(
  ball: Ball,
  dt: number,
  bins: BinCollider[],
  events: BallEvent[],
  props: PropCollider[] = [],
) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240) - 1e-6));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    prevP.copy(ball.p);
    ball.v.y -= GRAVITY * h;
    ball.p.addScaledVector(ball.v, h);
    ball.time += h;

    for (let i = 0; i < bins.length; i++) {
      collideBin(ball, bins[i], i, events);
      collideLid(ball, bins[i], i, events);
    }
    for (let i = 0; i < props.length; i++) collideRing(ball, props[i], prevP, events);

    // Boden: abprallen, dann rollen und ausrollen
    if (ball.p.y < BALL_R) {
      ball.p.y = BALL_R;
      if (ball.v.y < 0) {
        const speed = -ball.v.y;
        ball.v.y = speed > 0.8 ? speed * 0.42 : 0;
        if (speed > 0.8) events.push({ type: "bounce", bin: null, speed, part: "ground" });
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

export type ThrowResult = {
  /** Tonne, in der der Wurf gelandet ist – oder null. */
  bin: number | null;
  /** Ohne jede Berührung (Swish). */
  clean: boolean;
  /** Durchflogene Reifen (ids), in Reihenfolge. */
  props: number[];
};

/* ── Echter Wurf (Zielwurf, Trickwürfe) ───────────────────── */

/** Fester Physik-Schritt (s): Szene, Vorschau und Tests rechnen identisch –
 *  gleicher Wurf, gleiches Ergebnis, egal wie flüssig das Handy läuft. */
export const PHYSICS_STEP = 1 / 240;

/**
 * Abwurf-Tempo für einen Lob, der absteigend durch `target` fliegt (Ziel auf
 * Höhe der Öffnungen). Weitere Würfe fliegen höher – wie beim Basketball.
 * Rückgabe: Flugzeit bis zum Ziel (s).
 */
export function lobVelocity(out: THREE.Vector3, start: THREE.Vector3, target: THREE.Vector3): number {
  const dist = Math.hypot(target.x - start.x, target.z - start.z);
  const top = Math.max(start.y, target.y) + 0.5 + dist * 0.16;
  const vy = Math.sqrt(2 * GRAVITY * (top - start.y));
  const t = (vy + Math.sqrt(vy * vy - 2 * GRAVITY * (target.y - start.y))) / GRAVITY;
  out.set((target.x - start.x) / t, vy, (target.z - start.z) / t);
  return t;
}

/** Punkt der freien Wurfparabel nach `t` Sekunden. */
export function ballisticPoint(out: THREE.Vector3, start: THREE.Vector3, v: THREE.Vector3, t: number) {
  out.copy(start).addScaledVector(v, t);
  out.y -= 0.5 * GRAVITY * t * t;
  return out;
}

/** Neuer Ball an `p` mit Tempo `v`, abgeworfen zur Szenen-Zeit `time`. */
export function freshBall(p: THREE.Vector3, v: THREE.Vector3, time = 0): Ball {
  return { p: p.clone(), v: v.clone(), inside: null, touched: false, via: null, still: 0, time };
}

/**
 * Wurf genau wie die Szene (ThrowLayer): echter Wurf ab `start` mit Tempo `v`,
 * in festen Schritten. Bodenkontakt außerhalb einer Tonne = daneben.
 */
export function simulateShot(
  start: THREE.Vector3,
  v: THREE.Vector3,
  bins: BinCollider[],
  props: PropCollider[] = [],
  time = 0,
): ThrowResult {
  const ball = freshBall(start, v, time);
  const touched: number[] = [];
  const events: BallEvent[] = [];
  for (let time = 0; time < 6; time += PHYSICS_STEP) {
    events.length = 0;
    stepBall(ball, PHYSICS_STEP, bins, events, props);
    for (const e of events) {
      if (e.type === "capture") return { bin: e.bin, clean: !ball.touched, props: touched };
      if (e.type === "pass") {
        if (!touched.includes(e.prop)) touched.push(e.prop);
      } else if (e.part === "ground" && ball.inside === null)
        return { bin: null, clean: false, props: touched };
    }
    if (ballSettled(ball)) break;
  }
  return { bin: null, clean: false, props: touched };
}

const traceBall = freshBall(new THREE.Vector3(), new THREE.Vector3());
const traceEvents: BallEvent[] = [];

/**
 * Flugbahn-Vorschau: Wann berührt der Wurf zum ersten Mal etwas (Reifen-Rand,
 * Tonne, Boden)? Bis dahin ist die Bahn eine reine Parabel (ballisticPoint).
 * Durch einen Reifen fliegen zählt nicht als Berührung. `time` = Szenen-Zeit
 * beim Abwurf (bewegte Reifen). Rückgabe: Flugzeit bis zur Berührung (s).
 */
export function firstTouch(
  start: THREE.Vector3,
  v: THREE.Vector3,
  bins: BinCollider[],
  props: PropCollider[],
  time = 0,
): number {
  const ball = traceBall;
  ball.p.copy(start);
  ball.v.copy(v);
  ball.inside = null;
  ball.touched = false;
  ball.via = null;
  ball.time = time;
  for (let step = 1; step < 3 / PHYSICS_STEP; step++) {
    traceEvents.length = 0;
    stepBall(ball, PHYSICS_STEP, bins, traceEvents, props);
    // Berührt – oder sauber in eine Öffnung gefallen: dort endet die Vorschau
    if (traceEvents.some((e) => e.type !== "pass") || ball.inside !== null) return step * PHYSICS_STEP;
  }
  return 3;
}
