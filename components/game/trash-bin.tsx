// Datei: components/game/trash-bin.tsx
// Die Tonne als „Charakter“: atmet leicht, hebt sich und öffnet den Deckel,
// wenn sie anvisiert wird, hüpft beim Treffer und schüttelt sich bei Fehlern.

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type BinDef } from "@/game/bins";

import { type FxRef } from "./fx";

export type BinEvent = { type: "hit" | "perfect" | "reject"; id: number };

const LID_OPEN = Math.PI * 0.62;
const LID_IDLE = 0.08;

export const TrashBin = memo(function TrashBin({
  bin,
  x,
  z,
  index,
  aimed,
  event,
  fx,
}: {
  bin: BinDef;
  x: number;
  z: number;
  index: number;
  aimed: boolean;
  event: BinEvent | null;
  fx: FxRef;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const anim = useRef({ hit: 0, reject: 0, lift: 0, lastId: -1 });

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: bin.color, roughness: 0.7 }),
      light: new THREE.MeshStandardMaterial({
        color: bin.colorLight,
        roughness: 0.6,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#11161C", roughness: 1 }),
      wheel: new THREE.MeshStandardMaterial({ color: "#1A1A1A", roughness: 1 }),
      plate: new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.5 }),
      pad: new THREE.MeshStandardMaterial({
        color: bin.colorLight,
        roughness: 0.9,
        transparent: true,
        opacity: 0.55,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
      beam: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    }),
    [bin],
  );

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useEffect(() => {
    if (!event || event.id === anim.current.lastId) return;
    anim.current.lastId = event.id;
    if (event.type === "reject") anim.current.reject = 1;
    else anim.current.hit = event.type === "perfect" ? 1.4 : 1;
  }, [event]);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const lid = lidRef.current;
    if (!root || !lid) return;

    const delta = Math.min(rawDelta, 0.05) * fx.current.timeScale;
    const t = state.clock.elapsedTime;
    const a = anim.current;

    a.lift = THREE.MathUtils.damp(a.lift, aimed ? 1 : 0, 14, delta);
    a.hit = Math.max(0, a.hit - delta * 2.6);
    a.reject = Math.max(0, a.reject - delta * 1.8);

    // Atmen + Anheben beim Zielen
    const breathe = fx.current.calm ? 0 : Math.sin(t * 1.8 + index * 1.3) * 0.012;
    root.position.y = breathe + a.lift * 0.14;

    // Treffer: Stauchen/Strecken (Squash & Stretch)
    const hitWave = a.hit > 0 ? Math.sin((1 - a.hit / 1.4) * Math.PI * 3) * a.hit : 0;
    const sy = 1 + a.lift * 0.05 - hitWave * 0.12;
    const sxz = 1 + a.lift * 0.05 + hitWave * 0.08;
    root.scale.set(sxz, sy, sxz);

    // Fehler: Kopfschütteln
    root.rotation.z = a.reject > 0 ? Math.sin(t * 38) * 0.09 * a.reject : 0;

    // Deckel: offen beim Zielen, klappert beim Treffer, zu beim Fehler
    let lidTarget = aimed ? LID_OPEN : LID_IDLE;
    if (a.hit > 0) lidTarget = LID_OPEN * (0.6 + Math.abs(Math.sin(t * 22)) * 0.4);
    if (a.reject > 0.3) lidTarget = 0;
    lid.rotation.x = THREE.MathUtils.damp(lid.rotation.x, lidTarget, 16, delta);

    // Leuchtring + Lichtkegel beim Zielen
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 7) * 0.05;
      ringRef.current.visible = a.lift > 0.02;
      ringRef.current.scale.setScalar((0.85 + a.lift * 0.25) * pulse);
      mats.ring.opacity = a.lift * 0.9;
    }
    if (beamRef.current) {
      beamRef.current.visible = a.lift > 0.02 || a.hit > 0;
      mats.beam.opacity = Math.max(a.lift * 0.18, a.hit * 0.35);
    }
    mats.body.emissive.set(bin.color);
    mats.body.emissiveIntensity = a.lift * 0.25 + a.hit * 0.5;
    mats.light.emissive.set(bin.colorLight);
    mats.light.emissiveIntensity = a.lift * 0.2 + a.hit * 0.45;
  });

  return (
    <group position={[x, 0, z]}>
      {/* Farbiger Stellplatz + Leuchtring (bewegen sich nicht mit) */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.pad}>
        <circleGeometry args={[0.72, 32]} />
      </mesh>
      <mesh
        ref={ringRef}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={mats.ring}
        visible={false}
      >
        <ringGeometry args={[0.66, 0.8, 40]} />
      </mesh>
      <mesh ref={beamRef} position={[0, 2.4, 0]} material={mats.beam} visible={false}>
        <cylinderGeometry args={[0.5, 0.62, 1.6, 24, 1, true]} />
      </mesh>

      <group ref={rootRef}>
        <group rotation={[0, Math.PI, 0]}>
          {/* Korpus */}
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow material={mats.body}>
            <boxGeometry args={[1.08, 1.5, 0.88]} />
          </mesh>
          <mesh position={[0, 0.78, -0.456]} material={mats.light}>
            <boxGeometry args={[0.91, 1.18, 0.028]} />
          </mesh>
          {/* Weißes Schild vorn – sofort als „Beschriftung“ lesbar */}
          <mesh position={[0, 1.05, -0.474]} material={mats.plate}>
            <boxGeometry args={[0.74, 0.3, 0.012]} />
          </mesh>
          <mesh position={[0, 1.05, -0.482]} material={mats.body}>
            <boxGeometry args={[0.6, 0.16, 0.012]} />
          </mesh>
          {[-0.29, 0.29].map((rx) => (
            <mesh key={rx} position={[rx, 0.5, -0.476]} material={mats.body}>
              <boxGeometry args={[0.02, 0.5, 0.018]} />
            </mesh>
          ))}

          {/* Oberkante + dunkle Öffnung */}
          <mesh position={[0, 1.53, 0]} castShadow material={mats.light}>
            <boxGeometry args={[1.12, 0.14, 0.94]} />
          </mesh>
          <mesh position={[0, 1.6, -0.02]} material={mats.dark}>
            <boxGeometry args={[0.96, 0.12, 0.72]} />
          </mesh>

          {/* Griffe */}
          {[-0.56, 0.56].map((gx) => (
            <mesh key={gx} position={[gx, 1.04, -0.08]} material={mats.light}>
              <boxGeometry args={[0.08, 0.5, 0.13]} />
            </mesh>
          ))}

          {/* Deckel – Pivot hinten */}
          <group ref={lidRef} position={[0, 1.66, 0.5]} rotation={[LID_IDLE, 0, 0]}>
            <mesh position={[0, 0.03, -0.44]} castShadow material={mats.light}>
              <boxGeometry args={[1.16, 0.12, 0.9]} />
            </mesh>
            <mesh position={[0, 0.1, -0.42]} material={mats.body}>
              <boxGeometry args={[1.0, 0.03, 0.68]} />
            </mesh>
            <mesh position={[0, 0.03, -0.9]} material={mats.light}>
              <boxGeometry args={[0.4, 0.08, 0.08]} />
            </mesh>
          </group>

          {/* Räder */}
          {[-0.43, 0.43].map((wx) => (
            <mesh
              key={wx}
              position={[wx, 0.13, 0.38]}
              rotation={[0, 0, Math.PI / 2]}
              material={mats.wheel}
            >
              <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
});
