// Datei: components/game/trick-props.tsx
// Hindernisse der Trickwürfe, einmal gebaut und „gebacken“ (model-cache:
// bake → ein Zeichenaufruf pro Teil):
//  - Reifen: rot-weiß gestreift wie ein Zirkusreifen; durchflogen leuchtet
//    er golden auf
//  - Windrad: Mast + Nabe, die Flügel drehen sich
//  - Ventilator: Gerät am Rand des Windfelds, Windstreifen zeigen Richtung
//    und Stärke
//  - Laternenmast: grauer Mast mit Ausleger und warm leuchtender Lampe
//  - Bauzaun: Gitterfelder mit Pfosten und Betonfüßen, durchsichtig
//  - Straßenschild: blaues Einbahnstraßen-Schild auf einem Pfosten zwischen
//    zwei Tonnen; der Pfeil zeigt, wohin der Abpraller geht
//  - Torwand: grüne Felder mit je einem Loch (weißer Rand), außen Pfosten;
//    durchworfen leuchtet der Lochrand golden auf
//  - Trampolin: Garten-Trampolin mit blauem Polster; das Tuch federt beim
//    Aufprall sichtbar ein, ein fahrendes rollt auf der Szenen-Uhr mit
// Bewegung folgt der Szenen-Uhr (bus.clock) – genau wie die Physik
// (game/physics.ts → ringPose, windmillAngle).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { WashLine } from "./wash-line";

import {
  BLADE_THICK,
  type FanCollider,
  LAMP_ARM_HALF,
  LAMP_R,
  type LampCollider,
  type PropCollider,
  type RingCollider,
  ringPose,
  SIGN_THICK,
  type SignCollider,
  swingAngle,
  type BoardCollider,
  type TrampolineCollider,
  trampolineX,
  type WindmillCollider,
  windmillAngle,
} from "@/game/physics";

import { lowpoly } from "./materials";
import { KITCHEN_WINDOW_X } from "./stage";
import { bake } from "./model-cache";
import { type BusRef } from "./scene-bus";

const STRIPES = 10;
/** So lange (s) leuchtet ein durchflogener Reifen. */
const FLASH = 0.6;

function hoop(radius: number, tube: number): THREE.Object3D {
  const g = new THREE.Group();
  const arc = (Math.PI * 2) / STRIPES;
  for (let i = 0; i < STRIPES; i++) {
    const part = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 5, arc),
      lowpoly(i % 2 ? "#FFFFFF" : "#F0533A"),
    );
    part.rotation.z = i * arc;
    g.add(part);
  }
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** Ring mit Loch (Küche: Küchenrolle, Wurf durchs Papprohr). Mitte im Ursprung, Normale entlang z. */
function annulus(outer: number, inner: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Büro: LED-Ringleuchte an zwei Kabeln von der Decke – das Pendel über allen Tonnen. Der leuchtende Ring ist
 *  die Öffnung (gleiche Maße wie die Physik: Mitte der Röhre = radius), die Kabel laufen oben aus dem Bild
 *  (Aufhängung an der Decke). Mitte im Ursprung. */
function ledRing(radius: number, tube: number, length: number): THREE.Object3D {
  const g = new THREE.Group();
  // Leuchtender Ring (hell, mit Eigenleuchten) auf einem schmalen dunklen Träger dahinter
  g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, tube * 0.8, 10, 36), lowpoly("#FFFFFF", { emissive: "#E4F1FF" })));
  const carrier = new THREE.Mesh(new THREE.TorusGeometry(radius, tube * 0.45, 8, 36), lowpoly("#3A4149"));
  carrier.position.z = -tube * 0.55;
  g.add(carrier);
  // Zwei Kabel von den oberen Ringseiten zu einem Aufhängepunkt `length` über der Mitte
  const top = radius + tube;
  for (const side of [-1, 1]) {
    const x0 = side * radius * 0.55;
    const y0 = Math.sqrt(Math.max(radius * radius - x0 * x0, 0)) + tube * 0.4;
    const len = Math.hypot(0 - x0, length - y0);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5), lowpoly("#2E3338"));
    cable.position.set(x0 / 2, (length + y0) / 2, 0);
    cable.rotation.z = Math.atan2(x0, length - y0);
    g.add(cable);
  }
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), lowpoly("#2E3338"));
  mount.position.y = length + 0.02;
  g.add(mount);
  void top;
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** Küche: Küchenrolle am Faden – das Pendel über allen Tonnen. Papier (weiß) um ein Papprohr
 *  (braun); das Rohr ist die Öffnung (gleiche Maße wie die Physik: Mitte der Röhre = radius). */
function kitchenRoll(radius: number, tube: number, length: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(annulus(radius + tube, radius, 0.28), lowpoly("#F7F7F2")));
  g.add(new THREE.Mesh(annulus(radius, radius - tube, 0.34), lowpoly("#B98A5B")));
  const top = radius + tube;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length - top + 0.05, 6), lowpoly("#C9A46A"));
  rope.position.y = (length + top) / 2;
  g.add(rope);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), lowpoly("#B08D55"));
  knot.position.y = top + 0.03;
  g.add(knot);
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** Reifenschaukel: Autoreifen (Mitte im Ursprung), Seil vom oberen Rand bis
 *  zum Aufhängepunkt `length` darüber (liegt über dem Bildrand – kein Ast
 *  nötig), Knoten am Reifen. Pendelt als Ganzes. */
function swingTire(radius: number, tube: number, length: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 18), lowpoly("#2E2E33")));
  // Lauffläche: etwas hellere Rillen-Klötze außen auf dem Reifen (aufliegend)
  // (Klotz 0,05 hoch: innen unter der Rundung auch an den Kanten, außen 5 mm drüber)
  const block = new THREE.BoxGeometry(0.07, 0.05, tube * 1.3);
  const blocks = 14;
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * Math.PI * 2;
    const b = new THREE.Mesh(block, lowpoly("#45454B"));
    const r = radius + tube - 0.02;
    b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    b.rotation.z = a - Math.PI / 2;
    g.add(b);
  }
  const top = radius + tube;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length - top + 0.05, 6), lowpoly("#C9A46A"));
  rope.position.y = (length + top) / 2;
  g.add(rope);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), lowpoly("#B08D55"));
  knot.position.y = top + 0.03;
  g.add(knot);
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

const Ring = memo(function Ring({ ring, bus, kitchen, office }: { ring: RingCollider; bus: BusRef; kitchen?: boolean; office?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const swing = ring.motion?.kind === "swing" ? ring.motion : undefined;
  const length = swing?.length ?? 0;
  const model = useMemo(
    () =>
      length
        ? office
          ? ledRing(ring.radius, ring.tube, length)
          : kitchen
            ? kitchenRoll(ring.radius, ring.tube, length)
            : swingTire(ring.radius, ring.tube, length)
        : hoop(ring.radius, ring.tube),
    [ring.radius, ring.tube, length, kitchen, office],
  );
  const glowGeo = useMemo(
    () => new THREE.TorusGeometry(ring.radius, ring.tube * (length ? 1.4 : 2.2), 8, 36),
    [ring.radius, ring.tube, length],
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: "#FFD54A", transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const center = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      glowGeo.dispose();
      glowMat.dispose();
    },
    [model, glowGeo, glowMat],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const clock = bus.current.clock;
    ringPose(ring, clock, center, normal);
    g.position.copy(center);
    g.rotation.y = Math.atan2(normal.x, normal.z);
    // Schaukel kippt mit dem Seil (Aufhängepunkt bleibt oben stehen)
    if (swing) g.rotation.z = swingAngle(swing, clock);
    // Aufleuchten nach dem Durchfliegen: kurz größer und golden
    const since = clock - (bus.current.ringPass[ring.id] ?? -99);
    const k = since >= 0 && since < FLASH ? 1 - since / FLASH : 0;
    g.scale.setScalar(1 + k * 0.18);
    glowMat.opacity = k * 0.85;
    if (glow.current) glow.current.visible = k > 0;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      <mesh ref={glow} geometry={glowGeo} material={glowMat} visible={false} />
    </group>
  );
});

/** Mast + Nabe (steht) und Flügel (drehen sich um die Nabe). */
function windmillParts(w: WindmillCollider) {
  const stand = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, w.y, 8), lowpoly("#8C5E3C"));
  pole.position.set(0, -w.y / 2, -0.12);
  stand.add(pole);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 12), lowpoly("#E2483A"));
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.02;
  stand.add(hub);

  const rotor = new THREE.Group();
  const blade = new THREE.BoxGeometry(w.length, w.breadth * 2, BLADE_THICK * 2);
  const tip = new THREE.BoxGeometry(0.22, w.breadth * 2 + 0.01, BLADE_THICK * 2 + 0.01);
  for (let k = 0; k < w.blades; k++) {
    const arm = new THREE.Group();
    arm.rotation.z = (k * Math.PI * 2) / w.blades;
    const b = new THREE.Mesh(blade, lowpoly("#FBF5E8"));
    b.position.x = w.length / 2;
    const t = new THREE.Mesh(tip, lowpoly("#E2483A"));
    t.position.x = w.length - 0.11;
    arm.add(b, t);
    rotor.add(arm);
  }
  const bakedStand = bake(stand);
  const bakedRotor = bake(rotor);
  for (const g of [stand, rotor]) g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return { stand: bakedStand, rotor: bakedRotor };
}

const Windmill = memo(function Windmill({ mill, bus }: { mill: WindmillCollider; bus: BusRef }) {
  const rotor = useRef<THREE.Group>(null);
  const parts = useMemo(() => windmillParts(mill), [mill]);
  useEffect(
    () => () => {
      for (const o of [parts.stand, parts.rotor])
        o.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
    },
    [parts],
  );
  useFrame(() => {
    if (rotor.current) rotor.current.rotation.z = windmillAngle(mill, bus.current.clock);
  });
  return (
    <group position={[mill.x, mill.y, mill.z]}>
      <primitive object={parts.stand} />
      <group ref={rotor}>
        <primitive object={parts.rotor} />
      </group>
    </group>
  );
});

/** Ventilator: Mast, Gehäuse, drehende Blätter – auf der Seite, von der der
 *  Wind kommt – und Windstreifen, die durch das Feld ziehen. */
const STREAKS = 16;
const STREAK_GEO = new THREE.BoxGeometry(0.32, 0.018, 0.018);


/* ── Küchen-Wind: Böen, Papierschnipsel, Vorhang am offenen Fenster ───────────── */

const K_STREAKS = 26;
const K_STREAK_GEO = new THREE.BoxGeometry(0.55, 0.012, 0.012);
const K_BITS = 9;
const K_BIT_GEO = new THREE.BoxGeometry(0.1, 0.07, 0.004);
const CURTAIN_W = 1.45;
const CURTAIN_H = 1.55;
const CURTAIN_COLS = 8;
const CURTAIN_ROWS = 12;

/** Vorhang am Küchenfenster, vom Wind aufgebauscht (der Wind kommt vom Fenster und zieht nach `dir`). */
const WindowCurtain = memo(function WindowCurtain({ dir, strength, calm }: { dir: number; strength: number; calm: boolean }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(CURTAIN_W, CURTAIN_H, CURTAIN_COLS, CURTAIN_ROWS), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo]);
  const cloth = useMemo(() => new THREE.MeshBasicMaterial({ color: "#F6ECD9", side: THREE.DoubleSide }), []);
  const rod = useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, CURTAIN_W + 0.3, 8), []);
  useEffect(
    () => () => {
      geo.dispose();
      cloth.dispose();
      rod.dispose();
    },
    [geo, cloth, rod],
  );
  useFrame((state) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = calm ? 0 : state.clock.elapsedTime;
    const amp = (calm ? 0.1 : 0.16) + strength * 0.025;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const v = (CURTAIN_H / 2 - by) / CURTAIN_H; // 0 oben (an der Stange) bis 1 unten
      const gust = 0.55 + 0.45 * Math.sin(t * 1.5 + bx * 2.4);
      const flutter = Math.sin(t * 3.3 + bx * 5 + v * 4) * 0.045 * v;
      pos.setXYZ(i, bx + dir * amp * v * v * gust + flutter * 0.4, by, 0.22 * v * Math.sin(t * 1.1 + bx * 3) * 0.7 + flutter);
    }
    pos.needsUpdate = true;
  });
  return (
    <group position={[KITCHEN_WINDOW_X, 3.5, -2.16]}>
      <mesh geometry={geo} material={cloth} position={[0, -CURTAIN_H / 2, 0]} />
      <mesh geometry={rod} material={lowpoly("#A27447")} rotation={[0, 0, Math.PI / 2]} />
    </group>
  );
});

function fanParts(f: FanCollider) {
  const body = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, f.y, 8), lowpoly("#6B7280"));
  pole.position.y = -f.y / 2;
  body.add(pole);
  const housing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 20), lowpoly("#3B82F6"));
  housing.rotation.y = Math.PI / 2;
  body.add(housing);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lowpoly("#1E3A8A"));
  body.add(hub);
  const blades = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.12), lowpoly("#E5E7EB"));
    blade.position.y = 0.16;
    const arm = new THREE.Group();
    arm.rotation.x = (k * Math.PI * 2) / 3;
    arm.add(blade);
    blades.add(arm);
  }
  const bakedBody = bake(body);
  const bakedBlades = bake(blades);
  for (const g of [body, blades]) g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return { body: bakedBody, blades: bakedBlades };
}

const Fan = memo(function Fan({ fan, calm, kitchen, office, yard }: { fan: FanCollider; calm: boolean; kitchen?: boolean; office?: boolean; yard?: boolean }) {
  const dir = Math.sign(fan.force) || 1;
  const blades = useRef<THREE.Group>(null);
  const streaks = useRef<THREE.InstancedMesh>(null);
  const bits = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => fanParts(fan), [fan]);
  const bitMat = useMemo(() => new THREE.MeshBasicMaterial({ color: yard ? "#8FC46A" : "#FFF3D6", side: THREE.DoubleSide }), [yard]);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false }),
    [],
  );
  // Startlage der Streifen (fest verteilt, damit es ruhig wirkt)
  const seeds = useMemo(
    () => Array.from({ length: STREAKS }, (_, i) => ({ u: (i * 0.61) % 1, y: ((i * 0.37) % 1) * 2 - 1, z: ((i * 0.73) % 1) * 2 - 1 })),
    [],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  useEffect(
    () => () => {
      mat.dispose();
      bitMat.dispose();
      for (const o of [parts.body, parts.blades]) o.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
    },
    [mat, bitMat, parts],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (kitchen || office || yard) {
      // Küche/Büro/Hof: weiche Böen (blenden ein und aus, schwingen leicht, unterschiedlich lang und schnell)
      // und mitgetragene Papierschnipsel – kein Ventilator, der Wind kommt durchs Fenster
      const sp = calm ? 0 : 0.22 + Math.abs(fan.force) * 0.035;
      const km = streaks.current;
      if (km) {
        for (let i = 0; i < K_STREAKS; i++) {
          const s = seeds[i % seeds.length];
          const w = 0.7 + ((i * 0.37) % 0.6);
          const u = (s.u + i * 0.173 + t * sp * w) % 1;
          const fade = Math.sin(Math.PI * u);
          pos.set(
            fan.x + dir * (u * 2 - 1) * fan.halfW,
            fan.y + s.y * fan.halfH + Math.sin(u * 6.28 + i) * 0.07,
            fan.z + s.z * fan.halfD,
          );
          scl.set(Math.max(fade, 0.001) * (0.6 + ((i * 0.53) % 0.8)), 1, 1);
          quat.identity();
          m.compose(pos, quat, scl);
          km.setMatrixAt(i, m);
        }
        km.instanceMatrix.needsUpdate = true;
      }
      const bm = bits.current;
      if (bm) {
        for (let i = 0; i < K_BITS; i++) {
          const s = seeds[(i * 3) % seeds.length];
          const u = (s.u + i * 0.29 + t * sp * 0.55) % 1;
          pos.set(
            fan.x + dir * (u * 2 - 1) * (fan.halfW + 0.2),
            fan.y + s.y * fan.halfH * 0.9 - u * 0.5 + Math.sin(t * 2 + i * 2) * 0.06,
            fan.z + s.z * fan.halfD,
          );
          euler.set(t * (1.4 + i * 0.2), t * (1 + i * 0.15), i);
          quat.setFromEuler(euler);
          scl.set(1, 1, 1);
          m.compose(pos, quat, scl);
          bm.setMatrixAt(i, m);
        }
        bm.instanceMatrix.needsUpdate = true;
      }
      return;
    }
    if (blades.current) blades.current.rotation.x = t * 14 * dir;
    const mesh = streaks.current;
    if (!mesh) return;
    // Streifen ziehen mit dem Wind durchs Feld (Tempo passt zur Stärke)
    const speed = calm ? 0 : 0.25 + Math.abs(fan.force) * 0.04;
    for (let i = 0; i < STREAKS; i++) {
      const s = seeds[i];
      const u = (s.u + t * speed) % 1;
      m.makeTranslation(fan.x + dir * (u * 2 - 1) * fan.halfW, fan.y + s.y * fan.halfH, fan.z + s.z * fan.halfD);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  const fx = fan.x - dir * (fan.halfW + 0.35);
  if (kitchen || office || yard) {
    return (
      <>
        <instancedMesh ref={streaks} args={[K_STREAK_GEO, mat, K_STREAKS]} frustumCulled={false} />
        <instancedMesh ref={bits} args={[K_BIT_GEO, bitMat, K_BITS]} frustumCulled={false} />
        {kitchen && dir < 0 && <WindowCurtain dir={dir} strength={Math.abs(fan.force)} calm={calm} />}
        {yard && <WashLine dir={dir} strength={Math.abs(fan.force)} calm={calm} />}
      </>
    );
  }
  return (
    <>
      <group position={[fx, fan.y, fan.z]} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
        <primitive object={parts.body} />
        <group ref={blades}>
          <primitive object={parts.blades} />
        </group>
      </group>
      <instancedMesh ref={streaks} args={[STREAK_GEO, mat, STREAKS]} frustumCulled={false} />
    </>
  );
});

/** Tafel (blau, weißer Rand, weißer Pfeil) – in Tafel-Koordinaten gebaut. */
function signBoard(sg: SignCollider, arrowDir: number): THREE.Object3D {
  const g = new THREE.Group();
  const w = sg.halfW * 2;
  const h = sg.halfH * 2;
  const d = SIGN_THICK * 2;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lowpoly("#FFFFFF")));
  const face = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h - 0.06, 0.004), lowpoly("#1E5AA8"));
  face.position.z = SIGN_THICK + 0.002;
  g.add(face);
  // Pfeil: Schaft + Spitze (zeigt zur Tonne, in die der Abpraller fällt)
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.18, 0.004), lowpoly("#FFFFFF"));
  shaft.position.set(-arrowDir * w * 0.08, 0, SIGN_THICK + 0.005);
  g.add(shaft);
  const tip = new THREE.Shape();
  tip.moveTo(0, h * 0.24);
  tip.lineTo(arrowDir * w * 0.22, 0);
  tip.lineTo(0, -h * 0.24);
  tip.closePath();
  const head = new THREE.Mesh(new THREE.ShapeGeometry(tip), lowpoly("#FFFFFF"));
  head.position.set(arrowDir * w * 0.14, 0, SIGN_THICK + 0.005);
  g.add(head);
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** Straßenschild: Pfosten in der Lücke zwischen den Tonnen, Tafel schräg
 *  gedreht (yaw) und geneigt (tilt) – genau wie die Physik. Getroffen pulsiert es. */
const Sign = memo(function Sign({ sign, bus }: { sign: SignCollider; bus: BusRef }) {
  const board = useRef<THREE.Group>(null);
  // Pfeil zeigt zur Mitte (Schild links → nach rechts)
  const arrowDir = sign.x < 0 ? 1 : -1;
  const model = useMemo(() => signBoard(sign, arrowDir), [sign, arrowDir]);
  const bottom = sign.y - sign.halfH * Math.cos(sign.tilt);
  // Pfosten in der Lücke zur Mitte hin (nicht durch eine Tonne)
  const poleX = sign.x + arrowDir * 0.11;
  useEffect(() => () => model.traverse((o) => (o as THREE.Mesh).geometry?.dispose()), [model]);
  useFrame(() => {
    const b = board.current;
    if (!b) return;
    const since = bus.current.clock - (bus.current.ringPass[sign.id] ?? -99);
    const k = since >= 0 && since < FLASH ? 1 - since / FLASH : 0;
    b.scale.setScalar(1 + k * 0.08);
  });
  return (
    <>
      <mesh position={[poleX, bottom / 2, sign.z - 0.04]} material={lowpoly("#9AA3AC")} castShadow>
        <cylinderGeometry args={[0.035, 0.035, bottom, 8]} />
      </mesh>
      <group position={[sign.x, sign.y, sign.z]} rotation={[0, sign.yaw, 0]}>
        <group rotation={[sign.tilt, 0, 0]}>
          <group ref={board}>
            <primitive object={model} />
          </group>
        </group>
      </group>
    </>
  );
});

/** Torwand-Feld: Tafel mit Loch (Dicke wie die Physik), weißer Lochrand auf
 *  der Vorderseite, Pfosten außen bis zum Boden. Mitte im Ursprung. */
function boardModel(b: BoardCollider, kitchen?: boolean): THREE.Object3D {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-b.halfW, -b.halfH);
  shape.lineTo(b.halfW, -b.halfH);
  shape.lineTo(b.halfW, b.halfH);
  shape.lineTo(-b.halfW, b.halfH);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(b.hole.x, b.hole.y, b.hole.r, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: SIGN_THICK * 2, bevelEnabled: false, curveSegments: 20 });
  geo.translate(0, 0, -SIGN_THICK);
  // Küche: Holzfront eines Standregals mit runden Fächern statt der grünen Torwand
  g.add(new THREE.Mesh(geo, lowpoly(kitchen ? "#C99B6D" : "#2F8F4E")));
  // Weiße Kante oben und unten (Felder stoßen seitlich aneinander)
  for (const side of [1, -1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(b.halfW * 2, 0.06, SIGN_THICK * 2 + 0.01), lowpoly(kitchen ? "#A27447" : "#F4F4F0"));
    edge.position.y = side * (b.halfH - 0.03);
    g.add(edge);
  }
  // Pfosten vom Boden (y = 0) bis zur Oberkante der Tafel. Küche: jedes Feld steht auf zwei
  // Holzbeinen (an den Nachbarfeldern fallen sie zusammen) – das Regal schwebt nicht.
  const posts: (1 | -1)[] = kitchen ? [-1, 1] : b.post ? [b.post] : [];
  for (const side of posts) {
    const height = b.y + b.halfH;
    const post = new THREE.Mesh(
      kitchen ? new THREE.BoxGeometry(0.09, height, 0.09) : new THREE.CylinderGeometry(0.045, 0.045, height, 8),
      lowpoly(kitchen ? "#A27447" : "#D9DDE1"),
    );
    post.position.set(side * (b.halfW + 0.045), height / 2 - b.y, 0);
    g.add(post);
  }
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

const Board = memo(function Board({ board, bus, kitchen }: { board: BoardCollider; bus: BusRef; kitchen?: boolean }) {
  const rim = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const model = useMemo(() => boardModel(board, kitchen), [board, kitchen]);
  // Lochrand: Rohr halb in der Vorderseite, innen bündig mit dem Loch
  const rimGeo = useMemo(() => new THREE.TorusGeometry(board.hole.r + 0.03, 0.03, 6, 28), [board]);
  const glowGeo = useMemo(() => new THREE.TorusGeometry(board.hole.r + 0.03, 0.07, 6, 28), [board]);
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FFD54A", transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  useEffect(
    () => () => {
      model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      rimGeo.dispose();
      glowGeo.dispose();
      glowMat.dispose();
    },
    [model, rimGeo, glowGeo, glowMat],
  );
  useFrame(() => {
    const r = rim.current;
    if (!r) return;
    const since = bus.current.clock - (bus.current.ringPass[board.id] ?? -99);
    const k = since >= 0 && since < FLASH ? 1 - since / FLASH : 0;
    r.scale.setScalar(1 + k * 0.12);
    glowMat.opacity = k * 0.85;
    if (glow.current) glow.current.visible = k > 0;
  });
  return (
    <group position={[board.x, board.y, board.z]}>
      <primitive object={model} />
      <group ref={rim} position={[board.hole.x, board.hole.y, SIGN_THICK]}>
        <mesh geometry={rimGeo} material={lowpoly("#FFFFFF")} />
        <mesh ref={glow} geometry={glowGeo} material={glowMat} visible={false} />
      </group>
    </group>
  );
});

/** Laternenmast, einmal gebaut und gebacken (steht still). */
function lampModel(l: LampCollider): THREE.Object3D {
  const g = new THREE.Group();
  const metal = lowpoly("#4B5563");
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(LAMP_R * 0.85, LAMP_R * 1.2, l.height, 10), metal);
  pole.position.y = l.height / 2;
  g.add(pole);
  // Fuß nur knapp breiter als der Mast (Physik rechnet mit LAMP_R)
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(LAMP_R * 1.15, LAMP_R * 1.3, 0.14, 10), metal);
  foot.position.y = 0.07;
  g.add(foot);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(l.arm, LAMP_ARM_HALF * 1.6, LAMP_ARM_HALF * 1.6), metal);
  arm.position.set((l.side * l.arm) / 2, l.height, 0);
  g.add(arm);
  // Leuchte am Ende – liegt ganz im Kollisionskasten des Auslegers
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, LAMP_ARM_HALF * 2, LAMP_ARM_HALF * 2), lowpoly("#374151"));
  head.position.set(l.side * (l.arm - 0.15), l.height, 0);
  g.add(head);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, LAMP_ARM_HALF * 1.6), lowpoly("#FFE7A0", { emissive: "#FFD36B" }));
  glass.position.set(l.side * (l.arm - 0.15), l.height - LAMP_ARM_HALF + 0.005, 0);
  g.add(glass);
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

const Lamp = memo(function Lamp({ lamp }: { lamp: LampCollider }) {
  const model = useMemo(() => lampModel(lamp), [lamp]);
  useEffect(() => () => model.traverse((o) => (o as THREE.Mesh).geometry?.dispose()), [model]);
  return (
    <group position={[lamp.x, 0, lamp.z]}>
      <primitive object={model} />
    </group>
  );
});

/** Bauzaun: Rahmen + dünne Gitterstäbe (durchsichtig, die Tonnen bleiben
 *  sichtbar), Pfosten mit Betonfüßen. Einmal gebaut und gebacken. */
function fenceModel(f: SignCollider): THREE.Object3D {
  const g = new THREE.Group();
  const top = f.halfH * 2;
  const metal = lowpoly("#9AA3AC");
  const wire = lowpoly("#B8C0C8");
  const panels = 4;
  const pw = (f.halfW * 2) / panels;
  for (let i = 0; i <= panels; i++) {
    const x = -f.halfW + i * pw;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, top, 0.05), metal);
    post.position.set(x, top / 2, 0);
    g.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.36), lowpoly("#C9C2B5"));
    foot.position.set(x, 0.06, 0);
    g.add(foot);
  }
  for (const y of [0.15, top - 0.03]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(f.halfW * 2, 0.04, 0.04), metal);
    rail.position.set(0, y, 0);
    g.add(rail);
  }
  for (let x = -f.halfW + 0.15; x < f.halfW; x += 0.15) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, top - 0.2, 0.012), wire);
    bar.position.set(x, top / 2 + 0.05, 0);
    g.add(bar);
  }
  for (let y = 0.45; y < top - 0.1; y += 0.3) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(f.halfW * 2, 0.012, 0.012), wire);
    bar.position.set(0, y, 0);
    g.add(bar);
  }
  // Rot-weißes Warnband oben
  for (let i = 0; i < 12; i++) {
    const w = (f.halfW * 2) / 12;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.02), lowpoly(i % 2 ? "#FFFFFF" : "#E2483A"));
    band.position.set(-f.halfW + w * (i + 0.5), top - 0.12, 0.03);
    g.add(band);
  }
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

const Fence = memo(function Fence({ fence }: { fence: SignCollider }) {
  const model = useMemo(() => fenceModel(fence), [fence]);
  useEffect(() => () => model.traverse((o) => (o as THREE.Mesh).geometry?.dispose()), [model]);
  return (
    <group position={[fence.x, 0, fence.z]}>
      <primitive object={model} />
    </group>
  );
});

/** Trampolin-Gestell (Beine + Polsterring), einmal gebaut und gebacken. Das
 *  Tuch ist ein eigenes Teil – es federt beim Aufprall. Rund gezeichnet, in
 *  der Tiefe auf die Maße der Physik (halfW × halfD) gestaucht. */
function trampolineFrame(t: TrampolineCollider, kitchen?: boolean, office?: boolean): THREE.Object3D {
  const g = new THREE.Group();
  if (office && t.slide) {
    // Büro, fahrend: Rollhocker – runder Sitz (dort prallt der Gegenstand ab, Oberkante bei y der Physik),
    // Gasfeder, fünfarmiger Fuß mit Rollen. Ohne hohe Lehne, damit er die Tonnen nicht verdeckt.
    const hw = t.halfW;
    const top = t.y;
    const chrome = lowpoly("#C7D0D9");
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(hw, hw * 0.96, 0.1, 28), lowpoly("#3D82D9"));
    seat.position.y = top - 0.05;
    g.add(seat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(hw * 0.98, 0.025, 6, 28), lowpoly("#2B63A8"));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = top - 0.08;
    g.add(rim);
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, top - 0.1 - 0.12, 10), chrome);
    lift.position.y = 0.12 + (top - 0.22) / 2;
    g.add(lift);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.78, 0.035, 0.07), lowpoly("#2E3338"));
      arm.position.set(Math.cos(a) * hw * 0.39, 0.115, Math.sin(a) * hw * 0.39);
      arm.rotation.y = -a;
      g.add(arm);
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lowpoly("#15181C"));
      wheel.position.set(Math.cos(a) * hw * 0.78, 0.05, Math.sin(a) * hw * 0.78);
      g.add(wheel);
    }
    g.scale.z = t.halfD / t.halfW;
    const stoolModel = bake(g);
    g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    return stoolModel;
  }
  if (kitchen && t.slide) {
    // Küche, fahrend: Saugroboter. Oberseite (dort prallt der Gegenstand ab) liegt bei y der Physik,
    // darunter ein dunkler Sockel mit Stoßfänger-Ring – er rollt flach über den Boden.
    const hw = t.halfW;
    const top = t.y;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(hw, hw, 0.16, 28), lowpoly("#F3F5F8"));
    body.position.y = top - 0.08;
    g.add(body);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.94, hw * 0.94, top - 0.16 - 0.04, 28), lowpoly("#2B2F36"));
    base.position.y = 0.04 + (top - 0.2) / 2;
    g.add(base);
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(hw * 0.97, 0.035, 8, 28), lowpoly("#59616D"));
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = top - 0.2;
    g.add(bumper);
    // Obere Platte mit Knopf und Anzeige
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.62, hw * 0.62, 0.012, 28), lowpoly("#DDE2E8"));
    ring.position.y = top + 0.004;
    g.add(ring);
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), lowpoly("#3D82D9"));
    button.position.y = top + 0.012;
    g.add(button);
    for (const k of [-1, 0, 1]) {
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.014, 8), lowpoly(k === 0 ? "#2FA86E" : "#9AA3AC"));
      led.position.set(k * 0.07, top + 0.01, hw * 0.46);
      g.add(led);
    }
    // Zwei Seitenbürsten vorn
    for (const k of [-1, 1]) {
      const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), lowpoly("#E2483A"));
      brush.position.set(k * hw * 0.78, 0.045, hw * 0.74);
      g.add(brush);
    }
    g.scale.z = t.halfD / t.halfW;
    const robotModel = bake(g);
    g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    return robotModel;
  }
  if (kitchen) {
    // Küche: Topf mit Deckel statt Trampolin (Physik und Maße bleiben gleich)
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(t.halfW * 0.96, t.halfW * 0.86, t.y, 16),
      lowpoly("#4B5563"),
    );
    pot.position.y = t.y / 2;
    g.add(pot);
    for (const side of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), lowpoly("#2E2E32"));
      handle.position.set(side * (t.halfW * 0.96 + 0.07), t.y * 0.7, 0);
      g.add(handle);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(t.halfW, 0.045, 6, 20), lowpoly("#E3E8ED"));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = t.y;
    g.add(rim);
    g.scale.z = t.halfD / t.halfW;
    const bakedPot = bake(g);
    g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    return bakedPot;
  }
  const metal = lowpoly("#6B7280");
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, t.y, 6), metal);
    leg.position.set(Math.cos(a) * t.halfW * 0.92, t.y / 2, Math.sin(a) * t.halfW * 0.92);
    g.add(leg);
  }
  // Polster: abwechselnd blau und hellblau, gut zu sehen auf Rasen und Pflaster
  const parts = 12;
  const arc = (Math.PI * 2) / parts;
  for (let i = 0; i < parts; i++) {
    const pad = new THREE.Mesh(
      new THREE.TorusGeometry(t.halfW, 0.07, 6, 4, arc),
      lowpoly(i % 2 ? "#7CC8F8" : "#2F8FE0"),
    );
    pad.rotation.set(Math.PI / 2, 0, i * arc);
    pad.position.y = t.y;
    g.add(pad);
  }
  g.scale.z = t.halfD / t.halfW;
  const baked = bake(g);
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** So lange (s) federt das Tuch nach einem Aufprall nach. */
const BOUNCE = 0.45;

const Trampoline = memo(function Trampoline({
  tramp,
  bus,
  kitchen,
  office,
}: {
  tramp: TrampolineCollider;
  bus: BusRef;
  kitchen?: boolean;
  office?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.Mesh>(null);
  const model = useMemo(() => trampolineFrame(tramp, kitchen, office), [tramp, kitchen, office]);
  const matGeo = useMemo(() => new THREE.CylinderGeometry(tramp.halfW - 0.04, tramp.halfW - 0.04, 0.02, 20), [tramp]);
  useEffect(
    () => () => {
      model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      matGeo.dispose();
    },
    [model, matGeo],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const clock = bus.current.clock;
    g.position.x = trampolineX(tramp, clock);
    // Aufprall: Tuch taucht ein und schwingt aus
    const since = clock - (bus.current.ringPass[tramp.id] ?? -99);
    const k = since >= 0 && since < BOUNCE ? 1 - since / BOUNCE : 0;
    if (mat.current) mat.current.position.y = tramp.y - 0.03 - Math.sin(since * 30) * 0.09 * k;
  });
  return (
    <group ref={group} position={[tramp.x, 0, tramp.z]}>
      <primitive object={model} />
      {/* Servierwagen hat sein festes Tablett im Modell – kein rundes Tuch darüber */}
      {!((kitchen || office) && tramp.slide) && (
        <mesh
          ref={mat}
          geometry={matGeo}
          material={lowpoly(kitchen ? "#CDD5DD" : "#26324A")}
          position={[0, tramp.y - 0.03, 0]}
          scale={[1, 1, tramp.halfD / tramp.halfW]}
        />
      )}
    </group>
  );
});

/** Alle Hindernisse eines Levels. */
export const TrickProps = memo(function TrickProps({
  props,
  bus,
  calm,
  kitchen,
  office,
  yard,
}: {
  props: PropCollider[];
  /** Hof-Optik: Wind mit Wäscheleine und Laub. */
  yard?: boolean;
  bus: BusRef;
  calm: boolean;
  /** Büro-Optik: fahrendes Trampolin = Rollhocker, Wind ohne Vorhang. */
  office?: boolean;
  /** Küchen-Optik: Reifenschaukel = Küchenrolle, Trampolin = Topf mit Deckel, Torwand = Standregal. */
  kitchen?: boolean;
}) {
  return (
    <>
      {props.map((prop) =>
        prop.kind === "ring" ? (
          <Ring key={prop.id} ring={prop} bus={bus} kitchen={kitchen} office={office} />
        ) : prop.kind === "windmill" ? (
          <Windmill key={prop.id} mill={prop} bus={bus} />
        ) : prop.kind === "sign" && prop.look === "fence" ? (
          <Fence key={prop.id} fence={prop} />
        ) : prop.kind === "sign" ? (
          <Sign key={prop.id} sign={prop} bus={bus} />
        ) : prop.kind === "lamp" ? (
          <Lamp key={prop.id} lamp={prop} />
        ) : prop.kind === "trampoline" ? (
          <Trampoline key={prop.id} tramp={prop} bus={bus} kitchen={kitchen} office={office} />
        ) : prop.kind === "board" ? (
          <Board key={prop.id} board={prop} bus={bus} kitchen={kitchen} />
        ) : (
          <Fan key={prop.id} fan={prop} calm={calm} kitchen={kitchen} office={office} yard={yard} />
        ),
      )}
    </>
  );
});
