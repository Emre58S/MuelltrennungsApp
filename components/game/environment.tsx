// Datei: components/game/environment.tsx
// Aufgeräumter Hof: wenig Details, ruhige Farben → die Tonnen stechen heraus.
// Hell = sonniger Tag, Dunkel = Abend. Im Fieber-Modus pulsiert der Himmel.

import { useFrame } from "@react-three/fiber/native";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type ColorScheme } from "@/constants/theme";

const PALETTE = {
  light: {
    sky: "#BFE6F7",
    ground: "#E7E0D0",
    groundLine: "#D6CDB8",
    grass: "#A9D18E",
    hedge: ["#5FA35A", "#4E9150", "#6DB466"],
    trunk: "#8A6A4A",
    cloud: "#FFFFFF",
    ambient: 0.85,
    sun: 1.5,
    hemiSky: "#FFFFFF",
    hemiGround: "#C9B99A",
  },
  dark: {
    sky: "#1B2540",
    ground: "#4A4F57",
    groundLine: "#40454D",
    grass: "#2F4A36",
    hedge: ["#2D5A3A", "#285034", "#356842"],
    trunk: "#4A3A2A",
    cloud: "#3A4566",
    ambient: 0.75,
    sun: 0.9,
    hemiSky: "#9DB4FF",
    hemiGround: "#2A2A30",
  },
} as const;

const FEVER_SKY = new THREE.Color("#FFB347");

function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hecke aus vielen Kugeln in EINEM Draw-Call. */
const Hedge = memo(function Hedge({ colors }: { colors: readonly string[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const blobs = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: 46 }, (_, i) => ({
      x: -9 + i * 0.4 + (rand() - 0.5) * 0.2,
      y: 0.55 + rand() * 0.45,
      z: -2.6 - rand() * 0.5,
      s: 0.5 + rand() * 0.35,
      c: new THREE.Color(colors[Math.floor(rand() * colors.length)]),
    }));
  }, [colors]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    blobs.forEach((b, i) => {
      m.compose(
        new THREE.Vector3(b.x, b.y, b.z),
        new THREE.Quaternion(),
        new THREE.Vector3(b.s, b.s * 0.85, b.s),
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, b.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blobs]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blobs.length]}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
});

const Clouds = memo(function Clouds({ color, calm }: { color: string; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!ref.current || calm) return;
    ref.current.children.forEach((c, i) => {
      c.position.x += delta * (0.12 + i * 0.04);
      if (c.position.x > 9) c.position.x = -9;
    });
  });
  const clouds = [
    { x: -4, y: 5.2, z: -9, s: 1.2 },
    { x: 2, y: 6.2, z: -11, s: 1.6 },
    { x: 6, y: 4.6, z: -8, s: 0.9 },
  ];
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[
            [0, 0, 0, 0.8],
            [0.7, -0.1, 0, 0.6],
            [-0.7, -0.15, 0, 0.55],
            [0.3, 0.35, 0, 0.55],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[1, 0.7, 0.6]}>
              <sphereGeometry args={[r, 12, 10]} />
              <meshBasicMaterial color={color} />
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
    const pts = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      pts[i * 3] = (rand() - 0.5) * 30;
      pts[i * 3 + 1] = 3 + rand() * 10;
      pts[i * 3 + 2] = -12 - rand() * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#FFFFFF" size={0.06} sizeAttenuation />
    </points>
  );
});

function Tree({ x, z, s, trunk, leaf }: { x: number; z: number; s: number; trunk: string; leaf: string }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 10]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      {[
        [0, 2.1, 0, 0.9],
        [0.55, 1.75, 0.1, 0.65],
        [-0.5, 1.8, -0.1, 0.7],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow>
          <sphereGeometry args={[r, 14, 12]} />
          <meshStandardMaterial color={leaf} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export const Environment = memo(function Environment({
  scheme,
  fever,
  calm,
}: {
  scheme: ColorScheme;
  fever: boolean;
  calm: boolean;
}) {
  const p = PALETTE[scheme];
  const skyBase = useMemo(() => new THREE.Color(p.sky), [p.sky]);
  const skyRef = useRef<THREE.Color>(null);
  const feverAmount = useRef(0);

  useFrame((state, delta) => {
    feverAmount.current = THREE.MathUtils.damp(feverAmount.current, fever ? 1 : 0, 3, delta);
    const pulse = calm ? 0.5 : 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
    skyRef.current?.copy(skyBase).lerp(FEVER_SKY, feverAmount.current * (0.35 + pulse * 0.25));
  });

  return (
    <>
      {/* Bewährt aus der alten Version: <color attach="background"> */}
      <color ref={skyRef} attach="background" args={[p.sky]} />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={[p.hemiSky, p.hemiGround, 0.6]} />
      <directionalLight
        position={[3, 7, 5]}
        intensity={p.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={25}
        shadow-bias={-0.0005}
      />
      {scheme === "dark" && (
        <pointLight position={[0, 3.5, 2.5]} intensity={6} distance={10} color="#FFD9A0" />
      )}

      {/* Boden: Platten vorne, Rasen hinten */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]} receiveShadow>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color={p.ground} roughness={1} />
      </mesh>
      {[-1.2, 1.4, 4].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, z]}>
          <planeGeometry args={[40, 0.05]} />
          <meshBasicMaterial color={p.groundLine} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -10]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial color={p.grass} roughness={1} />
      </mesh>

      <Hedge colors={p.hedge} />
      <Tree x={-4.6} z={-4} s={1.3} trunk={p.trunk} leaf={p.hedge[0]} />
      <Tree x={4.8} z={-4.5} s={1.5} trunk={p.trunk} leaf={p.hedge[2]} />

      <Clouds color={p.cloud} calm={calm} />
      {scheme === "dark" && <Stars />}
    </>
  );
});
