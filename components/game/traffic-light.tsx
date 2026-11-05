// Datei: components/game/traffic-light.tsx
// Straßen-Szene (Trickwürfe): Fußgängerampel am Rand, im Takt der klappenden Deckel –
// Rot = Deckel zu (oder öffnet gerade), Gelb = Deckel klappt zu, Grün = Deckel offen. Rein Optik, folgt der Szenen-Uhr
// (bus.clock) und flapAngle aus der Physik.

import { useFrame } from "@react-three/fiber/native";
import { memo, useRef } from "react";
import type * as THREE from "three";

import { flapAngle, type LidFlap } from "@/game/physics";

import { lowpoly } from "./materials";
import { type BusRef } from "./scene-bus";

const POLE = "#59616D";
const HOUSING = "#2E3338";

export const TrafficLight = memo(function TrafficLight({
  flap,
  bus,
  x,
  z,
  scale = 1,
}: {
  flap: LidFlap;
  bus: BusRef;
  x: number;
  z: number;
  /** Größe (die Ampel steht weit hinten und soll trotzdem lesbar sein). */
  scale?: number;
}) {
  const red = useRef<THREE.Mesh>(null);
  const yellow = useRef<THREE.Mesh>(null);
  const green = useRef<THREE.Mesh>(null);
  useFrame(() => {
    // Grün: Deckel ist offen (> 1,2). Gelb: Deckel klappt gerade zu (Warnung). Rot: Deckel zu oder gerade erst am Öffnen.
    const clock = bus.current.clock;
    const a = flapAngle(flap, clock);
    const open = a > 1.2;
    const closing = !open && a > 0.05 && flapAngle(flap, clock + 0.05) < a;
    if (green.current) green.current.visible = open;
    if (yellow.current) yellow.current.visible = closing;
    if (red.current) red.current.visible = !open && !closing;
  });
  return (
    <group position={[x, -0.9 * scale, z]} scale={scale}>
      <mesh position={[0, 1.2, 0]} material={lowpoly(POLE)}>
        <cylinderGeometry args={[0.05, 0.06, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 2.75, 0]} material={lowpoly(HOUSING)}>
        <boxGeometry args={[0.36, 0.95, 0.24]} />
      </mesh>
      {/* Dunkle Linsen (immer sichtbar) und leuchtende Linse darüber */}
      {[
        { y: 3.0, off: "#4A1F1F", on: "#FF3B30", ref: red },
        { y: 2.75, off: "#4A3F1A", on: "#FFC83D", ref: yellow },
        { y: 2.5, off: "#1F3A26", on: "#35D26B", ref: green },
      ].map((l) => (
        <group key={l.y} position={[0, l.y, 0.125]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={lowpoly(l.off)}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 14]} />
          </mesh>
          <mesh ref={l.ref} position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 14]} />
            <meshBasicMaterial color={l.on} />
          </mesh>
        </group>
      ))}
    </group>
  );
});
