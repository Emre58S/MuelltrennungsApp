// Datei: components/game/trick-props.tsx
// Reifen der Trickwürfe: rot-weiß gestreift wie ein Zirkusreifen, einmal
// gebaut und „gebacken“ (model-cache: bake → ein Zeichenaufruf pro Reifen).
// Bewegte Reifen folgen der Szenen-Uhr (bus.clock) – genau wie die Physik
// (game/physics.ts → ringPose). Durchflogen: der Reifen leuchtet golden auf.

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type PropCollider, ringPose } from "@/game/physics";

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

const Ring = memo(function Ring({ ring, bus }: { ring: PropCollider; bus: BusRef }) {
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

/** Alle Reifen eines Levels. */
export const TrickProps = memo(function TrickProps({
  rings,
  bus,
}: {
  rings: PropCollider[];
  bus: BusRef;
}) {
  return (
    <>
      {rings.map((ring) => (
        <Ring key={ring.id} ring={ring} bus={bus} />
      ))}
    </>
  );
});
