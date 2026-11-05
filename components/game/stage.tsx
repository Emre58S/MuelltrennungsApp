// Datei: components/game/stage.tsx — wechselnde Low-Poly-Kulissen
//
// Drei Szenen, pro Runde wechselnd: Hauswand · Ziegelwand · Garten.
// Gestaltungsregel für Übersicht: Hinter den Tonnen (Mitte) nur ruhige
// Flächen – Details (Fenster, Bäume, Rohre) stehen an den Seiten.
// Stil: flach schattierte Facetten + Pastellpalette (Townscaper/Islanders).
// Immer heller, freundlicher Tag (auch im Dunkel-Modus und abends) – das
// Spiel soll einladend wirken. Wetter: manchmal leichter Regen, der Himmel
// bleibt dabei hell (ein Draw-Call).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { lowpoly } from "./materials";
import { Baked } from "./model-cache";

export type SceneKind = "haus" | "ziegel" | "garten" | "kueche" | "buero";
/** Szenen, die von Runde zu Runde wechseln. Die Küche gibt es nur, wenn ein Trick-Level sie verlangt. */
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

// Weiches Licht (E5): etwas weniger Sonne, mehr Himmelslicht – flachere
// Kontraste, Farben bleiben gleich; Himmel oben etwas ruhiger (weniger satt)
const LIGHT: Palette = {
  skyTop: "#8CCAEE",
  skyHorizon: "#FFF0DC",
  ground: "#F2EADC",
  groundLine: "#E2D6C2",
  grass: "#9BDB78",
  plaster: "#F8DFC0",
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
  sun: 1.5,
  hemiSky: "#FFFFFF",
  hemiGround: "#E3D3BA",
  hemi: 1.3,
};

/** Bedeckter Himmel bei Regen (überschreibt nur Himmel und Licht). */
function overcast(p: Palette): Palette {
  return {
    ...p,
    skyTop: "#A9C8DE",
    skyHorizon: "#EEF2F4",
    cloud: "#F2F4F6",
    sun: p.sun * 0.85,
    // etwas weniger Himmelslicht, damit Regen sichtbar trüber bleibt
    hemi: p.hemi * 0.92,
  };
}

export type Weather = "clear" | "rain";
const RAIN_CHANCE = 0.22;

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

const GRATE = "#7E868E";
const GRATE_SLOT = "#4F565D";

/** Längsfugen der Gehweg-Platten (versetzt je Reihe) – ruhiges Pflaster-Muster. */
function PavingJoints({ p }: { p: Palette }) {
  // Reihen zwischen den Querfugen (z −1.2 / 0.9 / 3) – vor der Wand bis nach vorn
  const rows: [number, number][] = [
    [WALL_Z + 0.3, -1.2],
    [-1.2, 0.9],
    [0.9, 3],
    [3, 6],
  ];
  return (
    <>
      {rows.flatMap(([z0, z1], row) =>
        Array.from({ length: 11 }, (_, i) => {
          // Versatz 0.375: keine Fuge auf x = 0 (sähe aus wie eine Ziellinie)
          const x = (i - 5) * 1.5 + 0.375 + (row % 2) * 0.75;
          return (
            <mesh key={`${row}-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, (z0 + z1) / 2]} material={lowpoly(p.groundLine)}>
              <planeGeometry args={[0.04, z1 - z0]} />
            </mesh>
          );
        }),
      )}
    </>
  );
}

/** Gully-Rost seitlich vor den Tonnen, neben der Wurfbahn. */
function Gully() {
  return (
    <group position={[1.5, 0, 1.45]} rotation={[0, 0.06, 0]}>
      <mesh position={[0, 0.02, 0]} material={lowpoly(GRATE)}>
        <boxGeometry args={[0.46, 0.016, 0.32]} />
      </mesh>
      {[-0.135, -0.045, 0.045, 0.135].map((gx) => (
        <mesh key={gx} position={[gx, 0.03, 0]} material={lowpoly(GRATE_SLOT)}>
          <boxGeometry args={[0.045, 0.008, 0.24]} />
        </mesh>
      ))}
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

/** Halbe Breite der Hecke in der Zaunmitte – reicht auch hinter 6 Tonnen (bis ±3,76). */
const HEDGE_HALF = 3.3;
/** Latten nur seitlich der Hecke: hinter den Tonnen bleibt es ruhig. */
const PICKETS_X = Array.from({ length: 36 }, (_, i) => -8.75 + i * 0.5).filter(
  (x) => Math.abs(x) > HEDGE_HALF,
);

/** Lattenzaun in einem Draw-Call, in der Mitte eine ruhige Hecke. */
const PicketFence = memo(function PicketFence({ p }: { p: Palette }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = PICKETS_X.length;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    PICKETS_X.forEach((x, i) => {
      m.makeTranslation(x, 0.5, WALL_Z);
      mesh.setMatrixAt(i, m);
    });
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
      {/* Hecke: eine ruhige grüne Fläche statt Latten hinter den Tonnen;
          umschließt die Querlatten (Tiefe 0,5 um WALL_Z) */}
      <mesh position={[0, 0.5, WALL_Z]} material={lowpoly(p.leaves[1])}>
        <boxGeometry args={[HEDGE_HALF * 2 + 0.2, 1.0, 0.5]} />
      </mesh>
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


/* ── Küche (Trickwürfe) ─────────────────────────────────────── */

/** Lage des Küchenfensters (x): so, dass es auf kleinen Handys im Bild liegt (Vorhang im Wind-Parcours). */
export const KITCHEN_WINDOW_X = 1.7;

const KITCHEN = {
  wall: "#F6E7CF",
  tileA: "#EFE4D2",
  tileB: "#E0D0B8",
  backsplash: "#D3E8E6",
  grout: "#BFD6D3",
  wood: "#C99B6D",
  woodDark: "#A27447",
  counter: "#D8D2C7",
  glass: "#CDEBFA",
  frame: "#FFFFFF",
  pot: "#D9744F",
  leaf: "#6FBF73",
  kettle: "#B9C2CC",
};

/** Boden: helle Grundfläche + dunklere Fliesen im Schachbrett (gebacken, ein Zeichenaufruf). */
function KitchenFloor() {
  const tiles: [number, number][] = [];
  const size = 0.9;
  for (let ix = -9; ix <= 9; ix++)
    for (let iz = -3; iz <= 7; iz++) if ((ix + iz) % 2 === 0) tiles.push([ix * size, -1.2 + iz * size]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 1.5]} material={lowpoly(KITCHEN.tileA)} receiveShadow>
        <planeGeometry args={[30, 20]} />
      </mesh>
      {tiles.map(([x, z]) => (
        <mesh key={`${x}|${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]} material={lowpoly(KITCHEN.tileB)}>
          <planeGeometry args={[size, size]} />
        </mesh>
      ))}
    </>
  );
}

/** Hängeschrank an der Seite (hinter den Tonnen bleibt es ruhig). */
function UpperCabinet({ x }: { x: number }) {
  return (
    <group position={[x, 2.95, WALL_Z + 0.42]}>
      <mesh material={lowpoly(KITCHEN.wood)} castShadow>
        <boxGeometry args={[2.6, 1.2, 0.5]} />
      </mesh>
      <mesh position={[0, 0, 0.26]} material={lowpoly(KITCHEN.woodDark)}>
        <boxGeometry args={[0.03, 1.1, 0.02]} />
      </mesh>
      {[-0.25, 0.25].map((dx) => (
        <mesh key={dx} position={[dx, -0.35, 0.27]} material={lowpoly(KITCHEN.woodDark)}>
          <boxGeometry args={[0.04, 0.2, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

function KitchenScene() {
  const seams = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  return (
    <>
      {/* Wand + Fliesenspiegel mit Fugen */}
      <mesh position={[0, 3, WALL_Z]} material={lowpoly(KITCHEN.wall)} receiveShadow>
        <boxGeometry args={[18, 6, 0.3]} />
      </mesh>
      <mesh position={[0, 1.5, WALL_Z + 0.17]} material={lowpoly(KITCHEN.backsplash)}>
        <boxGeometry args={[18, 1.1, 0.04]} />
      </mesh>
      {[1.17, 1.5, 1.83].map((y) => (
        <mesh key={y} position={[0, y, WALL_Z + 0.2]} material={lowpoly(KITCHEN.grout)}>
          <boxGeometry args={[18, 0.025, 0.02]} />
        </mesh>
      ))}

      {/* Arbeitsplatte mit Unterschränken */}
      <mesh position={[0, 0.925, WALL_Z + 0.5]} material={lowpoly(KITCHEN.counter)} castShadow receiveShadow>
        <boxGeometry args={[18, 0.1, 0.8]} />
      </mesh>
      <mesh position={[0, 0.44, WALL_Z + 0.46]} material={lowpoly(KITCHEN.wood)} receiveShadow>
        <boxGeometry args={[18, 0.88, 0.72]} />
      </mesh>
      {seams.map((x) => (
        <mesh key={x} position={[x, 0.44, WALL_Z + 0.83]} material={lowpoly(KITCHEN.woodDark)}>
          <boxGeometry args={[0.03, 0.8, 0.02]} />
        </mesh>
      ))}

      {/* Hängeschränke an den Seiten, Fenster daneben */}
      <UpperCabinet x={-4.6} />
      <UpperCabinet x={4.6} />
      <group position={[KITCHEN_WINDOW_X, 2.55, WALL_Z + 0.17]}>
        <mesh material={lowpoly(KITCHEN.frame)}>
          <boxGeometry args={[1.3, 1.05, 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.035]} material={lowpoly(KITCHEN.glass, { emissive: "#6FA8C8" })}>
          <boxGeometry args={[1.14, 0.9, 0.02]} />
        </mesh>
        <mesh position={[0, 0, 0.05]} material={lowpoly(KITCHEN.frame)}>
          <boxGeometry args={[0.05, 0.9, 0.02]} />
        </mesh>
      </group>

      {/* Kleinigkeiten auf der Arbeitsplatte: Blumentopf links, Wasserkocher rechts */}
      <group position={[-3.0, 0.98, WALL_Z + 0.55]}>
        <mesh position={[0, 0.17, 0]} material={lowpoly(KITCHEN.pot)} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.34, 8]} />
        </mesh>
        <mesh position={[0, 0.5, 0]} material={lowpoly(KITCHEN.leaf)} castShadow>
          <icosahedronGeometry args={[0.26, 0]} />
        </mesh>
      </group>
      <group position={[3.3, 0.98, WALL_Z + 0.55]}>
        <mesh position={[0, 0.2, 0]} material={lowpoly(KITCHEN.kettle)} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.4, 8]} />
        </mesh>
        <mesh position={[0, 0.43, 0]} material={lowpoly(KITCHEN.woodDark)}>
          <sphereGeometry args={[0.06, 6, 4]} />
        </mesh>
        <mesh position={[0.25, 0.28, 0]} rotation={[0, 0, -0.9]} material={lowpoly(KITCHEN.kettle)}>
          <cylinderGeometry args={[0.03, 0.05, 0.22, 6]} />
        </mesh>
      </group>
    </>
  );
}

/* ── Büro (Trickwürfe) ──────────────────────────────────────── */

const OFFICE = {
  wall: "#E9EDF2",
  wainscot: "#CBD3DD",
  carpetA: "#B9C1CC",
  carpetB: "#ACB5C1",
  deskTop: "#D9C3A1",
  deskBody: "#5F6B7C",
  screen: "#2B2F36",
  glow: "#6FA8D8",
  keys: "#C9CFD8",
  shelf: "#7B5E3C",
  glass: "#CDEBFA",
  frame: "#FFFFFF",
  slat: "#F2F4F7",
  pot: "#D9744F",
  leaf: "#6FBF73",
  board: "#FFFFFF",
};
const FOLDERS = ["#E2574C", "#3D82D9", "#2FA86E", "#F5B800", "#8E5BD6", "#E2574C", "#3D82D9"];

/** Boden: Teppichfliesen im Schachbrett (gebacken, ein Zeichenaufruf). */
function OfficeFloor() {
  const tiles: [number, number][] = [];
  const size = 1.1;
  for (let ix = -8; ix <= 8; ix++)
    for (let iz = -3; iz <= 6; iz++) if ((ix + iz) % 2 === 0) tiles.push([ix * size, -1.3 + iz * size]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 1.5]} material={lowpoly(OFFICE.carpetA)} receiveShadow>
        <planeGeometry args={[30, 20]} />
      </mesh>
      {tiles.map(([x, z]) => (
        <mesh key={`${x}|${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]} material={lowpoly(OFFICE.carpetB)}>
          <planeGeometry args={[size, size]} />
        </mesh>
      ))}
    </>
  );
}

/** Monitor auf dem Schreibtisch (Fuß, Rahmen, leuchtender Bildschirm). */
function OfficeMonitor({ x }: { x: number }) {
  return (
    <group position={[x, 1.0, WALL_Z + 0.5]}>
      <mesh position={[0, 0.03, 0]} material={lowpoly("#3A3F47")}>
        <boxGeometry args={[0.34, 0.03, 0.22]} />
      </mesh>
      <mesh position={[0, 0.17, 0]} material={lowpoly("#3A3F47")}>
        <boxGeometry args={[0.05, 0.26, 0.05]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={lowpoly(OFFICE.screen)} castShadow>
        <boxGeometry args={[0.95, 0.56, 0.05]} />
      </mesh>
      <mesh position={[0, 0.5, 0.03]} material={lowpoly(OFFICE.glow, { emissive: "#3B6C94" })}>
        <boxGeometry args={[0.86, 0.47, 0.01]} />
      </mesh>
    </group>
  );
}

/** Aktenregal an der Seite: Bretter mit bunten Ordnern. */
function OfficeShelf({ x }: { x: number }) {
  return (
    <group position={[x, 2.15, WALL_Z + 0.32]}>
      <mesh material={lowpoly(OFFICE.shelf)} castShadow>
        <boxGeometry args={[2.1, 2.4, 0.04]} />
      </mesh>
      {[-0.95, -0.35, 0.25, 0.85].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.15]} material={lowpoly(OFFICE.shelf)}>
            <boxGeometry args={[2.1, 0.04, 0.3]} />
          </mesh>
          {FOLDERS.map((c, i) => (
            <mesh key={i} position={[-0.8 + i * 0.27, y + 0.2, 0.15]} material={lowpoly(c)}>
              <boxGeometry args={[0.13, 0.36, 0.22]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-1.03, 0, 0.15]} material={lowpoly(OFFICE.shelf)}>
        <boxGeometry args={[0.04, 2.4, 0.3]} />
      </mesh>
      <mesh position={[1.03, 0, 0.15]} material={lowpoly(OFFICE.shelf)}>
        <boxGeometry args={[0.04, 2.4, 0.3]} />
      </mesh>
    </group>
  );
}

function OfficeScene() {
  return (
    <>
      {/* Wand mit helleren Paneelen unten und einer Leiste */}
      <mesh position={[0, 3, WALL_Z]} material={lowpoly(OFFICE.wall)} receiveShadow>
        <boxGeometry args={[18, 6, 0.3]} />
      </mesh>
      <mesh position={[0, 0.55, WALL_Z + 0.17]} material={lowpoly(OFFICE.wainscot)}>
        <boxGeometry args={[18, 1.1, 0.04]} />
      </mesh>
      <mesh position={[0, 1.12, WALL_Z + 0.2]} material={lowpoly("#9FA9B6")}>
        <boxGeometry args={[18, 0.04, 0.06]} />
      </mesh>

      {/* Schreibtisch über die ganze Breite */}
      <mesh position={[0, 0.96, WALL_Z + 0.5]} material={lowpoly(OFFICE.deskTop)} castShadow receiveShadow>
        <boxGeometry args={[18, 0.06, 0.8]} />
      </mesh>
      <mesh position={[0, 0.46, WALL_Z + 0.42]} material={lowpoly(OFFICE.deskBody)} receiveShadow>
        <boxGeometry args={[18, 0.9, 0.6]} />
      </mesh>
      {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
        <mesh key={x} position={[x, 0.46, WALL_Z + 0.73]} material={lowpoly("#4C5766")}>
          <boxGeometry args={[0.03, 0.82, 0.02]} />
        </mesh>
      ))}

      {/* Details nur an den Seiten (hinter den Tonnen bleibt es ruhig) */}
      <OfficeMonitor x={-2.3} />
      <OfficeMonitor x={3.6} />
      <mesh position={[-2.3, 0.99, WALL_Z + 0.85]} material={lowpoly(OFFICE.keys)}>
        <boxGeometry args={[0.55, 0.025, 0.18]} />
      </mesh>
      <OfficeShelf x={-4.7} />

      {/* Whiteboard */}
      <group position={[-2.1, 2.5, WALL_Z + 0.17]}>
        <mesh material={lowpoly("#B7C0CC")}>
          <boxGeometry args={[1.5, 0.98, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]} material={lowpoly(OFFICE.board)}>
          <boxGeometry args={[1.4, 0.88, 0.01]} />
        </mesh>
        {[0.25, 0.05, -0.15].map((y, i) => (
          <mesh key={y} position={[-0.2 + i * 0.05, y, 0.035]} material={lowpoly(i === 1 ? "#3D82D9" : "#9AA3AC")}>
            <boxGeometry args={[0.8 - i * 0.12, 0.03, 0.005]} />
          </mesh>
        ))}
      </group>

      {/* Fenster mit Jalousie (gleiche Stelle wie in der Küche) */}
      <group position={[KITCHEN_WINDOW_X, 2.55, WALL_Z + 0.17]}>
        <mesh material={lowpoly(OFFICE.frame)}>
          <boxGeometry args={[1.3, 1.05, 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.035]} material={lowpoly(OFFICE.glass, { emissive: "#6FA8C8" })}>
          <boxGeometry args={[1.14, 0.9, 0.02]} />
        </mesh>
        {[0.34, 0.2, 0.06].map((y) => (
          <mesh key={y} position={[0, y, 0.055]} material={lowpoly(OFFICE.slat)}>
            <boxGeometry args={[1.14, 0.05, 0.01]} />
          </mesh>
        ))}
      </group>

      {/* Zimmerpflanze rechts */}
      <group position={[2.35, 0, WALL_Z + 0.75]}>
        <mesh position={[0, 0.25, 0]} material={lowpoly(OFFICE.pot)} castShadow>
          <cylinderGeometry args={[0.26, 0.2, 0.5, 8]} />
        </mesh>
        <mesh position={[0, 0.85, 0]} material={lowpoly(OFFICE.leaf)} castShadow>
          <icosahedronGeometry args={[0.45, 0]} />
        </mesh>
        <mesh position={[0.18, 1.2, 0.05]} material={lowpoly("#58A85D")} castShadow>
          <icosahedronGeometry args={[0.3, 0]} />
        </mesh>
      </group>
    </>
  );
}

/* ── Bühne ─────────────────────────────────────────────────── */

export const Stage = memo(function Stage({
  fever,
  calm,
  kind,
}: {
  fever: boolean;
  calm: boolean;
  /** Feste Szene (sonst wechselt sie pro Runde). */
  kind?: SceneKind;
}) {
  const [scene] = useState<SceneKind>(() => kind ?? nextScene());
  const [weather] = useState<Weather>(() =>
    !calm && Math.random() < RAIN_CHANCE ? "rain" : "clear",
  );
  const p = useMemo(() => (weather === "rain" ? overcast(LIGHT) : LIGHT), [weather]);
  const garden = scene === "garten";

  // Drinnen: kein Himmel, kein Wetter – Küche mit Fliesenboden oder Büro mit Teppichfliesen
  if (scene === "kueche" || scene === "buero") {
    const wall = scene === "buero" ? OFFICE.wall : KITCHEN.wall;
    return (
      <>
        <color attach="background" args={[wall]} />
        <fog attach="fog" args={[wall, 18, 44]} />
        <hemisphereLight args={["#FFF6E6", "#D8C7AE", 1.15]} />
        <directionalLight
          position={[3, 8, 6]}
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
        <Baked>
          {scene === "buero" ? <OfficeFloor /> : <KitchenFloor />}
          {scene === "buero" ? <OfficeScene /> : <KitchenScene />}
        </Baked>
      </>
    );
  }

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

      {/* Kulisse gebacken: wenige Zeichenaufrufe statt Dutzender */}
      <Baked>
        {!garden && <PavingJoints p={p} />}
        {!garden && <Gully />}
        {scene === "haus" && <HouseScene p={p} />}
        {scene === "ziegel" && <BrickScene p={p} />}
        {garden && <GardenScene p={p} />}
      </Baked>

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
