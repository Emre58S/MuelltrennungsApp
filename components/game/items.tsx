// Datei: components/game/items.tsx
// Vorschau-Item (schwebt, holt beim Zielen Schwung), gepunktete Flugbahn
// und das geworfene Item (Flug mit Leuchtspur → Einsinken oder Abprallen).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";

import { easeOutBack, flightPoint, type FxRef, setLook, slowMotion } from "./fx";
import { TrashObject3D } from "./models";

export function arcFor(start: THREE.Vector3, end: THREE.Vector3) {
  return 0.9 + start.distanceTo(end) * 0.12;
}

/* ── Vorschau ──────────────────────────────────────────────── */

export const PreviewItem = memo(function PreviewItem({
  item,
  position,
  scale,
  aimTarget,
  fx,
}: {
  item: Item;
  position: THREE.Vector3;
  scale: number;
  aimTarget: THREE.Vector3 | null;
  fx: FxRef;
}) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(0);
  const aim = useRef(0);
  const lean = useRef(0);

  useFrame((state, rawDelta) => {
    const g = ref.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);
    age.current += delta;
    const t = state.clock.elapsedTime;

    aim.current = THREE.MathUtils.damp(aim.current, aimTarget ? 1 : 0, 12, delta);
    const dirX = aimTarget ? THREE.MathUtils.clamp((aimTarget.x - position.x) / 2, -1, 1) : 0;
    lean.current = THREE.MathUtils.damp(lean.current, dirX, 10, delta);

    // Auftauchen mit Überschwinger
    const pop = fx.current.calm ? 1 : easeOutBack(Math.min(age.current / 0.35, 1));
    // Schwung holen: beim Zielen etwas zurück/runter und kleiner
    const windUp = aim.current;
    g.scale.setScalar(scale * pop * (1 - windUp * 0.06));
    g.position.set(
      position.x - lean.current * 0.08,
      position.y + (fx.current.calm ? 0 : Math.sin(t * 2.2) * 0.04) - windUp * 0.1,
      position.z + windUp * 0.12,
    );
    g.rotation.set(
      0.15 - windUp * 0.25,
      fx.current.calm ? -0.3 : -0.3 + Math.sin(t * 0.9) * 0.35,
      -lean.current * 0.35,
    );
    setLook(fx.current, g.position);
  });

 return (
  <group
    ref={ref}
    position={[position.x, position.y, position.z]}
    scale={0.001}
  >
    <TrashObject3D item={item} />
  </group>
);
});

/* ── Flugbahn-Vorschau ─────────────────────────────────────── */

const DOTS = 14;

export const AimGuide = memo(function AimGuide({
  start,
  target,
  color,
}: {
  start: THREE.Vector3;
  target: THREE.Vector3 | null;
  color: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = !!target;
    if (!target) return;
    mat.color.set(color);
    phase.current = (phase.current + delta * 1.6) % 1;
    const arc = arcFor(start, target);

    for (let i = 0; i < DOTS; i++) {
      const t = Math.min((i + phase.current) / DOTS, 1) * 0.94;
      flightPoint(tmp, start, target, t, arc);
      const size = 0.075 - t * 0.035;
      s.setScalar(size);
      m.compose(tmp, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, DOTS]}
      material={mat}
      frustumCulled={false}
      visible={false}
    >
      <sphereGeometry args={[1, 10, 8]} />
    </instancedMesh>
  );
});

/* ── Geworfenes Item ───────────────────────────────────────── */

// Knackiger Flug: kurz genug für flüssiges Spiel, lang genug zum Mitverfolgen
const FLIGHT_TIME = 0.42;
const TRAIL = 10;

type Phase = "flight" | "sink" | "bounce" | "fade";

export function ThrownItem({
  item,
  start,
  startScale,
  target,
  endScale,
  hit,
  perfect,
  glow,
  fx,
  onLand,
  onDone,
}: {
  item: Item;
  start: THREE.Vector3;
  startScale: number;
  target: THREE.Vector3;
  endScale: number;
  hit: boolean;
  perfect: boolean;
  /** Goldene Spur (Perfekt oder Fieber). */
  glow: boolean;
  fx: FxRef;
  onLand: () => void;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const st = useRef({
    phase: "flight" as Phase,
    t: 0,
    p: 0,
    landed: false,
    done: false,
    slowed: false,
    vel: new THREE.Vector3(),
    trail: Array.from({ length: TRAIL }, () => start.clone()),
    head: 0,
  });
  const arc = useMemo(() => arcFor(start, target), [start, target]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);
  const trailMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: glow ? "#FFD54A" : "#FFFFFF",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [glow],
  );
  useEffect(() => () => trailMat.dispose(), [trailMat]);

  useLayoutEffect(() => {
    const mesh = trailRef.current;
    if (!mesh) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < TRAIL; i++) mesh.setMatrixAt(i, zero);
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, rawDelta) => {
    const g = ref.current;
    const s = st.current;
    if (!g || s.done) return;
    const delta = Math.min(rawDelta, 0.05) * fx.current.timeScale;

    if (s.phase === "flight") {
      s.t = Math.min(s.t + delta / FLIGHT_TIME, 1);
      flightPoint(tmp, start, target, s.t, arc);
      g.position.copy(tmp);
      setLook(fx.current, tmp);
      g.scale.setScalar(THREE.MathUtils.lerp(startScale, endScale, Math.min(s.t * 1.4, 1)));
      g.rotation.x += delta * 9;
      g.rotation.y += delta * 6;

      if (perfect && !s.slowed && s.t > 0.72) {
        s.slowed = true;
        slowMotion(fx.current, 420);
      }

      if (s.t >= 1) {
        if (!s.landed) {
          s.landed = true;
          onLand();
        }
        s.p = 0;
        if (hit) {
          s.phase = "sink";
        } else {
          s.phase = "bounce";
          // Abprallen Richtung Kamera
          s.vel.set((Math.random() - 0.5) * 1.2, 3.2, 2.6);
        }
      }
    } else if (s.phase === "sink") {
      s.p = Math.min(s.p + delta / 0.22, 1);
      g.position.set(target.x, target.y - s.p * 0.6, target.z);
      g.scale.setScalar(endScale * (1 - s.p * 0.85));
      g.rotation.y += delta * 4;
      if (s.p >= 1) s.phase = "fade";
    } else if (s.phase === "bounce") {
      s.vel.y -= 9.5 * delta;
      g.position.addScaledVector(s.vel, delta);
      g.rotation.x -= delta * 10;
      g.rotation.z += delta * 7;
      if (g.position.y <= 0.18 && s.vel.y < 0) {
        g.position.y = 0.18;
        if (Math.abs(s.vel.y) > 1.2) {
          s.vel.y *= -0.35;
          s.vel.x *= 0.6;
          s.vel.z *= 0.6;
        } else {
          s.phase = "fade";
          s.p = 0;
        }
      }
    } else {
      s.p = Math.min(s.p + delta / (hit ? 0.05 : 0.45), 1);
      if (!hit) g.scale.setScalar(endScale * (1 - s.p));
      if (s.p >= 1) {
        s.done = true;
        g.visible = false;
        onDone();
      }
    }

    // Leuchtspur
    const mesh = trailRef.current;
    if (mesh) {
      s.trail[s.head].copy(g.position);
      s.head = (s.head + 1) % TRAIL;
      const show = s.phase === "flight";
      for (let i = 0; i < TRAIL; i++) {
        const idx = (s.head + i) % TRAIL;
        const k = i / TRAIL;
        sv.setScalar(show ? 0.03 + k * (glow ? 0.09 : 0.06) : 0);
        m.compose(s.trail[idx], q, sv);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
  <>
    <instancedMesh
      ref={trailRef}
      args={[undefined, undefined, TRAIL]}
      material={trailMat}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 6]} />
    </instancedMesh>

    <group
      ref={ref}
      position={[start.x, start.y, start.z]}
      scale={startScale}
    >
      <TrashObject3D item={item} />
    </group>
  </>
);
}
