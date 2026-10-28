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
export type RingCollider = {
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

/** Windrad: Flügel drehen sich (zur Kamera gewandt) durch die Wurfbahn –
 *  man wirft durch die Lücke. Nabe bei x/y/z. */
export type WindmillCollider = {
  kind: "windmill";
  id: number;
  x: number;
  y: number;
  z: number;
  blades: number;
  /** Flügel-Länge ab der Nabe. */
  length: number;
  /** Halbe Flügel-Breite (in der Drehebene). */
  breadth: number;
  /** Eine Umdrehung (s). */
  period: number;
};

/** Ventilator: Windfeld (Kasten), das den Wurf seitlich schiebt – leichte
 *  Gegenstände stärker (Ball.drift). `force` = Beschleunigung in x (+ = rechts). */
export type FanCollider = {
  kind: "fan";
  id: number;
  x: number;
  y: number;
  z: number;
  halfW: number;
  halfH: number;
  halfD: number;
  force: number;
};

/** Straßenschild als Bande: flache Tafel (zur Kamera, oben um `tilt` nach
 *  vorn geneigt) – man wirft dagegen, der Gegenstand prallt in die Tonne. */
export type SignCollider = {
  kind: "sign";
  id: number;
  x: number;
  y: number;
  z: number;
  halfW: number;
  halfH: number;
  /** Neigung (rad): oben zum Spieler hin. */
  tilt: number;
  /** Drehung um die Hochachse (rad): + = Tafel schaut nach rechts. */
  yaw: number;
};

export type PropCollider = RingCollider | WindmillCollider | FanCollider | SignCollider;

/** Halbe Dicke der Schild-Tafel. */
export const SIGN_THICK = 0.03;
/** Wie stark das Schild zurückfedert. */
const SIGN_RESTITUTION = 0.55;

/** Halbe Dicke eines Windrad-Flügels (Richtung Kamera). */
export const BLADE_THICK = 0.04;

const TAU = Math.PI * 2;

/** Drehwinkel des Windrads zur Zeit `time` (rad). */
export function windmillAngle(w: WindmillCollider, time: number) {
  return (time / w.period) * TAU;
}

/** Mitte und Blickrichtung (Normale) eines Reifens zur Zeit `time`. */
export function ringPose(ring: RingCollider, time: number, center: THREE.Vector3, normal: THREE.Vector3) {
  center.set(ring.x, ring.y, ring.z);
  normal.set(0, 0, 1);
  const m = ring.motion;
  if (!m) return;
  const angle = (time / m.period) * TAU + (m.phase ?? 0);
  if (m.kind === "slide") center[m.axis] += Math.sin(angle) * m.amp;
  else normal.set(Math.sin(angle), 0, Math.cos(angle));
}

/** Tonne fährt hin und her (Trickwürfe) entlang `axis` (z = auf dich zu und
 *  weg): Versatz = shift + sin(…)·amp. */
export type BinSlide = { axis: "x" | "z"; amp: number; period: number; shift?: number; phase?: number };

/** Versatz einer fahrenden Tonne zur Szenen-Zeit `time`. */
export function slideOffset(slide: BinSlide, time: number) {
  return (slide.shift ?? 0) + Math.sin((time / slide.period) * TAU + (slide.phase ?? 0)) * slide.amp;
}

export type BinCollider = {
  x: number;
  z: number;
  /** Deckel-Winkel in rad (0 = zu, ~1 = offen). */
  lid: number;
  /** Fahrende Tonne: Ruhelage und Bewegung (x/z wird pro Schritt gesetzt). */
  slide?: BinSlide;
  baseX?: number;
  baseZ?: number;
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
  /** Wie stark Wind den Gegenstand schiebt (1 = normal, leicht > 1). */
  drift: number;
};

export type BinPart = "rim" | "wall" | "lid";

export type BallEvent =
  | { type: "capture"; bin: number }
  | {
      type: "bounce";
      bin: number | null;
      speed: number;
      part: BinPart | "ring" | "blade" | "sign" | "ground";
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
    drift: 1,
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
function collideRing(ball: Ball, ring: RingCollider, prev: THREE.Vector3, events: BallEvent[]) {
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

/** Windrad: an den drehenden Flügeln (flache Kästen) abprallen. */
function collideWindmill(ball: Ball, w: WindmillCollider, events: BallEvent[]) {
  const dz = ball.p.z - w.z;
  if (Math.abs(dz) > BLADE_THICK + BALL_R) return;
  const rx = ball.p.x - w.x;
  const ry = ball.p.y - w.y;
  if (Math.hypot(rx, ry) > w.length + w.breadth + BALL_R) return;
  const base = windmillAngle(w, ball.time);
  for (let k = 0; k < w.blades; k++) {
    const a = base + (k * TAU) / w.blades;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // In Flügel-Koordinaten: entlang, quer, Tiefe
    const along = rx * cos + ry * sin;
    const across = -rx * sin + ry * cos;
    const ca = THREE.MathUtils.clamp(along, 0, w.length);
    const cc = THREE.MathUtils.clamp(across, -w.breadth, w.breadth);
    const cz = THREE.MathUtils.clamp(dz, -BLADE_THICK, BLADE_THICK);
    const la = along - ca;
    const lc = across - cc;
    const lz = dz - cz;
    const d = Math.hypot(la, lc, lz);
    if (d >= BALL_R) continue;
    if (d < 1e-6) n.set(0, 0, Math.sign(dz) || 1);
    else n.set((la * cos - lc * sin) / d, (la * sin + lc * cos) / d, lz / d);
    const speed = bounce(ball, n, BALL_R - d, 0.4);
    if (speed <= 0.4) return;
    ball.touched = true;
    events.push({ type: "bounce", bin: null, speed, part: "blade", prop: w.id });
    return;
  }
}

/** Straßenschild: Abprall an der Tafel. Ein Treffer zählt wie ein
 *  durchflogener Reifen ("pass") – so lässt sich „über die Bande“ verlangen. */
function collideSign(ball: Ball, sign: SignCollider, events: BallEvent[]) {
  const wx = ball.p.x - sign.x;
  const dy = ball.p.y - sign.y;
  const wz = ball.p.z - sign.z;
  const reach = Math.max(sign.halfW, sign.halfH) + BALL_R + 0.1;
  if (Math.abs(wx) > reach || Math.abs(dy) > reach || Math.abs(wz) > reach) return;
  // Erst die Drehung um die Hochachse herausrechnen, dann die Neigung
  const cy = Math.cos(sign.yaw);
  const sy = Math.sin(sign.yaw);
  const dx = wx * cy - wz * sy;
  const dz = wx * sy + wz * cy;
  const cos = Math.cos(sign.tilt);
  const sin = Math.sin(sign.tilt);
  // Tafel-Koordinaten: quer (x), hoch (entlang der Neigung), Tiefe (Normale)
  const up = dy * cos + dz * sin;
  const depth = -dy * sin + dz * cos;
  const lx = dx - THREE.MathUtils.clamp(dx, -sign.halfW, sign.halfW);
  const lu = up - THREE.MathUtils.clamp(up, -sign.halfH, sign.halfH);
  const ld = depth - THREE.MathUtils.clamp(depth, -SIGN_THICK, SIGN_THICK);
  const d = Math.hypot(lx, lu, ld);
  if (d >= BALL_R) return;
  if (d < 1e-6) n.set(0, -sin, cos).multiplyScalar(Math.sign(depth) || 1);
  else n.set(lx / d, (lu * cos - ld * sin) / d, (lu * sin + ld * cos) / d);
  // Zurück in Welt-Richtung (Drehung um die Hochachse)
  n.set(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
  const speed = bounce(ball, n, BALL_R - d, SIGN_RESTITUTION);
  if (speed <= 0.4) return;
  ball.touched = true;
  events.push({ type: "bounce", bin: null, speed, part: "sign", prop: sign.id });
  events.push({ type: "pass", prop: sign.id });
}

/** Ventilator: im Windfeld seitlich beschleunigen (je nach Gewicht). */
function blowFan(ball: Ball, fan: FanCollider, h: number) {
  const p = ball.p;
  if (Math.abs(p.x - fan.x) > fan.halfW || Math.abs(p.y - fan.y) > fan.halfH) return;
  if (Math.abs(p.z - fan.z) > fan.halfD) return;
  ball.v.x += fan.force * ball.drift * h;
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
      const bin = bins[i];
      if (bin.slide) {
        const off = slideOffset(bin.slide, ball.time);
        if (bin.slide.axis === "z") bin.z = (bin.baseZ ?? 0) + off;
        else bin.x = (bin.baseX ?? 0) + off;
      }
      collideBin(ball, bin, i, events);
      collideLid(ball, bin, i, events);
    }
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (prop.kind === "ring") collideRing(ball, prop, prevP, events);
      else if (prop.kind === "windmill") collideWindmill(ball, prop, events);
      else if (prop.kind === "sign") collideSign(ball, prop, events);
      else blowFan(ball, prop, h);
    }

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
 * `loft` = Bogenhöhe (schwere Gegenstände < 1 flacher, leichte > 1 höher).
 * Rückgabe: Flugzeit bis zum Ziel (s).
 */
export function lobVelocity(
  out: THREE.Vector3,
  start: THREE.Vector3,
  target: THREE.Vector3,
  loft = 1,
): number {
  const dist = Math.hypot(target.x - start.x, target.z - start.z);
  const top = Math.max(start.y, target.y) + (0.5 + dist * 0.16) * loft;
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

/** Neuer Ball an `p` mit Tempo `v`, abgeworfen zur Szenen-Zeit `time`;
 *  `drift` = Wind-Empfindlichkeit (Gewicht). */
export function freshBall(p: THREE.Vector3, v: THREE.Vector3, time = 0, drift = 1): Ball {
  return { p: p.clone(), v: v.clone(), inside: null, touched: false, via: null, still: 0, time, drift };
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
  drift = 1,
): ThrowResult {
  const ball = freshBall(start, v, time, drift);
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

/** Abstand der Vorschau-Punkte (Physik-Schritte): 60 Punkte pro Sekunde. */
const TRACE_EVERY = 4;
/** Längste Vorschau (s) → so viele Punkte braucht der Puffer höchstens. */
export const TRACE_POINTS = (3 / PHYSICS_STEP / TRACE_EVERY) | 0;

/**
 * Flugbahn-Vorschau: rechnet den Wurf genau wie die Szene (inklusive Wind)
 * bis zur ersten Berührung (Reifen-Rand, Tonne, Boden) und legt die Bahn in
 * `path` ab – ein Punkt je 1/60 s, `path[0]` = Start. Durch einen Reifen
 * fliegen zählt nicht als Berührung. Rückgabe: Anzahl der Punkte.
 * `path` muss TRACE_POINTS + 1 Vektoren fassen (wiederverwendet, kein Müll).
 */
export function traceShot(
  start: THREE.Vector3,
  v: THREE.Vector3,
  bins: BinCollider[],
  props: PropCollider[],
  path: THREE.Vector3[],
  time = 0,
  drift = 1,
): number {
  const ball = traceBall;
  ball.p.copy(start);
  ball.v.copy(v);
  ball.inside = null;
  ball.touched = false;
  ball.via = null;
  ball.time = time;
  ball.drift = drift;
  path[0].copy(start);
  let count = 1;
  for (let step = 1; step < 3 / PHYSICS_STEP; step++) {
    traceEvents.length = 0;
    stepBall(ball, PHYSICS_STEP, bins, traceEvents, props);
    let touched = ball.inside !== null;
    // Schleife statt .some(): keine neue Funktion pro Schritt → kein Speicher-Müll
    for (let i = 0; i < traceEvents.length && !touched; i++)
      if (traceEvents[i].type !== "pass") touched = true;
    if (touched || step % TRACE_EVERY === 0) {
      if (count < path.length) path[count++].copy(ball.p);
      if (touched) break;
    }
  }
  return count;
}
