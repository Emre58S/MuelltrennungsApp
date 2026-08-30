import { BINS } from "@/constants/items";
import { Canvas, useFrame } from "@react-three/fiber/native";
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

type BinData = (typeof BINS)[number];

type BinProps = {
  bin: BinData;
  index: number;
  total: number;
};

function darkenHex(hex: string, factor = 0.58) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);

  if (Number.isNaN(value)) {
    return "#1A1A1A";
  }

  const r = Math.max(0, Math.round(((value >> 16) & 255) * factor));
  const g = Math.max(0, Math.round(((value >> 8) & 255) * factor));
  const b = Math.max(0, Math.round((value & 255) * factor));

  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function TrashBin({ bin, index, total }: BinProps) {
  const group = useRef<THREE.Group>(null);
  const bodyColor = bin.color;
  const lightColor = bin.colorLight ?? bin.color;
  const darkColor = useMemo(() => darkenHex(bodyColor), [bodyColor]);

  const spacing = 1.72;
  const x = (index - (total - 1) / 2) * spacing;

  useFrame((state) => {
    if (!group.current) return;

    const phase = index * 0.72;
    group.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.75 + phase) * 0.025;
    group.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.45 + phase) * 0.025;
  });

  return (
    <group ref={group} position={[x, -0.12, 0]} scale={0.88}>
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.22, 1.72, 0.86]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.58}
          metalness={0.06}
        />
      </mesh>

      <mesh castShadow position={[-0.34, 0.12, 0.44]}>
        <boxGeometry args={[0.13, 1.52, 0.03]} />
        <meshStandardMaterial color={lightColor} transparent opacity={0.3} />
      </mesh>

      <mesh castShadow position={[0, 0.99, 0]}>
        <boxGeometry args={[1.34, 0.18, 0.96]} />
        <meshStandardMaterial color={darkColor} roughness={0.55} />
      </mesh>

      <mesh castShadow position={[0, 1.15, -0.08]}>
        <boxGeometry args={[0.48, 0.12, 0.24]} />
        <meshStandardMaterial color={darkColor} roughness={0.55} />
      </mesh>

      <mesh castShadow position={[0, -0.03, 0.45]}>
        <boxGeometry args={[0.7, 0.46, 0.07]} />
        <meshStandardMaterial color={lightColor} roughness={0.62} />
      </mesh>

      <mesh castShadow position={[0, 0.36, 0.45]}>
        <boxGeometry args={[0.82, 0.035, 0.04]} />
        <meshStandardMaterial color={darkColor} transparent opacity={0.34} />
      </mesh>

      <mesh castShadow position={[0, -0.25, 0.45]}>
        <boxGeometry args={[0.82, 0.035, 0.04]} />
        <meshStandardMaterial color={darkColor} transparent opacity={0.28} />
      </mesh>

      <mesh
        castShadow
        position={[-0.4, -0.93, -0.25]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.16, 0.16, 0.12, 20]} />
        <meshStandardMaterial color="#10131C" roughness={0.78} />
      </mesh>

      <mesh
        castShadow
        position={[0.4, -0.93, -0.25]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.16, 0.16, 0.12, 20]} />
        <meshStandardMaterial color="#10131C" roughness={0.78} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0B1120"]} />
      <fog attach="fog" args={["#0B1120", 8, 19]} />

      <ambientLight intensity={1.35} />
      <directionalLight
        castShadow
        position={[4.5, 7, 5]}
        intensity={2.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-5, 2, 3]} intensity={0.7} color="#7DD3FC" />

      <mesh
        receiveShadow
        position={[0, -1.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[18, 13]} />
        <meshStandardMaterial color="#141D31" roughness={0.92} />
      </mesh>

      {BINS.map((bin, index) => (
        <TrashBin
          key={bin.category}
          bin={bin}
          index={index}
          total={BINS.length}
        />
      ))}
    </>
  );
}

export default function ThreeBinScene() {
  return (
    <View style={styles.container}>
      <Canvas
        shadows
        camera={{ position: [0, 1.65, 8.8], fov: 44 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 420,
    backgroundColor: "#0B1120",
  },
});
