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
//  - Trampolin: Garten-Trampolin mit blauem Polster; das Tuch federt beim
//    Aufprall sichtbar ein, ein fahrendes rollt auf der Szenen-Uhr mit
// Bewegung folgt der Szenen-Uhr (bus.clock) – genau wie die Physik
// (game/physics.ts → ringPose, windmillAngle).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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
  type TrampolineCollider,
  trampolineX,
  type WindmillCollider,
  windmillAngle,
} from "@/game/physics";

import { lowpoly } from "./materials";
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

const Ring = memo(function Ring({ ring, bus }: { ring: RingCollider; bus: BusRef }) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const model = useMemo(() => hoop(ring.radius, ring.tube), [ring.radius, ring.tube]);
  const glowGeo = useMemo(
    () => new THREE.TorusGeometry(ring.radius, ring.tube * 2.2, 8, 36),
    [ring.radius, ring.tube],
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

const Fan = memo(function Fan({ fan, calm }: { fan: FanCollider; calm: boolean }) {
  const dir = Math.sign(fan.force) || 1;
  const blades = useRef<THREE.Group>(null);
  const streaks = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => fanParts(fan), [fan]);
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
      for (const o of [parts.body, parts.blades]) o.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
    },
    [mat, parts],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
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
function trampolineFrame(t: TrampolineCollider): THREE.Object3D {
  const g = new THREE.Group();
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

const Trampoline = memo(function Trampoline({ tramp, bus }: { tramp: TrampolineCollider; bus: BusRef }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.Mesh>(null);
  const model = useMemo(() => trampolineFrame(tramp), [tramp]);
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
      <mesh
        ref={mat}
        geometry={matGeo}
        material={lowpoly("#26324A")}
        position={[0, tramp.y - 0.03, 0]}
        scale={[1, 1, tramp.halfD / tramp.halfW]}
      />
    </group>
  );
});

/** Alle Hindernisse eines Levels. */
export const TrickProps = memo(function TrickProps({
  props,
  bus,
  calm,
}: {
  props: PropCollider[];
  bus: BusRef;
  calm: boolean;
}) {
  return (
    <>
      {props.map((prop) =>
        prop.kind === "ring" ? (
          <Ring key={prop.id} ring={prop} bus={bus} />
        ) : prop.kind === "windmill" ? (
          <Windmill key={prop.id} mill={prop} bus={bus} />
        ) : prop.kind === "sign" && prop.look === "fence" ? (
          <Fence key={prop.id} fence={prop} />
        ) : prop.kind === "sign" ? (
          <Sign key={prop.id} sign={prop} bus={bus} />
        ) : prop.kind === "lamp" ? (
          <Lamp key={prop.id} lamp={prop} />
        ) : prop.kind === "trampoline" ? (
          <Trampoline key={prop.id} tramp={prop} bus={bus} />
        ) : (
          <Fan key={prop.id} fan={prop} calm={calm} />
        ),
      )}
    </>
  );
});
