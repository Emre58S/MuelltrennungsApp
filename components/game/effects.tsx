// Datei: components/game/effects.tsx
// Konfetti-Explosion (ein Draw-Call pro Burst) und goldene Schockwelle.

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type FxRef } from "./fx";

export type Burst = {
  id: number;
  x: number;
  y: number;
  z: number;
  colors: string[];
  count: number;
  power: number;
  ring: boolean;
};

const LIFETIME = 1.3;

const ConfettiBurst = memo(function ConfettiBurst({
  burst,
  fx,
  onDone,
}: {
  burst: Burst;
  fx: FxRef;
  onDone: (id: number) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const age = useRef(0);
  const done = useRef(false);

  const parts = useMemo(
    () =>
      Array.from({ length: burst.count }, () => {
        const a = Math.random() * Math.PI * 2;
        const up = 2.2 + Math.random() * 2.2;
        const out = 0.6 + Math.random() * 1.6;
        return {
          p: new THREE.Vector3(burst.x, burst.y, burst.z),
          v: new THREE.Vector3(
            Math.cos(a) * out * burst.power,
            up * burst.power,
            Math.sin(a) * out * burst.power * 0.6 + 0.6,
          ),
          r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
          spin: 6 + Math.random() * 10,
          s: 0.06 + Math.random() * 0.06,
        };
      }),
    [burst],
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#FFD54A",
        transparent: true,
        opacity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => ringMat.dispose(), [ringMat]);

  // Vor dem ersten Frame: Farben setzen und alle Teile unsichtbar klein.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    parts.forEach((_, i) => {
      color.set(burst.colors[i % burst.colors.length]);
      mesh.setColorAt(i, color);
      mesh.setMatrixAt(i, zero);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [parts, burst.colors]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh || done.current) return;
    const delta = Math.min(rawDelta, 0.05) * fx.current.timeScale;
    age.current += delta;
    const life = age.current / LIFETIME;

    if (life >= 1) {
      done.current = true;
      onDone(burst.id);
      return;
    }

    const shrink = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
    parts.forEach((pt, i) => {
      pt.v.y -= 7.5 * delta;
      pt.v.multiplyScalar(1 - 1.2 * delta);
      pt.p.addScaledVector(pt.v, delta);
      if (pt.p.y < 0.03) {
        pt.p.y = 0.03;
        pt.v.set(pt.v.x * 0.3, 0, pt.v.z * 0.3);
      }
      pt.r.x += pt.spin * delta;
      pt.r.y += pt.spin * 0.7 * delta;
      q.setFromEuler(pt.r);
      sv.set(pt.s, pt.s * 0.6, pt.s * 0.15).multiplyScalar(shrink);
      m.compose(pt.p, q, sv);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;

    if (ringRef.current) {
      const k = Math.min(age.current / 0.45, 1);
      ringRef.current.scale.setScalar(0.3 + k * 2.4);
      ringMat.opacity = 1 - k;
      ringRef.current.visible = k < 1;
    }
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, burst.count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} emissiveIntensity={0.2} />
      </instancedMesh>
      {burst.ring && (
        <mesh
          ref={ringRef}
          position={[burst.x, burst.y + 0.05, burst.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={ringMat}
        >
          <ringGeometry args={[0.42, 0.5, 40]} />
        </mesh>
      )}
    </>
  );
});

export const Effects = memo(function Effects({
  bursts,
  fx,
  onDone,
}: {
  bursts: Burst[];
  fx: FxRef;
  onDone: (id: number) => void;
}) {
  return (
    <>
      {bursts.map((b) => (
        <ConfettiBurst key={b.id} burst={b} fx={fx} onDone={onDone} />
      ))}
    </>
  );
});
