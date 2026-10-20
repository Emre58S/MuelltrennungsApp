// Datei: components/game/models-extra.tsx
// Einfache, gut erkennbare Modelle für Papier, Glas und Sondermüll
// (diese Kategorien werden im Spiel freigeschaltet). Größe ≈ 0.5 wie die
// übrigen Modelle. Regeln laufen VOR den Basis-Regeln in models.tsx.

import { type ReactElement } from "react";

type V3 = [number, number, number];

/** Spezifische Muster – nichts, was Restmüll/Gelber Sack „stehlen“ würde. */
export const EXTRA_MODEL_RULES: [RegExp, string][] = [
  // Papier
  [/zeitung|prospekt/, "newspaper"],
  [/sauberer karton|eierkarton|druckerpatronen/, "box"],
  [/briefumschlag|schreibpapier|notizblock|visitenkarte/, "paper"],
  [/buch/, "book"],
  [/toilettenpapier/, "kitchenroll"],
  // Glas
  [/weinflasche|bierflasche|olivenoelflasche/, "glassbottle"],
  [/marmeladenglas|gurkenglas|honigglas|senfglas/, "jar"],
  [/parfuemflasche|nagellack/, "perfume"],
  // Sondermüll
  [/batterie/, "battery"],
  [/smartphone|laptop/, "phone"],
  [/medikamente/, "pills"],
  [/farbreste/, "paintcan"],
  [/ladekabel/, "cable"],
  [/thermometer/, "thermo"],
  [/energiesparlampe/, "bulb"],
];

function Box({
  size,
  pos,
  rot,
  color,
  roughness = 0.8,
  metalness = 0,
}: {
  size: V3;
  pos?: V3;
  rot?: V3;
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

function Cyl({
  r,
  rTop,
  h,
  pos,
  rot,
  color,
  roughness = 0.6,
  metalness = 0,
  opacity = 1,
}: {
  r: number;
  rTop?: number;
  h: number;
  pos?: V3;
  rot?: V3;
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
}) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, 20]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

/** Liefert null für Schlüssel, die das Basis-Modul selbst kennt. */
export function renderExtraModel(key: string): ReactElement | null {
  switch (key) {
    case "newspaper":
      return (
        <group rotation={[0.5, 0.3, 0.1]}>
          <Box size={[0.62, 0.05, 0.46]} color="#F1EEE6" roughness={0.95} />
          <Box size={[0.26, 0.052, 0.12]} pos={[-0.14, 0.002, -0.14]} color="#3F4650" />
          {[-0.02, 0.06, 0.14].map((z) => (
            <Box
              key={z}
              size={[0.5, 0.052, 0.025]}
              pos={[0.02, 0.002, z]}
              color="#9AA1AB"
            />
          ))}
          <Box size={[0.2, 0.052, 0.12]} pos={[0.17, 0.002, -0.14]} color="#C0392B" />
        </group>
      );

    case "box":
      return (
        <group rotation={[0.25, 0.6, 0]}>
          <Box size={[0.52, 0.36, 0.42]} color="#C79A63" roughness={0.95} />
          <Box size={[0.52, 0.01, 0.06]} pos={[0, 0.185, 0]} color="#A97C48" />
          <Box size={[0.36, 0.02, 0.43]} pos={[0, 0.18, 0]} rot={[0, 0, 0]} color="#D9B07C" />
        </group>
      );

    case "paper":
      return (
        <group rotation={[0.9, 0.2, 0.15]}>
          <Box size={[0.42, 0.02, 0.56]} color="#FFFFFF" roughness={0.9} />
          {[-0.18, -0.1, -0.02, 0.06, 0.14].map((z) => (
            <Box key={z} size={[0.32, 0.022, 0.015]} pos={[0, 0.001, z]} color="#A7C4E0" />
          ))}
        </group>
      );

    case "book":
      return (
        <group rotation={[0.4, 0.5, 0.1]}>
          <Box size={[0.42, 0.1, 0.56]} color="#7B2D26" roughness={0.8} />
          <Box size={[0.39, 0.085, 0.54]} pos={[0.016, 0, 0]} color="#F3EBD8" roughness={0.95} />
          <Box size={[0.03, 0.1, 0.56]} pos={[-0.2, 0, 0]} color="#5C1F1A" />
        </group>
      );

    case "glassbottle":
      return (
        <group rotation={[0.1, 0, -0.15]}>
          <Cyl r={0.15} h={0.46} color="#2E7D4F" roughness={0.15} opacity={0.85} />
          <Cyl r={0.15} rTop={0.06} h={0.12} pos={[0, 0.29, 0]} color="#2E7D4F" roughness={0.15} opacity={0.85} />
          <Cyl r={0.055} h={0.16} pos={[0, 0.43, 0]} color="#2E7D4F" roughness={0.15} opacity={0.85} />
          <Cyl r={0.06} h={0.04} pos={[0, 0.52, 0]} color="#D4AF37" metalness={0.6} roughness={0.3} />
          <Cyl r={0.153} h={0.16} pos={[0, -0.02, 0]} color="#F5E9C8" roughness={0.9} />
        </group>
      );

    case "jar":
      return (
        <group rotation={[0.15, 0.3, 0.05]}>
          <Cyl r={0.2} h={0.36} color="#D9F0F5" roughness={0.1} opacity={0.6} />
          <Cyl r={0.16} h={0.26} pos={[0, -0.04, 0]} color="#C0392B" roughness={0.7} />
          <Cyl r={0.205} h={0.07} pos={[0, 0.215, 0]} color="#E2B33C" metalness={0.5} roughness={0.35} />
          <Cyl r={0.203} h={0.12} pos={[0, 0.02, 0]} color="#FFFFFF" roughness={0.9} />
        </group>
      );

    case "perfume":
      return (
        <group rotation={[0.1, 0.4, 0]}>
          <Box size={[0.34, 0.34, 0.16]} color="#F8C8DC" roughness={0.1} />
          <Cyl r={0.05} h={0.08} pos={[0, 0.21, 0]} color="#D4AF37" metalness={0.7} roughness={0.25} />
          <Box size={[0.14, 0.12, 0.12]} pos={[0, 0.31, 0]} color="#2B2B2B" roughness={0.4} />
        </group>
      );

    case "battery":
      return (
        <group rotation={[0.3, 0, Math.PI / 2.4]}>
          <Cyl r={0.12} h={0.5} color="#1F2937" roughness={0.4} metalness={0.3} />
          <Cyl r={0.122} h={0.18} pos={[0, 0.16, 0]} color="#F59E0B" roughness={0.4} />
          <Cyl r={0.04} h={0.04} pos={[0, 0.27, 0]} color="#C0C8D4" metalness={0.8} roughness={0.2} />
        </group>
      );

    case "phone":
      return (
        <group rotation={[0.6, 0.2, 0.1]}>
          <Box size={[0.32, 0.04, 0.6]} color="#1F2937" roughness={0.3} metalness={0.4} />
          <Box size={[0.28, 0.042, 0.52]} pos={[0, 0.001, 0]} color="#3B82F6" roughness={0.15} />
        </group>
      );

    case "pills":
      return (
        <group rotation={[0.7, 0.3, 0]}>
          <Box size={[0.5, 0.04, 0.3]} color="#E5E7EB" roughness={0.3} metalness={0.4} />
          {[-0.15, 0, 0.15].map((x) =>
            [-0.07, 0.07].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.035, z]} castShadow>
                <sphereGeometry args={[0.045, 12, 8]} />
                <meshStandardMaterial color="#EF4444" roughness={0.4} />
              </mesh>
            )),
          )}
        </group>
      );

    case "paintcan":
      return (
        <group rotation={[0.2, 0.3, 0]}>
          <Cyl r={0.22} h={0.4} color="#C0C8D4" metalness={0.6} roughness={0.35} />
          <Cyl r={0.223} h={0.2} pos={[0, -0.02, 0]} color="#8B5CF6" roughness={0.7} />
          <Cyl r={0.18} h={0.03} pos={[0, 0.215, 0]} color="#8B5CF6" roughness={0.5} />
        </group>
      );

    case "cable":
      return (
        <group rotation={[0.8, 0, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.18, 0.025, 8, 28]} />
            <meshStandardMaterial color="#F3F4F6" roughness={0.6} />
          </mesh>
          <Box size={[0.12, 0.08, 0.16]} pos={[0.24, 0, 0]} color="#E5E7EB" />
        </group>
      );

    case "thermo":
      return (
        <group rotation={[0.3, 0, Math.PI / 3]}>
          <Cyl r={0.04} h={0.6} color="#E0F2FE" roughness={0.1} opacity={0.75} />
          <Cyl r={0.015} h={0.45} pos={[0, -0.02, 0]} color="#B91C1C" />
          <mesh position={[0, -0.3, 0]} castShadow>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshStandardMaterial color="#9CA3AF" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
