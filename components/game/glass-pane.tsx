// Datei: components/game/glass-pane.tsx
// Straßen-Szene (Trickwürfe): die Glasscheibe in der Öffnung des hängenden Rahmens. Rein Optik – die Physik ist
// derselbe Durchwurf-Ring. Fliegt der Gegenstand hindurch (bus.ringPass), zerspringt die Scheibe in Scherben, die
// herabfallen; kurz darauf hängt eine neue Scheibe im Rahmen. Zeitgeber: Szenen-Uhr (bus.clock).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type BusRef } from "./scene-bus";

const SHARDS = 14;
/** So lange (s) fallen die Scherben. */
const FALL = 0.9;
/** Nach so vielen Sekunden hängt eine neue Scheibe im Rahmen. */
const RESTORE = 1.7;

export const GlassPane = memo(function GlassPane({
  radius,
  ringId,
  bus,
}: {
  radius: number;
  ringId: number;
  bus: BusRef;
}) {
  const pane = useRef<THREE.Group>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const paneGeo = useMemo(() => new THREE.CircleGeometry(radius * 0.97, 28), [radius]);
  const paneMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#CFEAFB", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const glintGeo = useMemo(() => new THREE.PlaneGeometry(radius * 0.12, radius * 0.9), [radius]);
  const glintGeo2 = useMemo(() => new THREE.PlaneGeometry(radius * 0.06, radius * 0.55), [radius]);
  const glintMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.75, depthWrite: false }), []);
  const shardGeo = useMemo(() => new THREE.BoxGeometry(0.16, 0.12, 0.012), []);
  const shardMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#E2F4FF", transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    [],
  );
  // Feste Startlage und Flugrichtung jeder Scherbe (gleichmäßig verteilt, damit es ruhig und nachvollziehbar wirkt)
  const seeds = useMemo(
    () =>
      Array.from({ length: SHARDS }, (_, i) => {
        const a = (i / SHARDS) * Math.PI * 2 + (i % 3) * 0.4;
        const r = radius * (0.25 + ((i * 0.37) % 0.65));
        return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(a) * 0.7, vy: Math.sin(a) * 0.5 + 0.5, vz: (i % 2 ? 1 : -1) * (0.5 + ((i * 0.23) % 0.6)), spin: 3 + (i % 5) };
      }),
    [radius],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useEffect(
    () => () => {
      paneGeo.dispose();
      paneMat.dispose();
      shardGeo.dispose();
      glintGeo.dispose();
      glintGeo2.dispose();
      glintMat.dispose();
      shardMat.dispose();
    },
    [paneGeo, paneMat, shardGeo, shardMat, glintGeo, glintGeo2, glintMat],
  );

  useFrame(() => {
    const since = bus.current.clock - (bus.current.ringPass[ringId] ?? -99);
    const broken = since >= 0 && since < RESTORE;
    if (pane.current) pane.current.visible = !broken;
    const sm = shards.current;
    if (!sm) return;
    sm.visible = since >= 0 && since < FALL;
    if (!sm.visible) return;
    for (let i = 0; i < SHARDS; i++) {
      const s = seeds[i];
      pos.set(s.x + s.vx * since, s.y + s.vy * since - 4.2 * since * since * 0.5, s.vz * since);
      euler.set(since * s.spin, since * s.spin * 0.7, i);
      quat.setFromEuler(euler);
      const k = Math.max(1 - since / FALL, 0.001);
      scl.set(k, k, k);
      m.compose(pos, quat, scl);
      sm.setMatrixAt(i, m);
    }
    sm.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <group ref={pane}>
        <mesh geometry={paneGeo} material={paneMat} />
        {/* Zwei helle Glanzstreifen, damit es als Glas liest */}
        <mesh position={[-radius * 0.28, radius * 0.18, 0.004]} rotation={[0, 0, 0.7]} geometry={glintGeo} material={glintMat} />
        <mesh position={[radius * 0.05, -radius * 0.02, 0.004]} rotation={[0, 0, 0.7]} geometry={glintGeo2} material={glintMat} />
      </group>
      <instancedMesh ref={shards} args={[shardGeo, shardMat, SHARDS]} frustumCulled={false} visible={false} />
    </>
  );
});
