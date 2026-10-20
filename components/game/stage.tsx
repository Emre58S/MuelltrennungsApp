// Datei: components/game/stage.tsx — aufgeräumte Bühne (Stylized Realism)
//
// Prinzip „Overcooked“: wenige, klare Formen, ruhige Flächen – die Tonnen
// sind die Stars. Himmel mit Verlauf, sanfte Hügel, Holzzaun, zwei runde
// Bäume, ziehende Wolken. Hell = sonniger Tag, Dunkel = Abend mit Laterne.
// Im Fieber-Modus glüht der Himmel orange.

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type ColorScheme } from "@/constants/theme";

import { matte, plastic } from "./materials";

const PALETTE = {
  light: {
    skyTop: "#7EC8F2",
    skyHorizon: "#E6F5FF",
    background: "#CBEAFB",
    sun: "#FFF4C2",
    lawn: "#8FCB6B",
    hills: ["#7DBF5E", "#6BAF52", "#94D274"],
    plaza: "#EEE6D6",
    plazaEdge: "#D9CCB2",
    fence: "#C99359",
    trunk: "#8A5A3A",
    leaves: ["#5DAE4F", "#4E9B45", "#6CBD5A"],
    cloud: "#FFFFFF",
    hemiSky: "#FFFFFF",
    hemiGround: "#B8D9A0",
    ambient: 0.5,
    sunLight: 1.9,
    rim: 1.1,
    rimColor: "#FFF1D6",
  },
  dark: {
    skyTop: "#121A3A",
    skyHorizon: "#3E4C80",
    background: "#26315A",
    sun: "#F4F1DE",
    lawn: "#3B6B47",
    hills: ["#2F5A3C", "#284E34", "#37654A"],
    plaza: "#7B7D88",
    plazaEdge: "#636672",
    fence: "#7A5A3C",
    trunk: "#4A3424",
    leaves: ["#2E6440", "#285A38", "#357049"],
    cloud: "#4A5784",
    hemiSky: "#9DB4FF",
    hemiGround: "#2A3A30",
    ambient: 0.45,
    sunLight: 0.8,
    rim: 0.9,
    rimColor: "#9DB4FF",
  },
} as const;

const FEVER = new THREE.Color("#FFA24A");

function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Himmelskuppel mit Farbverlauf (Vertex-Farben, ein Draw-Call). */
function SkyDome({ top, horizon, fever }: { top: string; horizon: string; fever: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(40, 24, 16);
    const pos = g.attributes.position;
    const cTop = new THREE.Color(top);
    const cHor = new THREE.Color(horizon);
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp(pos.getY(i) / 40, 0, 1);
      c.copy(cHor).lerp(cTop, Math.pow(k, 0.6));
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
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
    material.color.setRGB(1, 1, 1).lerp(FEVER, glow.current * (0.45 + pulse * 0.2));
  });

  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** Holzzaun hinter der Bühne – alle Latten in einem Draw-Call. */
const Fence = memo(function Fence({ color }: { color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const planks = useMemo(() => {
    const rand = seeded(11);
    return Array.from({ length: 34 }, (_, i) => ({
      x: -8.25 + i * 0.5,
      h: 0.82 + (rand() - 0.5) * 0.08,
      tilt: (rand() - 0.5) * 0.04,
    }));
  }, []);
  const material = useMemo(() => matte(color), [color]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    planks.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(0, 0, p.tilt));
      m.compose(new THREE.Vector3(p.x, p.h / 2, -2.6), q, new THREE.Vector3(0.4, p.h, 0.06));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [planks]);

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, planks.length]} material={material} castShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {[0.25, 0.6].map((y) => (
        <mesh key={y} position={[0, y, -2.66]} material={material}>
          <boxGeometry args={[17, 0.08, 0.05]} />
        </mesh>
      ))}
    </group>
  );
});

function Tree({ x, z, s, trunk, leaf }: { x: number; z: number; s: number; trunk: string; leaf: string }) {
  const mats = useMemo(() => ({ trunk: matte(trunk), leaf: matte(leaf) }), [trunk, leaf]);
  const crowns: [number, number, number, number][] = [
    [0, 2.15, 0, 0.95],
    [0.6, 1.8, 0.15, 0.7],
    [-0.55, 1.85, -0.1, 0.72],
  ];
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.75, 0]} material={mats.trunk} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 1.5, 10]} />
      </mesh>
      {crowns.map(([px, py, pz, r], i) => (
        <group key={i} position={[px, py, pz]}>
          <mesh material={mats.leaf} castShadow>
            <sphereGeometry args={[r, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Bush({ x, z, s, color }: { x: number; z: number; s: number; color: string }) {
  const mat = useMemo(() => matte(color), [color]);
  return (
    <group position={[x, 0, z]} scale={s}>
      {[
        [0, 0.32, 0, 0.42],
        [0.38, 0.24, 0.05, 0.32],
        [-0.36, 0.25, 0, 0.34],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} material={mat} castShadow>
          <sphereGeometry args={[r, 14, 10]} />
        </mesh>
      ))}
    </group>
  );
}

const Clouds = memo(function Clouds({ color, calm }: { color: string; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => matte(color), [color]);
  useFrame((_, delta) => {
    if (!ref.current || calm) return;
    ref.current.children.forEach((c, i) => {
      c.position.x += delta * (0.15 + i * 0.05);
      if (c.position.x > 12) c.position.x = -12;
    });
  });
  const clouds = [
    { x: -5, y: 6.5, z: -14, s: 1.6 },
    { x: 2.5, y: 7.6, z: -16, s: 2 },
    { x: 7, y: 5.8, z: -13, s: 1.2 },
  ];
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[
            [0, 0, 0, 0.9],
            [0.85, -0.15, 0, 0.65],
            [-0.85, -0.2, 0, 0.6],
            [0.35, 0.4, 0, 0.6],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[1, 0.75, 0.6]} material={mat}>
              <sphereGeometry args={[r, 14, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
});

const Stars = memo(function Stars() {
  const geometry = useMemo(() => {
    const rand = seeded(42);
    const pts = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      pts[i * 3] = (rand() - 0.5) * 50;
      pts[i * 3 + 1] = 5 + rand() * 16;
      pts[i * 3 + 2] = -20 - rand() * 8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#FFFFFF" size={0.09} sizeAttenuation />
    </points>
  );
});

function StreetLamp({ x, z }: { x: number; z: number }) {
  const pole = useMemo(() => plastic("#3A3F48", { roughness: 0.5, metalness: 0.4 }), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.4, 0]} material={pole}>
        <cylinderGeometry args={[0.05, 0.07, 2.8, 8]} />
      </mesh>
      <mesh position={[0, 2.85, 0]}>
        <sphereGeometry args={[0.18, 14, 10]} />
        <meshBasicMaterial color="#FFE3A3" />
      </mesh>
      <pointLight position={[0, 2.7, 0.4]} intensity={9} distance={9} color="#FFD58A" />
    </group>
  );
}

export const Stage = memo(function Stage({
  scheme,
  fever,
  calm,
}: {
  scheme: ColorScheme;
  fever: boolean;
  calm: boolean;
}) {
  const p = PALETTE[scheme];
  const mats = useMemo(
    () => ({
      lawn: matte(p.lawn),
      plaza: matte(p.plaza),
      plazaEdge: matte(p.plazaEdge),
      hills: p.hills.map((c) => matte(c)),
    }),
    [p],
  );

  return (
    <>
      <color attach="background" args={[p.background]} />
      {/* Leichter Dunst in der Ferne → Tiefe, Vordergrund bleibt knackig */}
      <fog attach="fog" args={[p.skyHorizon, 16, 42]} />
      <SkyDome top={p.skyTop} horizon={p.skyHorizon} fever={fever} />

      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={[p.hemiSky, p.hemiGround, 0.7]} />
      <directionalLight
        position={[3, 8, 6]}
        intensity={p.sunLight}
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

      {/* Gegenlicht von hinten: Tonnen heben sich plastisch vom Hintergrund ab */}
      <directionalLight position={[-2, 4, -8]} intensity={p.rim} color={p.rimColor} />

      {/* Sonne / Mond */}
      <mesh position={[-7, 9, -24]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color={p.sun} />
      </mesh>

      {/* Hügel am Horizont */}
      {[
        [-9, -16, 9, 0],
        [2, -19, 12, 1],
        [11, -15, 8, 2],
        [-2, -12, 7, 0],
      ].map(([x, z, r, c], i) => (
        <mesh key={i} position={[x, -r * 0.72, z]} scale={[1.6, 1, 1]} material={mats.hills[c]}>
          <sphereGeometry args={[r, 24, 14]} />
        </mesh>
      ))}

      {/* Rasen + heller Platz als Bühne für die Tonnen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} material={mats.lawn} receiveShadow>
        <planeGeometry args={[60, 40]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.6]} scale={[1.55, 1, 1]} material={mats.plazaEdge}>
        <circleGeometry args={[3.35, 48]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.6]} scale={[1.55, 1, 1]} material={mats.plaza} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
      </mesh>

      <Fence color={p.fence} />
      <Tree x={-4.4} z={-3.6} s={1.35} trunk={p.trunk} leaf={p.leaves[0]} />
      <Tree x={4.7} z={-4.2} s={1.55} trunk={p.trunk} leaf={p.leaves[2]} />
      <Bush x={-2.9} z={-1.9} s={1} color={p.leaves[1]} />
      <Bush x={3.0} z={-2.0} s={0.9} color={p.leaves[0]} />

      <Clouds color={p.cloud} calm={calm} />
      {scheme === "dark" && (
        <>
          <Stars />
          <StreetLamp x={-3.4} z={-1.2} />
        </>
      )}
    </>
  );
});
