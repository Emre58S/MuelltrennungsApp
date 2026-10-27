// Datei: components/game/items.tsx
// Vorschau-Item (schwebt, holt beim Zielen Schwung), gepunktete Flugbahn
// und die geworfenen Items (Flug mit Leuchtspur → Einsinken oder Abprallen).
//
// Würfe laufen in einem festen Pool (ThrowLayer): alle Plätze sind von Anfang
// an aufgebaut, ein Wurf belegt nur einen freien Platz und hängt eine Kopie
// des Modells ein. Kein React-Render, kein neues Mesh/Material pro Wurf.

import { useFrame } from "@react-three/fiber/native";
import * as Haptics from "expo-haptics";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import {
  arcFor,
  type Ball,
  type BallEvent,
  ballSettled,
  BIN_SHAPE,
  type BinCollider,
  type BinSlide,
  FLIGHT_TIME,
  freshBall,
  lobVelocity,
  PHYSICS_STEP,
  type PropCollider,
  stepBall,
  throwArc,
  TRACE_POINTS,
  traceShot,
} from "@/game/physics";
import { type TrailId } from "@/game/rewards";
import { perfMark } from "@/utils/perf-marks";
import { sfx } from "@/utils/sfx";

import {
  easeOutBack,
  flightPoint,
  type FxRef,
  setLook,
  trackFlying,
} from "./fx";
import { cloneModel, hasModel } from "./model-cache";
import {
  type BusRef,
  landThrow,
  markRingPass,
  queueBinEvent,
  queueBurst,
  type ThrowSpec,
  takeThrows,
} from "./scene-bus";

/* ── Vorschau ──────────────────────────────────────────────── */

/** Der schwebende Gegenstand. Welcher es ist, steht in bus.preview; das
 *  Modell wird hier im Frame getauscht (Kopie der Vorlage) – die Szene
 *  rendert dafür nicht neu, egal wie schnell geworfen wird. */
export const PreviewItem = memo(function PreviewItem({
  position,
  scale,
  openings,
  bus,
  fx,
}: {
  position: THREE.Vector3;
  scale: number;
  /** Öffnungen der Tonnen – das Item lehnt sich zur anvisierten. */
  openings: THREE.Vector3[];
  bus: BusRef;
  fx: FxRef;
}) {
  const ref = useRef<THREE.Group>(null);
  const shown = useRef<{
    item: Item | null;
    model: THREE.Object3D | null;
    /** false = Ersatzform, bis die Vorlage fertig ist. */
    real: boolean;
  }>({ item: null, model: null, real: false });
  const age = useRef(0);
  const aim = useRef(0);
  const lean = useRef(0);
  const pull = useRef(0);

  useFrame((state, rawDelta) => {
    const g = ref.current;
    if (!g) return;
    const item = bus.current.preview;
    const cur = shown.current;
    const changed = item !== cur.item;
    if (changed || (item && !cur.real && hasModel(item.name))) {
      if (changed) age.current = 0;
      if (cur.model) g.remove(cur.model);
      cur.model = item ? cloneModel(item.name) : null;
      if (cur.model) g.add(cur.model);
      cur.item = item;
      cur.real = !!item && hasModel(item.name);
    }
    g.visible = !!item;
    if (!item) return;
    const delta = Math.min(rawDelta, 0.05);
    age.current += delta;
    const t = state.clock.elapsedTime;
    const calm = fx.current.calm;
    const aimIndex = bus.current.aim;
    const target = aimIndex !== null ? openings[aimIndex] : undefined;
    // Zielwurf: Zurückziehen spannt den Gegenstand wie eine Schleuder
    const guide = bus.current.shotGuide;

    aim.current = THREE.MathUtils.damp(aim.current, target ? 1 : 0, 12, delta);
    pull.current = THREE.MathUtils.damp(pull.current, guide ? guide.strength : 0, 18, delta);
    const toX = guide ? guide.x : target?.x;
    const dirX = toX !== undefined ? THREE.MathUtils.clamp((toX - position.x) / 2, -1, 1) : 0;
    lean.current = THREE.MathUtils.damp(lean.current, dirX, 10, delta);

    // Auftauchen mit Überschwinger
    const pop = calm ? 1 : easeOutBack(Math.min(age.current / 0.3, 1));
    // Schwung holen: beim Zielen etwas zurück/runter und kleiner
    const windUp = aim.current;
    const p = pull.current;
    // Volle Kraft: leichtes Zittern vor Spannung
    const tremble = calm || p < 0.85 ? 0 : Math.sin(t * 70) * 0.012 * (p - 0.85) * 6;
    const size = scale * pop * (1 - windUp * 0.06);
    // Gespannt: breiter und flacher, zurück zur Kamera und nach unten gezogen
    g.scale.set(size * (1 + p * 0.1), size * (1 - p * 0.14), size * (1 + p * 0.1));
    g.position.set(
      position.x - lean.current * (0.08 + p * 0.12) + tremble,
      position.y + (calm ? 0 : Math.sin(t * 2.2) * 0.04 * (1 - p)) - windUp * 0.1 - p * 0.16,
      position.z + windUp * 0.12 + p * 0.3,
    );
    g.rotation.set(
      0.15 - windUp * 0.25 - p * 0.35,
      calm ? -0.3 : -0.3 + Math.sin(t * 0.9) * 0.35 * (1 - p),
      -lean.current * 0.35,
    );
    setLook(fx.current, g.position);
  });

  return (
    // Positionen als Array: R3F nutzt eine eigene three-Kopie (CJS), ein
    // Vector3 aus unserem Import würde nicht erkannt („read-only position“).
    <group
      ref={ref}
      position={[position.x, position.y, position.z]}
      scale={0.001}
      visible={false}
    />
  );
});

/* ── Flugbahn-Vorschau ─────────────────────────────────────── */

const DOTS = 14;
const NO_PROPS: PropCollider[] = [];

/** Fahrende Zieltonne (Trickwürfe): welche Tonne, wie sie sich bewegt. */
export type BinSlideSpec = { bin: number; slide: BinSlide };

/** Physik-Tonnen aus den Öffnungen (gleitende Tonne mit Ruhelage). */
function binColliders(openings: THREE.Vector3[], binSlide?: BinSlideSpec): BinCollider[] {
  return openings.map((o, i) =>
    binSlide?.bin === i
      ? { x: o.x, z: o.z - 0.05, lid: 0, slide: binSlide.slide, baseX: o.x, baseZ: o.z - 0.05 }
      : { x: o.x, z: o.z - 0.05, lid: 0 },
  );
}
const DOT_GEO = new THREE.SphereGeometry(1, 10, 8);

/** Flugbahn-Vorschau beim Halten (Zielwurf, Trickwürfe): genau die Bahn,
 *  die das Loslassen jetzt auslösen würde (dieselbe Physik wie der Wurf,
 *  inklusive Wind und Gewicht), bis zur ersten Berührung. Man sieht nur den Anfang (`share`) – das Ende
 *  schätzt man selbst. Liest bus.shotGuide, kein Neu-Rendern. */
const GUIDE_DOTS = 16;
/** Dunkler Rand um jeden Punkt: lesbar auf Himmel, Wand und Rasen. */
const GUIDE_HALO = 1.55;

export const ShotGuideDots = memo(function ShotGuideDots({
  start,
  openingY,
  openings,
  props = NO_PROPS,
  binSlide,
  bus,
  share,
  calm,
}: {
  start: THREE.Vector3;
  openingY: number;
  /** Öffnungen der Tonnen (für die Berührung mit Tonne/Deckel). */
  openings: THREE.Vector3[];
  /** Hindernisse (Trickwürfe). */
  props?: PropCollider[];
  /** Gleitende Zieltonne (Trickwürfe). */
  binSlide?: BinSlideSpec;
  bus: BusRef;
  /** Anteil der Bahn bis zur ersten Berührung, der zu sehen ist (0…1). */
  share: number;
  /** Weniger Bewegung: Punkte stehen still statt zu wandern. */
  calm: boolean;
}) {
  const dots = useRef<THREE.InstancedMesh>(null);
  const halos = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const vel = useMemo(() => new THREE.Vector3(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  // Bahn als Punkte (1/60 s), einmal angelegt und wiederverwendet
  const path = useMemo(() => Array.from({ length: TRACE_POINTS + 1 }, () => new THREE.Vector3()), []);
  const colliders = useMemo(() => binColliders(openings, binSlide), [openings, binSlide]);
  const moving = useMemo(
    () => !!binSlide || props.some((p) => p.kind === "windmill" || (p.kind === "ring" && !!p.motion)),
    [props, binSlide],
  );
  // Letzte Berechnung: nur neu rechnen, wenn sich der Wurf ändert
  const last = useRef({ x: NaN, z: NaN, loft: 1, drift: 1, count: 0 });
  // Immer obenauf (depthTest aus): die Bahn verschwindet nie hinter einer Tonne
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FFFFFF", depthTest: false, depthWrite: false }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#0E1A22",
        transparent: true,
        opacity: 0.32,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      mat.dispose();
      haloMat.dispose();
    },
    [mat, haloMat],
  );

  useFrame((_, delta) => {
    const dot = dots.current;
    const halo = halos.current;
    if (!dot || !halo) return;
    const guide = bus.current.shotGuide;
    dot.visible = halo.visible = !!guide;
    if (!guide) return;
    // Punkte wandern Richtung Ziel (wie ein Lauflicht): zeigt die Flugrichtung
    if (!calm) phase.current = (phase.current + Math.min(delta, 0.05) * 1.5) % 1;
    const loft = guide.loft ?? 1;
    const drift = guide.drift ?? 1;
    const l = last.current;
    // Neu rechnen, wenn sich der Wurf ändert – oder Hindernisse sich bewegen
    if (guide.x !== l.x || guide.z !== l.z || loft !== l.loft || drift !== l.drift || moving) {
      target.set(guide.x, openingY, guide.z);
      lobVelocity(vel, start, target, loft);
      colliders.forEach((c, k) => {
        c.lid = bus.current.lids[k] ?? 0;
      });
      l.x = guide.x;
      l.z = guide.z;
      l.loft = loft;
      l.drift = drift;
      l.count = traceShot(start, vel, colliders, props, path, bus.current.clock, drift);
    }
    // Sichtbarer Teil der Bahn (inklusive Wind) – zwischen den Punkten gemischt
    const span = Math.max(l.count - 1, 1) * share;
    for (let i = 0; i < GUIDE_DOTS; i++) {
      const k = (i + phase.current) / GUIDE_DOTS;
      const at = Math.min(k * span, l.count - 1);
      const a = Math.floor(at);
      tmp.lerpVectors(path[a], path[Math.min(a + 1, l.count - 1)], at - a);
      // Nach vorn kleiner; der erste wächst herein, der letzte schrumpft weg
      let size = 0.078 - k * 0.04;
      if (i === 0) size *= phase.current;
      if (i === GUIDE_DOTS - 1) size *= 1 - phase.current;
      m.compose(tmp, q, s.setScalar(size));
      dot.setMatrixAt(i, m);
      m.compose(tmp, q, s.setScalar(size * GUIDE_HALO));
      halo.setMatrixAt(i, m);
    }
    dot.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={halos}
        args={[DOT_GEO, haloMat, GUIDE_DOTS]}
        frustumCulled={false}
        renderOrder={10}
        visible={false}
      />
      <instancedMesh
        ref={dots}
        args={[DOT_GEO, mat, GUIDE_DOTS]}
        frustumCulled={false}
        renderOrder={11}
        visible={false}
      />
    </>
  );
});

export const AimGuide = memo(function AimGuide({
  start,
  openings,
  colors,
  bus,
}: {
  start: THREE.Vector3;
  openings: THREE.Vector3[];
  /** Punktfarbe pro Tonne. */
  colors: string[];
  bus: BusRef;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.95 }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const aimIndex = bus.current.aim;
    const target = aimIndex !== null ? openings[aimIndex] : undefined;
    mesh.visible = !!target;
    if (!target || aimIndex === null) return;
    mat.color.set(colors[aimIndex] ?? "#FFFFFF");
    phase.current = (phase.current + delta * 1.6) % 1;
    const arc = arcFor(start, target);

    for (let i = 0; i < DOTS; i++) {
      const t = Math.min((i + phase.current) / DOTS, 1) * 0.94;
      flightPoint(tmp, start, target, t, arc);
      s.setScalar(0.075 - t * 0.035);
      m.compose(tmp, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[DOT_GEO, mat, DOTS]}
      frustumCulled={false}
      visible={false}
    />
  );
});

/* ── Geworfene Items (Pool) ────────────────────────────────── */

/** Markierung „letzter Wurf“: Ring am Boden, so lange sichtbar (s). */
const MARKER_TIME = 1.8;
const MARKER_GEO = new THREE.RingGeometry(0.16, 0.24, 24);
const TRAIL = 10;
/** Gleichzeitig sichtbare Würfe. Ein Fehlwurf (Abprallen) belegt seinen
 *  Platz ~1,5 s – 10 Plätze reichen auch für sehr schnelles Werfen. */
const SLOTS = 10;
const TRAIL_GEO = new THREE.SphereGeometry(1, 8, 6);
const WHITE = new THREE.Color("#FFFFFF");
const KONFETTI = ["#FF5A5F", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"].map((c) => new THREE.Color(c));
const KOMET_TAIL = new THREE.Color("#5AA9FF");

/** Farbe eines Spur-Punkts: `k` = 0 (Ende) … 1 (Kopf), `t` = Zeit (s),
 *  `i` = Nummer des Punkts. */
function trailColor(out: THREE.Color, style: TrailId | "fire" | "glow", k: number, t: number, i: number) {
  switch (style) {
    case "fire":
      return out.setHSL(0.05 + k * 0.06, 1, 0.55);
    case "glow":
    case "gold":
      return out.setHSL(0.13, 1, 0.5 + k * 0.25);
    case "komet":
      return out.copy(KOMET_TAIL).lerp(WHITE, k);
    case "regenbogen":
      return out.setHSL((k * 0.7 + t * 0.6) % 1, 0.9, 0.6);
    case "konfetti":
      return out.copy(KONFETTI[(i + Math.floor(t * 6)) % KONFETTI.length]);
    case "polarlicht":
      return out.setHSL(0.42 + 0.33 * k + 0.04 * Math.sin(t * 3 + k * 6), 0.85, 0.6);
    default:
      return out.copy(WHITE);
  }
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** physics = Zielwurf: echte Wurf-Physik (game/physics.ts) statt fester Bahn. */
type Phase = "flight" | "sink" | "bounce" | "fade" | "physics";

type Slot = {
  active: boolean;
  spec: ThrowSpec | null;
  phase: Phase;
  t: number;
  p: number;
  landed: boolean;
  counted: boolean;
  started: number;
  vel: THREE.Vector3;
  trail: THREE.Vector3[];
  head: number;
  trailShown: boolean;
  /** Spur dieses Wurfs: gewählte Belohnung – oder Feuer/Gold als Rückmeldung. */
  style: TrailId | "fire" | "glow";
  model: THREE.Object3D | null;
  target: THREE.Vector3;
  arc: number;
  ball: Ball | null;
  /** Berührte Hindernisse dieses Wurfs (Trickwürfe). */
  touched: number[];
  /** Zeit seit dem Abwurf (s) und geschätzte Flugzeit bis zum Ziel. */
  age: number;
  /** Noch nicht gerechnete Zeit (feste Physik-Schritte). */
  acc: number;
  flightT: number;
};

function createSlot(): Slot {
  return {
    active: false,
    spec: null,
    phase: "flight",
    t: 0,
    p: 0,
    landed: false,
    counted: false,
    started: 0,
    vel: new THREE.Vector3(),
    trail: Array.from({ length: TRAIL }, () => new THREE.Vector3()),
    head: 0,
    trailShown: false,
    style: "standard",
    model: null,
    target: new THREE.Vector3(),
    arc: 1,
    ball: null,
    touched: [],
    age: 0,
    acc: 0,
    flightT: 1,
  };
}

export const ThrowLayer = memo(function ThrowLayer({
  bus,
  fx,
  start,
  startScale,
  endScale,
  openings,
  props = NO_PROPS,
  binSlide,
}: {
  bus: BusRef;
  fx: FxRef;
  start: THREE.Vector3;
  startScale: number;
  endScale: number;
  openings: THREE.Vector3[];
  /** Hindernisse (Trickwürfe) für die Physik. */
  props?: PropCollider[];
  /** Gleitende Zieltonne (Trickwürfe). */
  binSlide?: BinSlideSpec;
}) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const trails = useRef<(THREE.InstancedMesh | null)[]>([]);
  const slots = useMemo(() => Array.from({ length: SLOTS }, createSlot), []);
  const trailMats = useMemo(
    () =>
      Array.from(
        { length: SLOTS },
        () =>
          new THREE.MeshBasicMaterial({
            color: "#FFFFFF",
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          }),
      ),
    [],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const colliders = useMemo(() => binColliders(openings, binSlide), [openings, binSlide]);
  const events = useMemo<BallEvent[]>(() => [], []);
  const vel = useMemo(() => new THREE.Vector3(), []);
  // Markierung „letzter Wurf“ (Zielwurf, nach einem Fehlwurf)
  const markerRef = useRef<THREE.Mesh>(null);
  const markerAt = useRef(new THREE.Vector3());
  const markerAge = useRef(MARKER_TIME);
  const markerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#FFFFFF",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => markerMat.dispose(), [markerMat]);

  useEffect(() => () => trailMats.forEach((mat) => mat.dispose()), [trailMats]);

  useLayoutEffect(() => {
    trails.current.forEach((mesh) => {
      if (!mesh) return;
      for (let i = 0; i < TRAIL; i++) {
        mesh.setMatrixAt(i, ZERO);
        // Farbe je Punkt (Wurfspuren): Puffer einmal anlegen
        mesh.setColorAt(i, WHITE);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, []);

  // Beim Abbau: noch fliegende Würfe aus dem Zähler nehmen
  useEffect(
    () => () => {
      slots.forEach((s) => {
        if (s.counted) trackFlying(fx.current, -1);
        s.counted = false;
      });
    },
    [slots, fx],
  );

  const hideTrail = (i: number) => {
    const mesh = trails.current[i];
    if (!mesh) return;
    for (let k = 0; k < TRAIL; k++) mesh.setMatrixAt(k, ZERO);
    mesh.instanceMatrix.needsUpdate = true;
    // Unsichtbar = kein Zeichenaufruf für leere Spuren
    mesh.visible = false;
  };

  /** Wurf sofort abschließen (falls der Pool voll ist oder die Szene endet). */
  const finish = (i: number) => {
    const s = slots[i];
    if (!s.active || !s.spec) return;
    if (s.counted) {
      s.counted = false;
      trackFlying(fx.current, -1);
    }
    if (!s.landed) {
      s.landed = true;
      landThrow(bus.current, s.spec);
    }
    s.active = false;
    const g = groups.current[i];
    if (g) g.visible = false;
    if (s.trailShown) {
      s.trailShown = false;
      hideTrail(i);
    }
  };

  const begin = (i: number, spec: ThrowSpec, now: number) => {
    const g = groups.current[i];
    if (!g) return;
    const s = slots[i];
    if (s.model) g.remove(s.model);
    s.model = cloneModel(spec.item.name);
    g.add(s.model);

    s.active = true;
    s.spec = spec;
    s.phase = "flight";
    s.t = 0;
    s.p = 0;
    s.landed = false;
    s.started = now;
    if (spec.land) s.target.set(spec.land.x, openings[0]?.y ?? start.y, spec.land.z);
    else s.target.copy(openings[spec.binIndex] ?? start);
    // Kräftiger Wisch → flacherer Bogen (feste Bahn der klassischen Modi)
    s.arc = throwArc(start, s.target, spec.power ?? 1);
    s.trail.forEach((v) => v.copy(start));
    s.head = 0;
    s.trailShown = true;
    const trail = trails.current[i];
    if (trail) trail.visible = true;
    // Orange = „On Fire“ (Serie im Zielwurf), Gold = Perfekt/Fieber – sonst die
    // gewählte Wurfspur (Belohnungen)
    s.style = spec.fire ? "fire" : spec.glow ? "glow" : bus.current.trail;

    g.position.copy(start);
    g.scale.setScalar(startScale);
    g.rotation.set(0, 0, 0);
    g.visible = true;

    s.ball = null;
    s.touched = [];
    s.age = 0;
    s.acc = 0;
    s.flightT = FLIGHT_TIME;
    if (spec.free) {
      // Zielwurf/Trickwürfe: echter Wurf ab dem Loslassen – genau die Bahn der
      // Vorschau, dieselbe Rechnung wie in den Tests (game/physics.ts)
      // Gewicht: schwer = flacher, leicht = höher und windanfällig
      s.flightT = lobVelocity(vel, start, s.target, spec.feel?.loft ?? 1);
      s.ball = freshBall(start, vel, bus.current.clock, spec.feel?.drift ?? 1);
      s.phase = "physics";
    }

    trackFlying(fx.current, 1);
    s.counted = true;
  };

  /** Ein Zielwurf-Frame: Physik rechnen, auf Anstoßen/Hineinfallen reagieren. */
  const stepPhysics = (i: number, s: Slot, g: THREE.Group, delta: number) => {
    const ball = s.ball;
    const spec = s.spec;
    if (!ball || !spec) return;
    s.age += delta;
    colliders.forEach((c, k) => {
      c.lid = bus.current.lids[k] ?? 0;
    });
    events.length = 0;
    // Feste Schritte: gleiches Ergebnis wie Vorschau und Tests, egal bei welcher Bildrate
    s.acc += delta;
    while (s.acc >= PHYSICS_STEP) {
      stepBall(ball, PHYSICS_STEP, colliders, events, props);
      s.acc -= PHYSICS_STEP;
    }

    g.position.copy(ball.p);
    if (s.age < s.flightT) setLook(fx.current, ball.p);
    g.scale.setScalar(
      THREE.MathUtils.lerp(startScale, endScale, Math.min((s.age / s.flightT) * 1.4, 1)),
    );
    // Drehen passend zur Bewegung (rollt am Boden in Laufrichtung)
    g.rotation.x += (ball.v.z * 2.5 + 2) * delta;
    g.rotation.z -= ball.v.x * 2.5 * delta;
    if (s.counted && s.age >= s.flightT) {
      s.counted = false;
      trackFlying(fx.current, -1);
    }

    for (const e of events) {
      if (e.type === "pass") {
        // Durch den Reifen: leises Rauschen, Funkeln, der Reifen leuchtet auf
        if (s.touched.includes(e.prop)) continue;
        s.touched.push(e.prop);
        markRingPass(bus.current, e.prop);
        sfx("swish", { volume: 0.55, rate: 1.35 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        queueBurst(bus.current, {
          id: spec.id * 1000 + 20 + e.prop,
          x: ball.p.x,
          y: ball.p.y,
          z: ball.p.z,
          colors: ["#FFD54A", "#FFFFFF", "#FFB300"],
          count: 10,
          power: 0.6,
          ring: false,
        });
        continue;
      }
      if (e.type === "bounce") {
        if (e.speed > 1.2) {
          // Klang je Bauteil, Tonhöhe und Lautstärke nach Wucht
          const loud = Math.min(e.speed / 6, 0.9);
          const pitch = 0.85 + Math.min(e.speed / 12, 0.35);
          if (e.part === "lid") sfx("lid", { volume: loud, rate: pitch });
          else if (e.part === "ground") sfx("land", { volume: loud * 0.6, rate: 1.25 });
          else if (e.part === "ring") sfx("rim", { volume: loud, rate: pitch * 1.25 });
          else if (e.part === "blade") sfx("lid", { volume: loud, rate: pitch * 0.7 });
          else sfx("rim", { volume: loud, rate: e.part === "wall" ? pitch * 0.8 : pitch });
        }
        if (e.prop !== undefined && e.speed > 1.5)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        if (e.bin !== null && e.speed > 1.5) {
          queueBinEvent(bus.current, e.bin, "bump");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
        continue;
      }
      // Hineingefallen
      if (s.landed) {
        finish(i);
        return;
      }
      s.landed = true;
      landThrow(bus.current, spec, {
        bin: e.bin,
        clean: !ball.touched,
        x: ball.p.x,
        via: ball.via,
        props: s.touched.slice(),
      });
      if (spec.free?.accept[e.bin]) {
        finish(i);
        return;
      }
      // Falsche Tonne spuckt ihn sanft wieder aus (nicht Richtung Kamera)
      ball.inside = null;
      ball.touched = true;
      ball.p.y = BIN_SHAPE.top + 0.25;
      ball.v.set(0, 3.8, 1.4);
      break;
    }

    // Daneben: beim ersten Bodenkontakt sofort auflösen („puff“) – kein
    // langes Herumrollen, dem man beim Verfehlen zusehen muss
    const onGround = events.some((e) => e.type === "bounce" && e.part === "ground");
    if ((onGround && ball.inside === null) || ballSettled(ball) || s.age > 4.5) {
      if (!s.landed) {
        s.landed = true;
        landThrow(bus.current, spec, {
          bin: null,
          clean: false,
          x: ball.p.x,
          near: ball.touched,
          props: s.touched.slice(),
        });
        // Lernhilfe: kurz zeigen, wohin der Wurf gezielt war (zu kurz / zu weit)
        markerAt.current.set(s.target.x, 0.03, s.target.z);
        markerAge.current = 0;
      }
      queueBurst(bus.current, {
        id: spec.id * 1000 + 7,
        x: ball.p.x,
        y: ball.p.y,
        z: ball.p.z,
        colors: ["#FFFFFF", "#E5E7EB", "#F3F4F6"],
        count: 7,
        power: 0.45,
        ring: false,
      });
      s.phase = "fade";
      s.p = 0;
    }
  };

  useFrame((state, rawDelta) => {
    const now = state.clock.elapsedTime;
    const started = __DEV__ ? performance.now() : 0;

    // Neue Würfe auf freie Plätze verteilen (sonst den ältesten abschließen)
    const queued = takeThrows(bus.current);
    for (const spec of queued) {
      let free = slots.findIndex((s) => !s.active);
      if (free === -1) {
        free = 0;
        slots.forEach((s, i) => {
          if (s.started < slots[free].started) free = i;
        });
        finish(free);
      }
      begin(free, spec, now);
    }

    const delta = Math.min(rawDelta, 0.05) * fx.current.timeScale;
    // Szenen-Uhr (bewegte Reifen): läuft genau wie die Wurf-Physik
    bus.current.clock += delta;

    // Markierung „letzter Wurf“ blendet aus
    const marker = markerRef.current;
    if (marker) {
      markerAge.current += rawDelta;
      const k = Math.min(markerAge.current / MARKER_TIME, 1);
      marker.visible = k < 1;
      if (k < 1) {
        marker.position.copy(markerAt.current);
        marker.scale.setScalar(0.8 + k * 0.5);
        markerMat.opacity = 0.7 * (1 - k);
      }
    }

    for (let i = 0; i < SLOTS; i++) {
      const s = slots[i];
      const g = groups.current[i];
      if (!s.active || !g || !s.spec) continue;
      const { hit } = s.spec;

      if (s.phase === "flight") {
        s.t = Math.min(s.t + delta / FLIGHT_TIME, 1);
        flightPoint(tmp, start, s.target, s.t, s.arc);
        g.position.copy(tmp);
        setLook(fx.current, tmp);
        const size = THREE.MathUtils.lerp(startScale, endScale, Math.min(s.t * 1.4, 1));
        // Abwurf: kurz in die Länge gezogen, dann zurück (wirkt kraftvoll)
        const kick = Math.max(0, 1 - s.t / 0.18);
        g.scale.set(size * (1 - 0.14 * kick), size * (1 + 0.28 * kick), size * (1 - 0.14 * kick));
        g.rotation.x += delta * 9;
        g.rotation.y += delta * 6;

        if (s.t >= 1) {
          if (s.counted) {
            s.counted = false;
            trackFlying(fx.current, -1);
          }
          if (!s.landed) {
            s.landed = true;
            landThrow(bus.current, s.spec);
          }
          s.p = 0;
          if (hit) {
            s.phase = "sink";
          } else {
            s.phase = "bounce";
            // Abprallen (falsche Tonne) Richtung Kamera
            s.vel.set((Math.random() - 0.5) * 1.2, 3.2, 2.6);
          }
        }
      } else if (s.phase === "physics") {
        stepPhysics(i, s, g, delta);
        if (!s.active) continue;
      } else if (s.phase === "sink") {
        s.p = Math.min(s.p + delta / 0.22, 1);
        g.position.set(s.target.x, s.target.y - s.p * 0.6, s.target.z);
        g.scale.setScalar(endScale * (1 - s.p * 0.85));
        g.rotation.y += delta * 4;
        if (s.p >= 1) s.phase = "fade";
      } else if (s.phase === "bounce") {
        s.vel.y -= 9.5 * delta;
        g.position.addScaledVector(s.vel, delta);
        g.rotation.x -= delta * 10;
        g.rotation.z += delta * 7;
        if (g.position.y <= 0.18 && s.vel.y < 0) {
          g.position.y = 0.18;
          if (Math.abs(s.vel.y) > 1.2) {
            s.vel.y *= -0.35;
            s.vel.x *= 0.6;
            s.vel.z *= 0.6;
          } else {
            s.phase = "fade";
            s.p = 0;
          }
        }
      } else {
        // Zielwurf daneben: kurzes, weiches „Puff“ (schrumpfen + leicht heben)
        const poof = !!s.spec.free && !hit;
        s.p = Math.min(s.p + delta / (hit ? 0.05 : poof ? 0.28 : 0.45), 1);
        if (!hit) g.scale.setScalar(endScale * (poof ? 1 - s.p * s.p : 1 - s.p));
        if (poof) g.position.y += delta * 0.6;
        if (s.p >= 1) {
          finish(i);
          continue;
        }
      }

      // Leuchtspur (nur im Flug; im Zielwurf bis zum ersten Anstoßen)
      const mesh = trails.current[i];
      if (!mesh) continue;
      const flying =
        s.phase === "flight" ||
        (s.phase === "physics" && !!s.ball && !s.ball.touched && s.ball.inside === null);
      if (!flying) {
        if (s.trailShown) {
          s.trailShown = false;
          hideTrail(i);
        }
        continue;
      }
      s.trail[s.head].copy(g.position);
      s.head = (s.head + 1) % TRAIL;
      const big = s.style === "fire" || s.style === "glow" || s.style === "komet";
      for (let k = 0; k < TRAIL; k++) {
        const idx = (s.head + k) % TRAIL;
        sv.setScalar(0.03 + (k / TRAIL) * (big ? 0.09 : 0.06));
        m.compose(s.trail[idx], q, sv);
        mesh.setMatrixAt(k, m);
        mesh.setColorAt(k, trailColor(tint, s.style, k / TRAIL, now, k));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    if (__DEV__) {
      const ms = performance.now() - started;
      if (ms > 2) perfMark("würfe/physik", ms);
    }
  });

  return (
    <>
      <mesh
        ref={markerRef}
        geometry={MARKER_GEO}
        material={markerMat}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      />
      {trailMats.map((mat, i) => (
        <instancedMesh
          key={`trail-${i}`}
          ref={(mesh) => {
            trails.current[i] = mesh;
          }}
          args={[TRAIL_GEO, mat, TRAIL]}
          frustumCulled={false}
          visible={false}
        />
      ))}
      {trailMats.map((_, i) => (
        <group
          key={`slot-${i}`}
          ref={(g) => {
            groups.current[i] = g;
          }}
          visible={false}
        />
      ))}
    </>
  );
});
