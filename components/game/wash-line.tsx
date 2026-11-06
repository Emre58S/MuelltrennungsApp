// Datei: components/game/wash-line.tsx
// Hof-Szene (Trickwürfe): Wäscheleine an der Ziegelwand für den Wind-Parcours.

import { useFrame } from "@react-three/fiber/native";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { lowpoly } from "./materials";

/** Hof: Wäscheleine an der Ziegelwand – Laken, Hemd, Handtuch und Socken hängen an Klammern und blähen sich im Wind
 *  (der Wind kommt von der Seite, `dir` ist seine Richtung). Gleiche Bewegung wie der Küchenvorhang. */
const WASH_LINE_Y = 3.5;
const WASH_PIECES = [
  { x: -1.55, w: 0.8, h: 0.8, color: "#F3F6FA", phase: 0.0 },
  { x: -0.6, w: 0.5, h: 0.6, color: "#E2483A", phase: 1.3 },
  { x: 0.2, w: 0.4, h: 0.75, color: "#2FA8A0", phase: 2.4 },
  { x: 0.8, w: 0.2, h: 0.28, color: "#F2C94C", phase: 3.1 },
  { x: 1.15, w: 0.2, h: 0.28, color: "#3D82D9", phase: 3.9 },
  { x: 1.7, w: 0.65, h: 0.65, color: "#F6E7B8", phase: 0.8 },
];

function WashPiece({
  x,
  w,
  h,
  color,
  phase,
  dir,
  strength,
  calm,
}: {
  x: number;
  w: number;
  h: number;
  color: string;
  phase: number;
  dir: number;
  strength: number;
  calm: boolean;
}) {
  // Maße ändern sich nie (feste Wäschestücke) – nur einmal bauen, damit die Fläche im Frame verändert werden darf
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h, 4, 6), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo]);
  const cloth = useMemo(() => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), [color]);
  useEffect(
    () => () => {
      geo.dispose();
      cloth.dispose();
    },
    [geo, cloth],
  );
  useFrame((state) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = calm ? 0 : state.clock.elapsedTime + phase;
    const amp = (calm ? 0.12 : 0.2) + strength * 0.04;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const v = (h / 2 - by) / h; // 0 an der Leine bis 1 unten
      const gust = 0.55 + 0.45 * Math.sin(t * 1.7 + bx * 2.4);
      const flutter = Math.sin(t * 3.6 + bx * 5 + v * 4) * 0.05 * v;
      pos.setXYZ(i, bx + dir * amp * v * gust * (0.6 + v), by, 0.16 * v * Math.sin(t * 1.2 + bx * 3) + flutter);
    }
    // Geometrie wird bewusst jeden Frame verformt (wie beim Küchenvorhang)
    // eslint-disable-next-line react-hooks/immutability
    pos.needsUpdate = true;
  });
  return (
    <group position={[x, WASH_LINE_Y - 0.03, -2.1]}>
      <mesh geometry={geo} material={cloth} position={[0, -h / 2, 0]} />
    </group>
  );
}

export function WashLine({ dir, strength, calm }: { dir: number; strength: number; calm: boolean }) {
  const lineMat = useMemo(() => lowpoly("#8A8F96"), []);
  const hookMat = useMemo(() => lowpoly("#59616D"), []);
  return (
    <>
      {/* Leine zwischen zwei Wandhaken */}
      <mesh position={[0, WASH_LINE_Y, -2.12]} material={lineMat}>
        <boxGeometry args={[6.6, 0.018, 0.018]} />
      </mesh>
      <mesh position={[-3.3, WASH_LINE_Y, -2.12]} material={hookMat}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </mesh>
      <mesh position={[3.3, WASH_LINE_Y, -2.12]} material={hookMat}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </mesh>
      {WASH_PIECES.map((p) => (
        <WashPiece key={p.x} x={p.x} w={p.w} h={p.h} color={p.color} phase={p.phase} dir={dir} strength={strength} calm={calm} />
      ))}
    </>
  );
}

