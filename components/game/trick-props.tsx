// Datei: components/game/trick-props.tsx
// Hindernisse der Trickwürfe, einmal gebaut und „gebacken“ (model-cache:
// bake → ein Zeichenaufruf pro Teil):
//  - Reifen: rot-weiß gestreift wie ein Zirkusreifen; durchflogen leuchtet
//    er golden auf
//  - Windrad: Mast + Nabe, die Flügel drehen sich
// Bewegung folgt der Szenen-Uhr (bus.clock) – genau wie die Physik
// (game/physics.ts → ringPose, windmillAngle).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  BLADE_THICK,
  type PropCollider,
  type RingCollider,
  ringPose,
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

/** Alle Hindernisse eines Levels. */
export const TrickProps = memo(function TrickProps({
  props,
  bus,
}: {
  props: PropCollider[];
  bus: BusRef;
}) {
  return (
    <>
      {props.map((prop) =>
        prop.kind === "ring" ? (
          <Ring key={prop.id} ring={prop} bus={bus} />
        ) : (
          <Windmill key={prop.id} mill={prop} bus={bus} />
        ),
      )}
    </>
  );
});
