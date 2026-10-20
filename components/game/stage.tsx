// Datei: components/game/stage.tsx — wechselnde Low-Poly-Kulissen
//
// Drei Szenen, pro Runde wechselnd: Hauswand · Ziegelwand · Garten.
// Gestaltungsregel für Übersicht: Hinter den Tonnen (Mitte) nur ruhige
// Flächen – Details (Fenster, Bäume, Rohre) stehen an den Seiten.
// Stil: flach schattierte Facetten + Pastellpalette (Townscaper/Islanders).
// Dunkel-Modus = Abenddämmerung mit warm leuchtenden Fenstern.
// Tageszeit: auch im hellen Modus abends (19–6 Uhr) Dämmerung.
// Wetter: manchmal leichter Regen mit bedecktem Himmel (ein Draw-Call).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { type ColorScheme } from "@/constants/theme";

import { lowpoly } from "./materials";

export type SceneKind = "haus" | "ziegel" | "garten";
const ORDER: SceneKind[] = ["haus", "ziegel", "garten"];
let counter = 0;
/** Jede neue Runde zeigt die nächste Szene. */
export function nextScene(): SceneKind {
  return ORDER[counter++ % ORDER.length];
}

type Palette = {
  skyTop: string;
  skyHorizon: string;
  ground: string;
  groundLine: string;
  grass: string;
  plaster: string;
  plinth: string;
  roof: string;
  frame: string;
  glass: string;
  glassGlow: string | null;
  bricks: string[];
  mortar: string;
  fence: string;
  trunk: string;
  leaves: string[];
  flowers: string[];
  metal: string;
  cloud: string;
  sun: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
};

const LIGHT: Palette = {
  skyTop: "#8ECAE8",
  skyHorizon: "#F7E6D4",
  ground: "#E8E0D2",
  groundLine: "#D8CDBB",
  grass: "#A3D27F",
  plaster: "#F1D6B4",
  plinth: "#D9BC98",
  roof: "#C7684C",
  frame: "#FBF7F0",
  glass: "#9DD0E8",
  glassGlow: null,
  bricks: ["#C9735B", "#B8644E", "#D3836B"],
  mortar: "#E6D7C3",
  fence: "#F5F0E6",
  trunk: "#8C5E3C",
  leaves: ["#6DBB5C", "#5AA84F", "#7FC96A"],
  flowers: ["#F27C8A", "#F6C453", "#B58BE0"],
  metal: "#9AA3AC",
  cloud: "#FFFFFF",
  sun: 1.55,
  hemiSky: "#FFFFFF",
  hemiGround: "#D9C7AC",
  hemi: 1.0,
};

const DUSK: Palette = {
  skyTop: "#2C3868",
  skyHorizon: "#EFA286",
  ground: "#8F8A92",
  groundLine: "#7D7881",
  grass: "#4F7A58",
  plaster: "#9C8578",
  plinth: "#7F6B62",
  roof: "#7E4A3E",
  frame: "#C9C2BA",
  glass: "#FFD58A",
  glassGlow: "#FFB347",
  bricks: ["#8B5248", "#7C483F", "#955D51"],
  mortar: "#9A8C82",
  fence: "#B8B2AA",
  trunk: "#5A3E2C",
  leaves: ["#3E7350", "#356646", "#4A8159"],
  flowers: ["#C66A79", "#C9A24A", "#8F72B5"],
  metal: "#6E767E",
  cloud: "#8D86A8",
  sun: 0.7,
  hemiSky: "#B8A6FF",
  hemiGround: "#4A4040",
  hemi: 0.8,
};

/** Bedeckter Himmel bei Regen (überschreibt nur Himmel und Licht). */
function overcast(p: Palette): Palette {
  const dusk = p === DUSK;
  return {
    ...p,
    skyTop: dusk ? "#3A4258" : "#97A6B5",
    skyHorizon: dusk ? "#8E8A99" : "#D9DEE3",
    cloud: dusk ? "#6F7184" : "#E4E8EC",
    sun: p.sun * 0.7,
    hemi: p.hemi * 0.95,
  };
}

export type Weather = "clear" | "rain";
const RAIN_CHANCE = 0.22;

function isEvening(date = new Date()) {
  const h = date.getHours();
  return h >= 19 || h < 6;
}

const FEVER = new THREE.Color("#FFB070");
const WALL_Z = -2.5;

function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Himmel ────────────────────────────────────────────────── */

function SkyDome({ top, horizon, fever }: { top: string; horizon: string; fever: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(40, 20, 12);
    const pos = g.attributes.position;
    const cTop = new THREE.Color(top);
    const cHor = new THREE.Color(horizon);
    const c = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp(pos.getY(i) / 40, 0, 1);
      c.copy(cHor).lerp(cTop, Math.pow(k, 0.55));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [top, horizon]);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const glow = useRef(0);
  useFrame((state, delta) => {
    glow.current = THREE.MathUtils.damp(glow.current, fever ? 1 : 0, 3, delta);
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    material.color.setRGB(1, 1, 1).lerp(FEVER, glow.current * (0.35 + pulse * 0.15));
  });
  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

const Clouds = memo(function Clouds({ color, calm }: { color: string; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const mat = lowpoly(color);
  useFrame((_, delta) => {
    if (!ref.current || calm) return;
    ref.current.children.forEach((c, i) => {
      c.position.x += delta * (0.12 + i * 0.05);
      if (c.position.x > 13) c.position.x = -13;
    });
  });
  return (
    <group ref={ref}>
      {[
        { x: -5, y: 7, z: -15, s: 1.4 },
        { x: 3, y: 8.2, z: -17, s: 1.8 },
        { x: 8, y: 6.4, z: -14, s: 1.1 },
      ].map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[
            [0, 0, 0, 0.9],
            [0.9, -0.15, 0, 0.62],
            [-0.85, -0.2, 0, 0.58],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[1, 0.62, 0.6]} material={mat}>
              <icosahedronGeometry args={[r, 0]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
});

/* ── Bausteine ─────────────────────────────────────────────── */

function Tree({ x, z, s = 1, p }: { x: number; z: number; s?: number; p: Palette }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.7, 0]} material={lowpoly(p.trunk)} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.4, 5]} />
      </mesh>
      {[
        [0, 1.95, 0, 0.85, 0],
        [0.45, 1.6, 0.2, 0.6, 1],
        [-0.42, 1.65, -0.1, 0.62, 2],
      ].map(([px, py, pz, r, c], i) => (
        <mesh key={i} position={[px, py, pz]} material={lowpoly(p.leaves[c])} castShadow>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function Bush({ x, z, s = 1, p }: { x: number; z: number; s?: number; p: Palette }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      {[
        [0, 0.32, 0, 0.42, 0],
        [0.38, 0.24, 0.05, 0.3, 1],
        [-0.35, 0.25, 0, 0.32, 2],
      ].map(([px, py, pz, r, c], i) => (
        <mesh key={i} position={[px, py, pz]} material={lowpoly(p.leaves[c])} castShadow>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function Flowers({ x, z, p, count = 5 }: { x: number; z: number; p: Palette; count?: number }) {
  const items = useMemo(() => {
    const rand = seeded(Math.round(x * 100 + z * 10 + count));
    return Array.from({ length: count }, (_, i) => ({
      dx: (rand() - 0.5) * 0.9,
      dz: (rand() - 0.5) * 0.4,
      h: 0.18 + rand() * 0.12,
      c: p.flowers[i % p.flowers.length],
    }));
  }, [x, z, count, p.flowers]);
  return (
    <group position={[x, 0, z]}>
      {items.map((f, i) => (
        <group key={i} position={[f.dx, 0, f.dz]}>
          <mesh position={[0, f.h / 2, 0]} material={lowpoly(p.leaves[1])}>
            <cylinderGeometry args={[0.012, 0.012, f.h, 3]} />
          </mesh>
          <mesh position={[0, f.h, 0]} material={lowpoly(f.c)}>
            <icosahedronGeometry args={[0.06, 0]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Window({ x, y, p }: { x: number; y: number; p: Palette }) {
  const glass = p.glassGlow ? lowpoly(p.glass, { emissive: p.glassGlow }) : lowpoly(p.glass);
  return (
    <group position={[x, y, WALL_Z + 0.16]}>
      <mesh material={lowpoly(p.frame)}>
        <boxGeometry args={[0.95, 1.15, 0.06]} />
      </mesh>
      <mesh position={[0, 0, 0.035]} material={glass}>
        <boxGeometry args={[0.8, 1.0, 0.02]} />
      </mesh>
      <mesh position={[0, 0, 0.05]} material={lowpoly(p.frame)}>
        <boxGeometry args={[0.05, 1.0, 0.02]} />
      </mesh>
      {/* Blumenkasten */}
      <mesh position={[0, -0.66, 0.12]} material={lowpoly(p.roof)}>
        <boxGeometry args={[0.9, 0.16, 0.22]} />
      </mesh>
      <group position={[0, -0.58, 0]}>
        <Flowers x={0} z={0.12} p={p} count={6} />
      </group>
    </group>
  );
}

function Drainpipe({ x, p }: { x: number; p: Palette }) {
  return (
    <group position={[x, 0, WALL_Z + 0.22]}>
      <mesh position={[0, 1.75, 0]} material={lowpoly(p.metal)}>
        <cylinderGeometry args={[0.07, 0.07, 3.5, 6]} />
      </mesh>
      <mesh position={[0, 0.08, 0.12]} rotation={[Math.PI / 2.6, 0, 0]} material={lowpoly(p.metal)}>
        <cylinderGeometry args={[0.07, 0.09, 0.3, 6]} />
      </mesh>
    </group>
  );
}

function WallLamp({ x, y, p }: { x: number; y: number; p: Palette }) {
  return (
    <group position={[x, y, WALL_Z + 0.2]}>
      <mesh material={lowpoly(p.metal)}>
        <boxGeometry args={[0.08, 0.08, 0.3]} />
      </mesh>
      <mesh position={[0, -0.08, 0.17]}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color={p.glassGlow ? "#FFE1A0" : "#FFF6DD"} />
      </mesh>
      {p.glassGlow && <pointLight position={[0, -0.1, 0.5]} intensity={7} distance={7} color="#FFC870" />}
    </group>
  );
}

/** Ziegel in einem Draw-Call (InstancedMesh mit Farbe pro Ziegel). */
const BrickWall = memo(function BrickWall({ p }: { p: Palette }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bricks = useMemo(() => {
    const rand = seeded(5);
    const list: { x: number; y: number; c: string }[] = [];
    const w = 0.5;
    const h = 0.22;
    for (let row = 0; row < 15; row++) {
      const off = row % 2 ? w / 2 : 0;
      for (let col = -13; col <= 13; col++) {
        list.push({
          x: col * (w + 0.03) + off,
          y: 0.13 + row * (h + 0.03),
          c: p.bricks[Math.floor(rand() * p.bricks.length)],
        });
      }
    }
    return list;
  }, [p.bricks]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    bricks.forEach((b, i) => {
      m.makeTranslation(b.x, b.y, WALL_Z + 0.16);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(b.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bricks]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bricks.length]} receiveShadow>
      <boxGeometry args={[0.5, 0.22, 0.08]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
});

/** Lattenzaun in einem Draw-Call. */
const PicketFence = memo(function PicketFence({ p }: { p: Palette }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 36;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(-8.75 + i * 0.5, 0.5, WALL_Z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  const mat = lowpoly(p.fence);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} material={mat} castShadow>
        <boxGeometry args={[0.18, 1.0, 0.05]} />
      </instancedMesh>
      {[0.3, 0.75].map((y) => (
        <mesh key={y} position={[0, y, WALL_Z - 0.05]} material={mat}>
          <boxGeometry args={[18, 0.08, 0.04]} />
        </mesh>
      ))}
    </group>
  );
});

/* ── Szenen ────────────────────────────────────────────────── */

function HouseScene({ p }: { p: Palette }) {
  return (
    <>
      <mesh position={[0, 1.75, WALL_Z]} material={lowpoly(p.plaster)} receiveShadow>
        <boxGeometry args={[14, 3.5, 0.3]} />
      </mesh>
      <mesh position={[0, 0.18, WALL_Z + 0.17]} material={lowpoly(p.plinth)}>
        <boxGeometry args={[14, 0.36, 0.06]} />
      </mesh>
      <mesh position={[0, 3.6, WALL_Z + 0.15]} material={lowpoly(p.roof)} castShadow>
        <boxGeometry args={[14, 0.26, 0.7]} />
      </mesh>
      <Window x={-2.55} y={2.05} p={p} />
      <Window x={2.55} y={2.05} p={p} />
      <Drainpipe x={-3.5} p={p} />
      <Tree x={3.4} z={-1.7} s={1.15} p={p} />
      <Bush x={-2.7} z={-1.9} p={p} />
    </>
  );
}

function BrickScene({ p }: { p: Palette }) {
  return (
    <>
      <mesh position={[0, 1.9, WALL_Z]} material={lowpoly(p.mortar)}>
        <boxGeometry args={[14, 3.8, 0.24]} />
      </mesh>
      <BrickWall p={p} />
      <mesh position={[0, 3.86, WALL_Z + 0.1]} material={lowpoly(p.plinth)} castShadow>
        <boxGeometry args={[14, 0.16, 0.5]} />
      </mesh>
      <Drainpipe x={2.95} p={p} />
      <WallLamp x={-2.6} y={2.7} p={p} />
      <Tree x={-3.5} z={-1.6} s={1.2} p={p} />
      <Bush x={3.3} z={-1.9} s={0.9} p={p} />
    </>
  );
}

function GardenScene({ p }: { p: Palette }) {
  return (
    <>
      <PicketFence p={p} />
      {/* Hügel hinter dem Zaun */}
      {[
        [-8, -14, 8, 0],
        [2, -17, 11, 1],
        [11, -13, 7, 2],
      ].map(([x, z, r, c], i) => (
        <mesh key={i} position={[x, -r * 0.74, z]} scale={[1.6, 1, 1]} material={lowpoly(p.leaves[c])}>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
      <Tree x={-3.4} z={-1.7} s={1.25} p={p} />
      <Tree x={3.6} z={-2.0} s={1.4} p={p} />
      <Tree x={0.6} z={-7.5} s={1.6} p={p} />
      <Flowers x={-2.4} z={-1.5} p={p} count={7} />
      <Flowers x={2.5} z={-1.4} p={p} count={7} />
    </>
  );
}

/* ── Bühne ─────────────────────────────────────────────────── */

export const Stage = memo(function Stage({
  scheme,
  fever,
  calm,
  kind,
}: {
  scheme: ColorScheme;
  fever: boolean;
  calm: boolean;
  /** Feste Szene (sonst wechselt sie pro Runde). */
  kind?: SceneKind;
}) {
  const [scene] = useState<SceneKind>(() => kind ?? nextScene());
  const [weather] = useState<Weather>(() =>
    !calm && Math.random() < RAIN_CHANCE ? "rain" : "clear",
  );
  const [evening] = useState(isEvening);
  const base = scheme === "dark" || evening ? DUSK : LIGHT;
  const p = useMemo(() => (weather === "rain" ? overcast(base) : base), [weather, base]);
  const garden = scene === "garten";

  return (
    <>
      <color attach="background" args={[p.skyHorizon]} />
      <fog attach="fog" args={[p.skyHorizon, 18, 44]} />
      <SkyDome top={p.skyTop} horizon={p.skyHorizon} fever={fever} />

      <hemisphereLight args={[p.hemiSky, p.hemiGround, p.hemi]} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={p.sun}
        color="#FFF1DC"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={30}
        shadow-bias={-0.0006}
      />

      {/* Boden: Rasen + heller Platz (Garten) bzw. Gehweg-Platten (Wand-Szenen) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} material={lowpoly(p.grass)} receiveShadow>
        <planeGeometry args={[60, 40]} />
      </mesh>
      {garden ? (
        <mesh
          rotation={[-Math.PI / 2, 0, Math.PI / 8]}
          position={[0, 0.01, 0.4]}
          scale={[1.6, 1, 1]}
          material={lowpoly(p.ground)}
          receiveShadow
        >
          <circleGeometry args={[3.1, 8]} />
        </mesh>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.5]} material={lowpoly(p.ground)} receiveShadow>
            <planeGeometry args={[30, 10]} />
          </mesh>
          {[-1.2, 0.9, 3].map((z) => (
            <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, z]} material={lowpoly(p.groundLine)}>
              <planeGeometry args={[30, 0.04]} />
            </mesh>
          ))}
        </>
      )}

      {scene === "haus" && <HouseScene p={p} />}
      {scene === "ziegel" && <BrickScene p={p} />}
      {garden && <GardenScene p={p} />}

      <Clouds color={p.cloud} calm={calm} />
      {weather === "rain" && !calm && <Rain />}
    </>
  );
});

/* ── Regen ─────────────────────────────────────────────────── */

const DROPS = 140;
const DROP_GEO = new THREE.BoxGeometry(0.012, 0.28, 0.012);

function createDrops() {
  const rand = seeded(7);
  return Array.from({ length: DROPS }, () => ({
    x: -8 + rand() * 16,
    y: rand() * 9,
    z: -4 + rand() * 7.5,
    speed: 7 + rand() * 3,
  }));
}

/** Leichter Regen: dünne Striche fallen schräg, ein InstancedMesh. */
const Rain = memo(function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#D6E6F5",
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  // Veränderlicher Zustand pro Frame → Ref (Rain rendert nur einmal)
  const drops = useRef(createDrops());
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.18)), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame((_, rawDelta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.05);
    for (let i = 0; i < DROPS; i++) {
      const d = drops.current[i];
      d.y -= d.speed * delta;
      d.x -= d.speed * delta * 0.18;
      if (d.y < 0) {
        d.y += 9;
        d.x += 9 * 0.18;
      }
      pos.set(d.x, d.y, d.z);
      m.compose(pos, q, one);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[DROP_GEO, mat, DROPS]} frustumCulled={false} />;
});
