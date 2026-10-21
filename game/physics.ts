// Datei: game/physics.ts
// Kleine Wurf-Physik für Zielwurf und Trickwürfe: Schwerkraft, Abprallen an
// Tonnenwand, Rand und (offenem) Deckel, an Hindernissen (Trampolin, Auto,
// Zaun), Boden und Rückwand. Ob ein Wurf trifft, ergibt sich hier – auch vom
// Rand hineinrollen oder vom Deckel abprallen geht. Dazu die feste Flugbahn
// und simulateThrow(), das einen Wurf genau wie die Szene durchspielt.
// Rein und ohne React, damit es sich testen lässt (siehe __tests__).

import * as THREE from "three";

/** Schwerkraft (Welt-Einheiten/s²; eine Tonne ist 1,6 hoch). */
export const GRAVITY = 16;
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
const RIM_NUDGE = 1.8;
/** Brett-Wurf: so stark wird der Abpraller vom Deckel Richtung Öffnung gelenkt
 *  (Mitte des Deckels; ganz außen deutlich weniger). */
const BANK_ASSIST = 0.8;
/** Ab diesem Winkel (rad) ist der Deckel offen genug zum Hineinfallen. */
const LID_OPEN_MIN = 0.35;

/* ── Flugbahn (fest) und Übergabe an die Physik ───────────── */

/** Dauer der festen Flugbahn (s): knackig, aber zum Mitverfolgen. */
export const FLIGHT_TIME = 0.42;
/** Berührung unterwegs: so viel vom (exakten) Flugtempo nimmt die Physik mit. */
export const HANDOVER_SPEED = 0.8;
/** Ankunft am Ziel: sanftes Hineinfallen – der Wurf landet, wo man hinzielt. */
export const ARRIVAL_SPEED = 0.1;
/** Höchstes Tempo bei der Übergabe: Die feste Flugbahn ist perspektivisch sehr
 *  schnell (~17/s) – ungedeckelt springt ein Gegenstand meterhoch vom Rand. */
const MAX_HANDOVER = 6.5;

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

/** Tempo auf der festen Flugbahn (Ableitung von flightPoint, pro Sekunde) –
 *  exakt, unabhängig vom Bildtakt. */
export function flightVelocity(
  out: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  arc: number,
) {
  out.subVectors(end, start);
  out.y += Math.PI * arc * Math.cos(t * Math.PI);
  return out.divideScalar(FLIGHT_TIME);
}

/* ── Hindernisse (Trickwürfe) ─────────────────────────────── */

/**
 * Sprungbrett-Verhalten (Trampolin, Autodach): von oben getroffen springt der
 * Gegenstand mit mindestens `minUp` hoch und fliegt Richtung Tonnenreihe
 * (oder `aim`, z. B. das nächste Hindernis). Wo man das Hindernis trifft,
 * ändert die Weite um ±`spread`; ein grob passender Sprung wird zur Öffnung
 * gelenkt (`assist`). So macht der Trick, was man erwartet – ohne dass jeder
 * beliebige Wurf trifft (Hindernis selbst muss erst getroffen werden).
 */
export type Launch = {
  minUp: number;
  spread: number;
  assist: number;
  aim?: { x: number; y: number; z: number };
};

export type PropPart = "trampoline" | "car" | "fence";

export type PropCollider =
  | {
      kind: "trampoline";
      id: number;
      x: number;
      z: number;
      halfW: number;
      halfD: number;
      /** Höhe der Matte. */
      top: number;
      launch: Launch;
    }
  | {
      kind: "box";
      id: number;
      part: "car" | "fence";
      x: number;
      y: number;
      z: number;
      halfW: number;
      halfH: number;
      halfD: number;
      restitution: number;
      /** Von oben getroffen: Sprungbrett (Autodach) – oder keins (Zaun). */
      launch?: Launch;
    };

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
};

export type BinPart = "rim" | "wall" | "lid";

export type BallEvent =
  | { type: "capture"; bin: number }
  | {
      type: "bounce";
      bin: number | null;
      speed: number;
      part: BinPart | PropPart | "ground";
      /** Hindernis (Trickwürfe), falls eins berührt wurde. */
      prop?: number;
    };

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
  };
}

// Wiederverwendete Hilfsvektoren: keine neuen Objekte pro Teilschritt
// (sonst räumt der Speicher-Sammler mitten im Spiel auf → Ruckler)
const n = new THREE.Vector3();
const rel = new THREE.Vector3();
const tangential = new THREE.Vector3();
const point = new THREE.Vector3();

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
  const speed = bounce(ball, n, reach - Math.abs(dist), 0.55);
  touch(ball, events, i, "lid", speed);
  // Von vorn ans offene Brett: meistens Richtung Öffnung abprallen lassen
  if (firstLid && side < 0 && speed > 0.4 && lid > LID_OPEN_MIN) bankAssist(ball, bin);
}

/** Brett-Wurf: Abpraller vom Deckel meist in die Öffnung lenken – weniger,
 *  je weiter außen der Deckel getroffen wurde (kein automatischer Treffer). */
function bankAssist(ball: Ball, bin: BinCollider) {
  const s = BIN_SHAPE;
  const lx = ball.p.x - bin.x;
  const outer = Math.min(Math.abs(lx) / s.lidHalfW, 1);
  const strength = BANK_ASSIST * (1 - outer * 0.7);
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

/** Sprungbrett: hoch und Richtung Ziel (Tonnenreihe oder `aim`). `offset` =
 *  Trefferlage auf dem Hindernis in Wurfrichtung (−1 vorn … +1 hinten). */
function launchFrom(ball: Ball, l: Launch, bins: BinCollider[], offset: number) {
  const up = Math.max(ball.v.y, l.minUp);
  const goal = l.aim ?? { x: ball.p.x, y: BIN_SHAPE.top + 0.1, z: bins[0]?.z ?? 0 };
  const disc = up * up - 2 * GRAVITY * (goal.y - ball.p.y);
  ball.v.y = up;
  if (disc <= 0) return;
  const t = (up + Math.sqrt(disc)) / GRAVITY;
  // Weiter vorn getroffen → etwas weiter, hinten → etwas kürzer
  const reach = 1 - THREE.MathUtils.clamp(offset, -1, 1) * l.spread;
  ball.v.z = ((goal.z + 0.05 - ball.p.z) / t) * reach;
  if (l.aim) ball.v.x += ((l.aim.x - ball.p.x) / t - ball.v.x) * l.assist;
  else steerToBin(ball, bins, l.assist);
}

/** Trampolin von oben getroffen: Sprungbrett. */
function collideTrampoline(
  ball: Ball,
  t: Extract<PropCollider, { kind: "trampoline" }>,
  bins: BinCollider[],
  events: BallEvent[],
) {
  const p = ball.p;
  if (Math.abs(p.x - t.x) > t.halfW || Math.abs(p.z - t.z) > t.halfD) return;
  if (ball.v.y >= 0 || p.y - BALL_R > t.top || p.y < t.top - 0.3) return;
  const speed = -ball.v.y;
  p.y = t.top + BALL_R;
  ball.v.y = speed;
  ball.touched = true;
  events.push({ type: "bounce", bin: null, speed, part: "trampoline", prop: t.id });
  launchFrom(ball, t.launch, bins, (t.z - p.z) / t.halfD);
}

/** Wo fiele der Sprung auf Öffnungshöhe herunter? Liegt das grob bei einer
 *  Tonne, wird die Flugrichtung ein Stück dorthin gelenkt – sonst nicht. */
function steerToBin(ball: Ball, bins: BinCollider[], assist: number) {
  const y = BIN_SHAPE.top + 0.1;
  const vy = ball.v.y;
  const disc = vy * vy - 2 * GRAVITY * (y - ball.p.y);
  if (disc <= 0) return;
  const t = (vy + Math.sqrt(disc)) / GRAVITY;
  const lx = ball.p.x + ball.v.x * t;
  const lz = ball.p.z + ball.v.z * t;
  let best = -1;
  let bestOff = Infinity;
  bins.forEach((bin, i) => {
    const off = Math.max(Math.abs(lx - bin.x) / 0.9, Math.abs(lz - bin.z) / 1.1);
    if (off < bestOff) {
      bestOff = off;
      best = i;
    }
  });
  if (best < 0 || bestOff >= 1) return;
  const strength = assist * (1 - bestOff * 0.5);
  const target = bins[best];
  ball.v.x += ((target.x - ball.p.x) / t - ball.v.x) * strength;
  ball.v.z += ((target.z + 0.05 - ball.p.z) / t - ball.v.z) * strength;
}

/** Kasten-Hindernis (Auto, Zaun): abprallen; von oben getroffen ggf. Sprungbrett. */
function collideBox(
  ball: Ball,
  b: Extract<PropCollider, { kind: "box" }>,
  bins: BinCollider[],
  events: BallEvent[],
) {
  const p = ball.p;
  const cx = THREE.MathUtils.clamp(p.x, b.x - b.halfW, b.x + b.halfW);
  const cy = THREE.MathUtils.clamp(p.y, b.y - b.halfH, b.y + b.halfH);
  const cz = THREE.MathUtils.clamp(p.z, b.z - b.halfD, b.z + b.halfD);
  n.set(p.x - cx, p.y - cy, p.z - cz);
  const dist = n.length();
  if (dist >= BALL_R) return;
  if (dist < 1e-6) n.set(0, 1, 0);
  else n.divideScalar(dist);
  const fromAbove = n.y > 0.6;
  const speed = bounce(ball, n, BALL_R - dist, b.restitution);
  if (speed <= 0.4) return;
  ball.touched = true;
  events.push({ type: "bounce", bin: null, speed, part: b.part, prop: b.id });
  if (fromAbove && b.launch) launchFrom(ball, b.launch, bins, (b.z - p.z) / b.halfD);
}

/** Ball einen Zeitschritt weiter (intern in kleinen Teilschritten). */
export function stepBall(
  ball: Ball,
  dt: number,
  bins: BinCollider[],
  events: BallEvent[],
  props: PropCollider[] = [],
) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    ball.v.y -= GRAVITY * h;
    ball.p.addScaledVector(ball.v, h);

    for (let i = 0; i < bins.length; i++) {
      collideBin(ball, bins[i], i, events);
      collideLid(ball, bins[i], i, events);
    }
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (prop.kind === "trampoline") collideTrampoline(ball, prop, bins, events);
      else collideBox(ball, prop, bins, events);
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

const probe: Ball = {
  p: new THREE.Vector3(),
  v: new THREE.Vector3(),
  inside: null,
  touched: false,
  via: null,
  still: 0,
};
const probeEvents: BallEvent[] = [];

/** Würde ein Ball an Stelle `p` (mit Tempo `v`) gerade etwas berühren? */
function touchesAt(
  p: THREE.Vector3,
  v: THREE.Vector3,
  bins: BinCollider[],
  props: PropCollider[],
): boolean {
  probe.p.copy(p);
  probe.v.copy(v);
  probe.inside = null;
  probe.via = null;
  probeEvents.length = 0;
  stepBall(probe, 0, bins, probeEvents, props);
  return probeEvents.some((e) => e.type === "bounce");
}

/**
 * Erste Berührung auf der Strecke from → to (in kleinen Schritten abgetastet,
 * sonst springt ein schneller Wurf zwischen zwei Bildern durch den dünnen
 * Deckel hindurch). Gibt die letzte freie Stelle davor zurück – oder null.
 */
export function firstContact(
  from: THREE.Vector3,
  to: THREE.Vector3,
  v: THREE.Vector3,
  bins: BinCollider[],
  out: THREE.Vector3,
  props: PropCollider[] = [],
): THREE.Vector3 | null {
  const steps = Math.max(1, Math.ceil(from.distanceTo(to) / 0.04));
  for (let k = 1; k <= steps; k++) {
    point.lerpVectors(from, to, k / steps);
    if (touchesAt(point, v, bins, props)) return out.lerpVectors(from, to, (k - 1) / steps);
  }
  return null;
}

/** Fertig: liegt still oder ist in einer Tonne verschwunden. */
export function ballSettled(ball: Ball): boolean {
  return ball.still > 0.25;
}

/** Ball für die Physik ab der Übergabe-Stelle: bei Berührung unterwegs mit
 *  dem Flugtempo, bei Ankunft am Ziel sanft (`arrived`). */
export function handOverBall(p: THREE.Vector3, v: THREE.Vector3, arrived = false): Ball {
  return {
    p: p.clone(),
    v: v
      .clone()
      .multiplyScalar(arrived ? ARRIVAL_SPEED : HANDOVER_SPEED)
      .clampLength(0, MAX_HANDOVER),
    inside: null,
    touched: false,
    via: null,
    still: 0,
  };
}

export type ThrowResult = {
  /** Tonne, in der der Wurf gelandet ist – oder null. */
  bin: number | null;
  /** Ohne jede Berührung (Swish). */
  clean: boolean;
  /** Berührte Hindernisse (ids), in Reihenfolge. */
  props: number[];
};

/**
 * Spielt einen Wurf genau wie die Szene durch (ThrowLayer): feste Flugbahn,
 * an der ersten Berührung (oder am Ziel) übernimmt die Physik; Bodenkontakt
 * außerhalb einer Tonne = daneben. Für Tests und das Prüfen von Levels.
 */
export function simulateThrow(
  start: THREE.Vector3,
  target: THREE.Vector3,
  power: number,
  bins: BinCollider[],
  props: PropCollider[] = [],
  dt = 1 / 60,
): ThrowResult {
  const arc = throwArc(start, target, power);
  const prev = start.clone();
  const cur = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const touched: number[] = [];
  const events: BallEvent[] = [];
  let t = 0;
  let ball: Ball | null = null;
  for (let time = 0; time < 6; time += dt) {
    if (!ball) {
      t = Math.min(t + dt / FLIGHT_TIME, 1);
      flightPoint(cur, start, target, t, arc);
      flightVelocity(vel, start, target, t, arc);
      const contact = firstContact(prev, cur, vel, bins, hit, props);
      if (!contact && t < 1) {
        prev.copy(cur);
        continue;
      }
      ball = handOverBall(contact ?? cur, vel, !contact);
    }
    events.length = 0;
    stepBall(ball, dt, bins, events, props);
    for (const e of events) {
      if (e.type === "capture") return { bin: e.bin, clean: !ball.touched, props: touched };
      if (e.prop !== undefined && !touched.includes(e.prop)) touched.push(e.prop);
      if (e.part === "ground" && ball.inside === null) return { bin: null, clean: false, props: touched };
    }
    if (ballSettled(ball)) break;
  }
  return { bin: null, clean: false, props: touched };
}
