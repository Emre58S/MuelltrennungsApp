// Datei: components/game/effects.tsx
// Konfetti-Explosion (ein Draw-Call pro Burst) und goldene Schockwelle.
// Je Material fliegen die Teile anders (ROADMAP R6b): Bio spritzt flach,
// Glas splittert in schnelle Scherben, Papier flattert langsam herab.
//
// Fester Pool: alle Konfetti-Plätze sind von Anfang an aufgebaut und teilen
// Geometrie + Material. Ein neuer Treffer belegt nur einen freien Platz –
// kein neues Mesh, kein React-Render (auch bei vielen Treffern hintereinander).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type FxRef } from "./fx";
import { type BusRef, takeBursts } from "./scene-bus";

export type Burst = {
  id: number;
  x: number;
  y: number;
  z: number;
  colors: string[];
  count: number;
  power: number;
  ring: boolean;
  /** Flugart der Teile (fehlt = Konfetti). */
  style?: BurstStyle;
};

export type BurstStyle = "confetti" | "splash" | "shards" | "flutter";

const LIFETIME = 1.3;
const SLOTS = 6;
const MAX_PARTS = 32;
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const RING_GEO = new THREE.RingGeometry(0.42, 0.5, 40);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

type Part = {
  p: THREE.Vector3;
  v: THREE.Vector3;
  r: THREE.Euler;
  spin: number;
  s: number;
};

type Slot = {
  active: boolean;
  age: number;
  started: number;
  count: number;
  ring: boolean;
  style: BurstStyle;
  parts: Part[];
};

function createSlot(): Slot {
  return {
    active: false,
    age: 0,
    started: 0,
    count: 0,
    ring: false,
    style: "confetti",
    parts: Array.from({ length: MAX_PARTS }, () => ({
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      r: new THREE.Euler(),
      spin: 0,
      s: 0,
    })),
  };
}

export const BurstLayer = memo(function BurstLayer({
  bus,
  fx,
}: {
  bus: BusRef;
  fx: FxRef;
}) {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const slots = useMemo(() => Array.from({ length: SLOTS }, createSlot), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
  const ringMats = useMemo(
    () =>
      Array.from(
        { length: SLOTS },
        () =>
          new THREE.MeshBasicMaterial({
            color: "#FFD54A",
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );
  const color = useMemo(() => new THREE.Color(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      material.dispose();
      ringMats.forEach((mat) => mat.dispose());
    },
    [material, ringMats],
  );

  // Farb-Puffer anlegen und alle Teile unsichtbar machen
  useLayoutEffect(() => {
    color.set("#FFFFFF");
    meshes.current.forEach((mesh) => {
      if (!mesh) return;
      for (let i = 0; i < MAX_PARTS; i++) {
        mesh.setColorAt(i, color);
        mesh.setMatrixAt(i, ZERO);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    // Ringe bleiben sichtbar (Größe 0) – so wird ihr Shader gleich zu Beginn
    // kompiliert und nicht erst beim ersten Perfekt-Wurf.
    rings.current.forEach((ring) => ring?.scale.setScalar(0));
  }, [color]);

  useFrame((state, rawDelta) => {
    const now = state.clock.elapsedTime;

    for (const burst of takeBursts(bus.current)) {
      let i = slots.findIndex((s) => !s.active);
      if (i === -1) {
        i = 0;
        slots.forEach((s, k) => {
          if (s.started < slots[i].started) i = k;
        });
      }
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const s = slots[i];
      s.active = true;
      s.age = 0;
      s.started = now;
      s.count = Math.min(burst.count, MAX_PARTS);
      s.ring = burst.ring;
      const style = (s.style = burst.style ?? "confetti");
      for (let k = 0; k < s.count; k++) {
        const pt = s.parts[k];
        const a = Math.random() * Math.PI * 2;
        // Spritzer flach und breit, Scherben schnell, Papier sanft
        const up =
          style === "splash"
            ? 1.2 + Math.random() * 1.2
            : style === "shards"
              ? 2.8 + Math.random() * 2.4
              : style === "flutter"
                ? 1.6 + Math.random() * 1.4
                : 2.2 + Math.random() * 2.2;
        const out =
          style === "splash"
            ? 1.2 + Math.random() * 1.6
            : style === "shards"
              ? 1 + Math.random() * 1.8
              : style === "flutter"
                ? 0.5 + Math.random()
                : 0.6 + Math.random() * 1.6;
        pt.p.set(burst.x, burst.y, burst.z);
        pt.v.set(
          Math.cos(a) * out * burst.power,
          up * burst.power,
          Math.sin(a) * out * burst.power * 0.6 + 0.6,
        );
        // Spritzer liegen flach (kein Taumeln), alles andere startet verdreht
        if (style === "splash") pt.r.set(0, Math.random() * 6, 0);
        else pt.r.set(Math.random() * 6, Math.random() * 6, 0);
        pt.spin =
          style === "shards"
            ? 14 + Math.random() * 12
            : style === "splash"
              ? Math.random() * 2
              : style === "flutter"
                ? 2 + Math.random() * 3
                : 6 + Math.random() * 10;
        pt.s = (style === "flutter" ? 0.08 : 0.06) + Math.random() * 0.06;
        color.set(burst.colors[k % burst.colors.length]);
        mesh.setColorAt(k, color);
      }
      for (let k = s.count; k < MAX_PARTS; k++) mesh.setMatrixAt(k, ZERO);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      const ring = rings.current[i];
      if (ring) {
        ring.position.set(burst.x, burst.y + 0.05, burst.z);
        ring.scale.setScalar(burst.ring ? 0.3 : 0);
        ringMats[i].opacity = burst.ring ? 1 : 0;
      }
    }

    const delta = Math.min(rawDelta, 0.05) * fx.current.timeScale;

    for (let i = 0; i < SLOTS; i++) {
      const s = slots[i];
      const mesh = meshes.current[i];
      if (!s.active || !mesh) continue;
      s.age += delta;
      const life = s.age / LIFETIME;

      if (life >= 1) {
        s.active = false;
        for (let k = 0; k < s.count; k++) mesh.setMatrixAt(k, ZERO);
        mesh.instanceMatrix.needsUpdate = true;
        rings.current[i]?.scale.setScalar(0);
        continue;
      }

      const shrink = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      const style = s.style;
      // Papier: wenig Schwerkraft, viel Luftwiderstand; Spritzer fallen schwer
      const gravity = style === "flutter" ? 3 : style === "splash" ? 9.5 : style === "shards" ? 8 : 7.5;
      const drag = style === "flutter" ? 3 : 1.2;
      for (let k = 0; k < s.count; k++) {
        const pt = s.parts[k];
        pt.v.y -= gravity * delta;
        pt.v.multiplyScalar(1 - drag * delta);
        // Schnipsel pendeln seitlich (Phase je Teil aus seinem Dreh-Tempo)
        if (style === "flutter") pt.v.x += Math.sin(s.age * 6 + pt.spin * 3) * 2.5 * delta;
        pt.p.addScaledVector(pt.v, delta);
        if (pt.p.y < 0.03) {
          pt.p.y = 0.03;
          pt.v.set(pt.v.x * 0.3, 0, pt.v.z * 0.3);
        }
        pt.r.x += pt.spin * delta;
        pt.r.y += pt.spin * 0.7 * delta;
        q.setFromEuler(pt.r);
        // Form: Tropfen-Scheibe, schmale Scherbe, dünnes Blatt oder Konfetti
        if (style === "splash") sv.set(pt.s, pt.s * 0.35, pt.s);
        else if (style === "shards") sv.set(pt.s * 0.5, pt.s * 1.4, pt.s * 0.2);
        else if (style === "flutter") sv.set(pt.s, pt.s * 0.75, pt.s * 0.05);
        else sv.set(pt.s, pt.s * 0.6, pt.s * 0.15);
        sv.multiplyScalar(shrink);
        m.compose(pt.p, q, sv);
        mesh.setMatrixAt(k, m);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const ring = rings.current[i];
      if (ring && s.ring) {
        const k = Math.min(s.age / 0.45, 1);
        ring.scale.setScalar(0.3 + k * 2.4);
        ringMats[i].opacity = 1 - k;
        if (k >= 1) ring.scale.setScalar(0);
      }
    }
  });

  return (
    <>
      {ringMats.map((mat, i) => (
        <group key={i}>
          <instancedMesh
            ref={(mesh) => {
              meshes.current[i] = mesh;
            }}
            args={[BOX_GEO, material, MAX_PARTS]}
            frustumCulled={false}
          />
          <mesh
            ref={(ring) => {
              rings.current[i] = ring;
            }}
            geometry={RING_GEO}
            material={mat}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </>
  );
});
