// Datei: components/game/item-preview.tsx
// Kleine 3D-Vorschau eines Gegenstands (Sammelbuch): dasselbe Modell wie im
// Spiel, wiegt sich langsam hin und her – bei „Weniger Bewegung“ steht es still.

import { Canvas, useFrame } from "@react-three/fiber/native";
import { memo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type * as THREE from "three";

import { type Item } from "@/constants/items";
import { Radius } from "@/constants/theme";
import { TrashObject3D } from "./models";

function Swing({ item, calm }: { item: Item; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    // Dieselbe Pose wie vor dem Wurf: leicht zur Kamera gekippt, sanftes Wiegen
    g.rotation.set(0.15, calm ? -0.3 : -0.3 + Math.sin(state.clock.elapsedTime * 0.9) * 0.35, 0);
  });
  return (
    <group ref={ref} rotation={[0.15, -0.3, 0]}>
      <TrashObject3D item={item} />
    </group>
  );
}

export const ItemPreview3D = memo(function ItemPreview3D({
  item,
  size,
  background,
  calm,
  label,
}: {
  item: Item;
  size: number;
  background: string;
  calm: boolean;
  /** Für VoiceOver: Name des Gegenstands. */
  label: string;
}) {
  return (
    <View
      style={[styles.frame, { width: size, height: size, backgroundColor: background }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {/* Ohne Bewegung nur bei Bedarf zeichnen (spart Akku) */}
      <Canvas
        frameloop={calm ? "demand" : "always"}
        style={{ width: size, height: size }}
        camera={{ fov: 35, position: [0, 0.05, 1.9], near: 0.1, far: 10 }}>
        <color attach="background" args={[background]} />
        <hemisphereLight args={["#FFFFFF", "#B8B0A0", 1.15]} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} color="#FFF1DC" />
        <Swing item={item} calm={calm} />
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.lg, overflow: "hidden", alignSelf: "center" },
});
