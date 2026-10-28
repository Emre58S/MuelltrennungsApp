// Datei: components/game/trick-props.tsx
// Hindernisse der Trickwürfe, einmal gebaut und „gebacken“ (model-cache:
// bake → ein Zeichenaufruf pro Teil):
//  - Reifen: rot-weiß gestreift wie ein Zirkusreifen; durchflogen leuchtet
//    er golden auf
//  - Windrad: Mast + Nabe, die Flügel drehen sich
//  - Ventilator: Gerät am Rand des Windfelds, Windstreifen zeigen Richtung
//    und Stärke
//  - Straßenschild: blaues Einbahnstraßen-Schild auf einem Pfosten zwischen
//    zwei Tonnen; der Pfeil zeigt, wohin der Abpraller geht
// Bewegung folgt der Szenen-Uhr (bus.clock) – genau wie die Physik
// (game/physics.ts → ringPose, windmillAngle).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  BLADE_THICK,
  type FanCollider,
  type PropCollider,
  type RingCollider,
  ringPose,
  SIGN_THICK,
  type SignCollider,
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
        ) : prop.kind === "sign" ? (
          <Sign key={prop.id} sign={prop} bus={bus} />
        ) : (
          <Fan key={prop.id} fan={prop} calm={calm} />
        ),
      )}
    </>
  );
});
