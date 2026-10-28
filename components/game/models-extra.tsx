// Datei: components/game/models-extra.tsx
// Einfache, gut erkennbare Modelle für Papier, Glas und Sondermüll
// (diese Kategorien werden im Spiel freigeschaltet). Größe ≈ 0.5 wie die
// übrigen Modelle. Regeln laufen VOR den Basis-Regeln in models.tsx.

import { type ReactElement } from "react";
import * as THREE from "three";

type V3 = [number, number, number];

/** Spezifische Muster – nichts, was Restmüll/Gelber Sack „stehlen“ würde. */
export const EXTRA_MODEL_RULES: [RegExp, string][] = [
  // Papier
  [/zeitung|prospekt|zeitschrift/, "newspaper"],
  [/sauberer karton|eierkarton|schuhkarton/, "box"],
  [/briefumschlag|schreibpapier|notizblock|visitenkarte/, "paper"],
  [/buch/, "book"],
  [/toilettenpapier/, "kitchenroll"],
  // Glas
  [/weinflasche|bierflasche|olivenoelflasche/, "glassbottle"],
  [/saftflasche/, "juicebottle"],
  // Restmüll-Irrtümer mit eigenem Modell (laufen vor den Basis-Regeln)
  [/trinkglas/, "tumbler"],
  [/backpapier/, "bakingpaper"],
  [/kerzenreste/, "candle"],
  [/obstnetz/, "fruitnet"],
  [/kronkorken/, "bottlecap"],
  [/marmeladenglas|gurkenglas|honigglas|senfglas/, "jar"],
  [/parfuemflasche/, "perfume"],
  // Sondermüll
  [/batterie/, "battery"],
  [/smartphone/, "phone"],
  [/laptop/, "laptop"],
  [/druckerpatronen/, "cartridge"],
  [/nagellackentferner/, "remover"],
  [/medikamente/, "pills"],
  [/farbreste/, "paintcan"],
  [/ladekabel/, "cable"],
  [/thermometer/, "thermo"],
  [/energiesparlampe/, "ecobulb"],
];

function Box({
  size,
  pos,
  rot,
  color,
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
      <meshLambertMaterial
        color={color}
        flatShading
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
  opacity = 1,
  open = false,
}: {
  r: number;
  rTop?: number;
  /** Ohne Deckel/Boden (z. B. Trinkglas) – innen sichtbar. */
  open?: boolean;
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
      <cylinderGeometry args={[rTop ?? r, r, h, 20, 1, open]} />
      <meshLambertMaterial
        color={color}
        flatShading
        transparent={opacity < 1}
        opacity={opacity}
        side={open ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

/** Ein Material für alle Glanzstreifen – beim Backen wird daraus ein Zeichenaufruf. */
const SHINE_MAT = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false });

/** Glanzstreifen: lässt Glas glänzen (Lambert kennt keine Spiegelung). */
function Shine({ size, pos, rot }: { size: V3; pos: V3; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot} material={SHINE_MAT}>
      <boxGeometry args={size} />
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
          <Shine size={[0.03, 0.16, 0.01]} pos={[-0.075, 0.15, 0.13]} rot={[0, -0.5, 0]} />
          <Shine size={[0.02, 0.1, 0.01]} pos={[-0.03, 0.42, 0.05]} rot={[0, -0.5, 0]} />
        </group>
      );

    case "juicebottle":
      // Klare Glasflasche mit orangem Saft – anders als die grüne Weinflasche
      return (
        <group rotation={[0.1, 0, 0.15]}>
          <Cyl r={0.13} h={0.4} color="#E6F4F1" opacity={0.55} />
          <Cyl r={0.12} h={0.3} pos={[0, -0.04, 0]} color="#F59E0B" />
          <Cyl r={0.13} rTop={0.06} h={0.1} pos={[0, 0.25, 0]} color="#E6F4F1" opacity={0.55} />
          <Cyl r={0.065} h={0.06} pos={[0, 0.33, 0]} color="#EF4444" />
          <Shine size={[0.03, 0.22, 0.01]} pos={[-0.065, 0.02, 0.115]} rot={[0, -0.5, 0]} />
        </group>
      );

    case "tumbler":
      // Trinkglas: oben offen (man sieht hinein), dünne Wand, dicker Boden,
      // heller Rand oben
      return (
        <group rotation={[0.45, 0.3, -0.1]}>
          {/* Boden zuerst: so bleibt er auch durch die Glaswand sichtbar */}
          <Cyl r={0.17} h={0.06} pos={[0, -0.17, 0]} color="#C4E3EC" opacity={0.85} />
          <Cyl r={0.17} rTop={0.2} h={0.4} color="#DCEFF5" opacity={0.45} open />
          <Cyl r={0.204} h={0.022} pos={[0, 0.2, 0]} color="#F5FBFD" opacity={0.9} open />
          <Shine size={[0.03, 0.3, 0.01]} pos={[-0.09, 0.02, 0.16]} rot={[0, -0.5, 0]} />
        </group>
      );

    case "bakingpaper":
      // Backpapier: leicht gewelltes, beigefarbenes Blatt ohne Aufdruck
      return (
        <group rotation={[0.8, 0.3, 0.2]}>
          <Box size={[0.52, 0.015, 0.4]} color="#EFE3C8" />
          <Box size={[0.52, 0.015, 0.16]} pos={[0, 0.05, -0.24]} rot={[0.5, 0, 0]} color="#E8DAB9" />
        </group>
      );

    case "candle":
      return (
        <group rotation={[0.2, 0.3, -0.2]}>
          {/* Stummel mit gelblicher Oberseite, Docht und Wachstropfen */}
          <Cyl r={0.13} rTop={0.12} h={0.15} color="#FFF4D6" />
          <Cyl r={0.12} h={0.02} pos={[0, 0.08, 0]} color="#F6E3A1" />
          <Cyl r={0.012} h={0.07} pos={[0, 0.12, 0]} color="#1F2937" />
          <Cyl r={0.04} rTop={0.025} h={0.08} pos={[0.1, 0.01, 0.07]} color="#FFF4D6" />
          <Cyl r={0.03} rTop={0.02} h={0.06} pos={[-0.11, 0.02, 0.05]} color="#FFF4D6" />
        </group>
      );

    case "fruitnet":
      // Orangenes Netz: bauchiger, durchscheinender Sack, oben zugeknotet
      return (
        <group rotation={[0.2, 0.4, 0.15]}>
          <Cyl r={0.17} rTop={0.23} h={0.16} pos={[0, -0.08, 0]} color="#F97316" opacity={0.55} />
          <Cyl r={0.23} rTop={0.06} h={0.2} pos={[0, 0.1, 0]} color="#F97316" opacity={0.55} />
          <Cyl r={0.045} h={0.07} pos={[0, 0.23, 0]} color="#EA580C" />
        </group>
      );

    case "bottlecap":
      // Kronkorken: flache Metallkappe mit gezacktem Rand
      return (
        <group rotation={[0.9, 0.2, 0.1]}>
          <Cyl r={0.18} h={0.05} color="#D4AF37" />
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <Box
                key={i}
                size={[0.06, 0.06, 0.035]}
                pos={[Math.cos(a) * 0.19, -0.015, Math.sin(a) * 0.19]}
                rot={[0, -a, 0]}
                color="#B8932B"
              />
            );
          })}
          <Cyl r={0.12} h={0.052} pos={[0, 0.002, 0]} color="#DC2626" />
        </group>
      );

    case "jar":
      return (
        <group rotation={[0.15, 0.3, 0.05]}>
          <Cyl r={0.2} h={0.36} color="#D9F0F5" roughness={0.1} opacity={0.6} />
          <Cyl r={0.16} h={0.26} pos={[0, -0.04, 0]} color="#C0392B" roughness={0.7} />
          <Cyl r={0.205} h={0.07} pos={[0, 0.215, 0]} color="#E2B33C" metalness={0.5} roughness={0.35} />
          <Cyl r={0.203} h={0.12} pos={[0, 0.02, 0]} color="#FFFFFF" roughness={0.9} />
          <Shine size={[0.035, 0.26, 0.01]} pos={[-0.11, 0, 0.17]} rot={[0, -0.55, 0]} />
        </group>
      );

    case "perfume":
      return (
        <group rotation={[0.1, 0.4, 0]}>
          <Box size={[0.34, 0.34, 0.16]} color="#F8C8DC" roughness={0.1} />
          <Shine size={[0.035, 0.26, 0.005]} pos={[-0.1, 0, 0.083]} />
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

    case "laptop":
      return (
        <group rotation={[0.45, 0.5, 0]}>
          <Box size={[0.62, 0.035, 0.42]} color="#9CA3AF" />
          <Box size={[0.5, 0.037, 0.2]} pos={[0, 0.001, 0.06]} color="#4B5563" />
          {/* Aufgeklappter Bildschirm */}
          <group position={[0, 0.02, -0.2]} rotation={[-1.9, 0, 0]}>
            <Box size={[0.62, 0.03, 0.4]} pos={[0, 0, 0.2]} color="#9CA3AF" />
            <Box size={[0.54, 0.032, 0.32]} pos={[0, 0.001, 0.2]} color="#1E3A5F" />
          </group>
        </group>
      );

    case "remover":
      // Nagellackentferner: Kunststoffflasche mit orangem Warnetikett
      return (
        <group rotation={[0.1, 0.35, -0.1]}>
          <Cyl r={0.14} h={0.4} color="#F1F5F9" />
          <Cyl r={0.142} h={0.18} pos={[0, -0.02, 0]} color="#F97316" />
          {/* Warnraute wie das echte Gefahrensymbol: rot umrandet, weiß gefüllt */}
          <Box size={[0.12, 0.12, 0.02]} pos={[0, -0.02, 0.14]} rot={[0, 0, Math.PI / 4]} color="#DC2626" />
          <Box size={[0.085, 0.085, 0.022]} pos={[0, -0.02, 0.142]} rot={[0, 0, Math.PI / 4]} color="#FFFFFF" />
          <Cyl r={0.06} h={0.1} pos={[0, 0.25, 0]} color="#7C3AED" />
        </group>
      );

    case "cartridge":
      return (
        <group rotation={[0.35, 0.6, 0.1]}>
          <Box size={[0.3, 0.42, 0.2]} color="#1F2937" />
          <Box size={[0.302, 0.16, 0.202]} pos={[0, 0.06, 0]} color="#06B6D4" />
          <Box size={[0.16, 0.06, 0.12]} pos={[0, -0.24, 0]} color="#F59E0B" />
        </group>
      );

    case "ecobulb":
      // Energiesparlampe: gewundene Röhre auf weißem Sockel, Schraubgewinde
      return (
        <group rotation={[0.15, 0.3, -0.25]}>
          {[-0.09, 0.09].map((x) => (
            <Cyl key={x} r={0.05} h={0.36} pos={[x, 0.2, 0]} color="#EFE9D8" />
          ))}
          <Cyl r={0.05} h={0.36} pos={[0, 0.2, 0.09]} color="#E8E1CC" />
          <Cyl r={0.12} rTop={0.15} h={0.14} pos={[0, -0.03, 0]} color="#FFFFFF" />
          <Cyl r={0.08} h={0.12} pos={[0, -0.16, 0]} color="#C0C8D4" />
          <Cyl r={0.04} h={0.04} pos={[0, -0.24, 0]} color="#4B5563" />
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
                <meshLambertMaterial color="#EF4444" flatShading />
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
            <meshLambertMaterial color="#F3F4F6" flatShading />
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
            <meshLambertMaterial color="#9CA3AF" flatShading />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
