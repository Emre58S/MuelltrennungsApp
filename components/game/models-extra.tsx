// Datei: components/game/models-extra.tsx
// Einfache, gut erkennbare Modelle für Papier, Glas und Sondermüll
// (diese Kategorien werden im Spiel freigeschaltet). Größe ≈ 0.5 wie die
// übrigen Modelle. Regeln laufen VOR den Basis-Regeln in models.tsx.

import { type ReactElement } from "react";
import * as THREE from "three";

import { G, Part } from "./models/shared";

type V3 = [number, number, number];

/** Spezifische Muster – nichts, was Restmüll/Gelber Sack „stehlen“ würde. */
export const EXTRA_MODEL_RULES: [RegExp, string][] = [
  // Papier
  [/zeitung|prospekt|zeitschrift/, "newspaper"],
  [/sauberer karton|schuhkarton/, "box"],
  [/eierkarton/, "eggbox"],
  [/briefumschlag|schreibpapier|notizblock|visitenkarte/, "paper"],
  [/buch/, "book"],
  [/toilettenpapier/, "papertube"],
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
/** `name` = normalisierter Gegenstandsname – für Varianten (z. B. Bier- vs. Weinflasche). */
export function renderExtraModel(key: string, name = ""): ReactElement | null {
  switch (key) {
    case "newspaper":
      // Drei Papier-Drucksachen, drei Formen (vorher alle gleich):
      if (name.includes("zeitschrift")) {
        // Zeitschrift: dick, Hochformat, buntes Hochglanz-Cover mit Titel und
        // Foto, weiße Seitenkanten
        return (
          <group rotation={[0.75, 0.25, 0.1]}>
            <Box size={[0.42, 0.08, 0.56]} color="#F8FAFC" />
            <Box size={[0.43, 0.012, 0.57]} pos={[0, 0.042, 0]} color="#DB2777" />
            <Box size={[0.36, 0.014, 0.09]} pos={[0, 0.043, -0.21]} color="#FFFFFF" />
            <Cyl r={0.1} h={0.014} pos={[0.04, 0.044, 0.04]} color="#F5C9A0" />
            <Box size={[0.2, 0.018, 0.07]} pos={[0.04, 0.046, -0.08]} color="#7C2D12" />
            {[0.16, 0.2].map((z) => (
              <Box key={z} size={[0.14, 0.014, 0.02]} pos={[-0.11, 0.044, z]} color="#FDE047" />
            ))}
            <Shine size={[0.03, 0.004, 0.26]} pos={[0.13, 0.05, 0.1]} rot={[0, 0.3, 0]} />
          </group>
        );
      }
      if (name.includes("prospekt")) {
        // Werbeprospekt: dünn, knallgelb, Produktbilder mit roten Preisschildern
        return (
          <group rotation={[0.85, -0.2, 0.08]}>
            <Box size={[0.5, 0.012, 0.6]} color="#FDE047" />
            <Box size={[0.49, 0.014, 0.098]} pos={[0, 0.002, -0.25]} color="#DC2626" />
            {(
              [
                [-0.12, -0.08, "#16A34A"],
                [0.12, -0.08, "#F97316"],
                [-0.12, 0.15, "#2563EB"],
                [0.12, 0.15, "#A16207"],
              ] as [number, number, string][]
            ).map(([x, z, col]) => (
              <group key={`${x}${z}`}>
                <Box size={[0.17, 0.014, 0.15]} pos={[x, 0.002, z]} color={col} />
                {/* Preisschild als roter Punkt mit weißem Strich */}
                <Cyl r={0.045} h={0.016} pos={[x + 0.06, 0.006, z + 0.06]} color="#DC2626" />
                <Box size={[0.05, 0.018, 0.014]} pos={[x + 0.06, 0.007, z + 0.06]} color="#FFFFFF" />
              </group>
            ))}
          </group>
        );
      }
      // Tageszeitung: einmal gefaltet (runde Knickkante), schwarzer Titelkopf,
      // Foto und viele graue Textspalten
      return (
        <group rotation={[0.75, 0.3, 0.1]}>
          <Box size={[0.62, 0.05, 0.46]} color="#F1EEE6" roughness={0.95} />
          <Cyl r={0.03} h={0.63} pos={[0, 0, 0.23]} rot={[0, 0, Math.PI / 2]} color="#E7E3D8" />
          <Box size={[0.56, 0.052, 0.07]} pos={[0, 0.002, -0.17]} color="#1F2937" />
          <Box size={[0.1, 0.054, 0.05]} pos={[0.2, 0.003, -0.17]} color="#C0392B" />
          <Box size={[0.22, 0.054, 0.16]} pos={[-0.16, 0.003, -0.02]} color="#6B7280" />
          {[0.06, 0.1, 0.14, 0.18].map((z) =>
            [-0.16, 0.04, 0.2].map((x) => (
              <Box
                key={`${x}${z}`}
                size={[0.14, 0.052, 0.014]}
                pos={[x, 0.002, z]}
                color="#9AA1AB"
              />
            )),
          )}
          {[-0.08, -0.04, 0.0].map((z) => (
            <Box key={`r${z}`} size={[0.24, 0.052, 0.014]} pos={[0.13, 0.002, z]} color="#9AA1AB" />
          ))}
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

    case "eggbox":
      // Eierkarton aus grauem Pappguss: dünner Boden + Wände (keine volle
      // Kiste), 2×3 offene Mulden, ein Ei liegt noch drin, Deckel hochgeklappt
      return (
        <group rotation={[0.75, 0.3, 0]}>
          <Box size={[0.5, 0.02, 0.34]} pos={[0, -0.07, 0]} color="#B8B2A6" />
          {(
            [
              [0, -0.17, 0.5, 0.02],
              [0, 0.17, 0.5, 0.02],
            ] as [number, number, number, number][]
          ).map(([x, z, w, d]) => (
            <Box key={z} size={[w, 0.12, d]} pos={[x, -0.01, z]} color="#B8B2A6" />
          ))}
          {[-0.25, 0.25].map((x) => (
            <Box key={x} size={[0.02, 0.12, 0.34]} pos={[x, -0.01, 0]} color="#B8B2A6" />
          ))}
          {[-0.15, 0, 0.15].map((x) =>
            [-0.08, 0.08].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.05, z]} rotation={[Math.PI, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshLambertMaterial color="#A39D91" flatShading side={THREE.DoubleSide} />
              </mesh>
            )),
          )}
          {/* Ein Ei in der Mulde */}
          <mesh position={[0.15, 0.06, 0.08]} scale={[1, 1.25, 1]} castShadow>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshLambertMaterial color="#FAF7F0" flatShading />
          </mesh>
          {[-0.075, 0.075].map((x) => (
            <mesh key={x} position={[x, 0.07, 0]} castShadow>
              <coneGeometry args={[0.025, 0.06, 5]} />
              <meshLambertMaterial color="#B8B2A6" flatShading />
            </mesh>
          ))}
          {/* Deckel hinten hochgeklappt */}
          <group position={[0, 0.05, -0.17]} rotation={[-1.9, 0, 0]}>
            <Box size={[0.5, 0.04, 0.34]} pos={[0, 0, 0.17]} color="#C2BCB0" />
          </group>
        </group>
      );

    case "paper":
      // Vier Papier-Dinge, vier Formen (vorher alle dasselbe linierte Blatt):
      if (name.includes("briefumschlag")) {
        // Briefumschlag: Klappe als V, Briefmarke, Adresszeilen
        return (
          <group rotation={[0.9, 0.2, 0.15]}>
            <Box size={[0.52, 0.02, 0.34]} color="#FAF6EC" />
            {[-1, 1].map((sg) => (
              <Box
                key={sg}
                size={[0.32, 0.022, 0.018]}
                pos={[sg * 0.13, 0.002, -0.08]}
                rot={[0, sg * 0.6, 0]}
                color="#C9B994"
              />
            ))}
            <Box size={[0.08, 0.024, 0.1]} pos={[0.19, 0.003, 0.09]} color="#C0392B" />
            {[0.06, 0.1].map((z) => (
              <Box key={z} size={[0.18, 0.023, 0.014]} pos={[-0.08, 0.002, z]} color="#8A94A3" />
            ))}
          </group>
        );
      }
      if (name.includes("visitenkarte")) {
        // Visitenkarten: drei kleine, dicke Karten aufgefächert, Logo-Punkt
        return (
          <group rotation={[0.9, 0.3, 0.1]}>
            {[-0.06, 0, 0.06].map((dx, i) => (
              <group key={dx} position={[dx, i * 0.014, dx * 0.6]} rotation={[0, (i - 1) * 0.35, 0]}>
                <Box size={[0.3, 0.014, 0.18]} color="#FFFFFF" />
                <Cyl r={0.025} h={0.016} pos={[-0.1, 0.002, -0.04]} color="#2563EB" />
                {[-0.03, 0.02].map((z) => (
                  <Box key={z} size={[0.12, 0.016, 0.012]} pos={[0.04, 0.002, z]} color="#475569" />
                ))}
              </group>
            ))}
          </group>
        );
      }
      if (name.includes("notizblock")) {
        // Notizblock: dicker Stapel, gelbes Deckblatt, Spirale oben
        return (
          <group rotation={[0.8, 0.25, 0.1]}>
            <Box size={[0.34, 0.08, 0.44]} color="#F5F5F0" />
            <Box size={[0.34, 0.01, 0.44]} pos={[0, 0.045, 0]} color="#FDE68A" />
            {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
              <mesh key={x} position={[x, 0.03, -0.22]} rotation={[0, Math.PI / 2, 0]} castShadow>
                <torusGeometry args={[0.035, 0.007, 4, 10]} />
                <meshLambertMaterial color="#9CA3AF" flatShading />
              </mesh>
            ))}
            {[-0.08, -0.02, 0.04, 0.1].map((z) => (
              <Box key={z} size={[0.26, 0.012, 0.01]} pos={[0, 0.047, z]} color="#C9A227" />
            ))}
          </group>
        );
      }
      // Schreibpapier: liniertes Blatt
      return (
        <group rotation={[0.9, 0.2, 0.15]}>
          <Box size={[0.42, 0.02, 0.56]} color="#FFFFFF" roughness={0.9} />
          {[-0.18, -0.1, -0.02, 0.06, 0.14].map((z) => (
            <Box key={z} size={[0.32, 0.022, 0.015]} pos={[0, 0.001, z]} color="#A7C4E0" />
          ))}
        </group>
      );

    case "book":
      // Altes Buch: zwei Deckel + Rücken, cremefarbene Seiten an drei Seiten
      // sichtbar, Lesebändchen (vorher steckten die Seiten unsichtbar im Klotz)
      return (
        <group rotation={[0.4, 0.5, 0.1]}>
          <Box size={[0.42, 0.016, 0.56]} pos={[0, 0.048, 0]} color="#7B2D26" />
          <Box size={[0.42, 0.016, 0.56]} pos={[0, -0.048, 0]} color="#7B2D26" />
          <Box size={[0.03, 0.112, 0.56]} pos={[-0.2, 0, 0]} color="#5C1F1A" />
          <Box size={[0.39, 0.08, 0.53]} pos={[0.005, 0, 0]} color="#F3EBD8" />
          <Box size={[0.025, 0.004, 0.1]} pos={[0.08, 0, 0.3]} color="#C0392B" />
        </group>
      );

    case "glassbottle":
      // Drei Flaschen, drei Formen (vorher alle gleich grün):
      if (name.includes("bier")) {
        // Bierflasche: braun, kurz und bauchig, Kronkorken
        return (
          <group rotation={[0.1, 0, -0.15]}>
            <Cyl r={0.17} h={0.36} pos={[0, -0.05, 0]} color="#7A4A1E" />
            <Cyl r={0.17} rTop={0.065} h={0.14} pos={[0, 0.2, 0]} color="#7A4A1E" />
            <Cyl r={0.06} h={0.12} pos={[0, 0.33, 0]} color="#7A4A1E" />
            <Cyl r={0.068} h={0.03} pos={[0, 0.4, 0]} color="#C9A227" />
            <Cyl r={0.173} h={0.14} pos={[0, -0.06, 0]} color="#F2E3B3" />
            <Cyl r={0.174} h={0.03} pos={[0, -0.06, 0]} color="#C0392B" />
            <Shine size={[0.03, 0.14, 0.01]} pos={[-0.085, 0.08, 0.145]} rot={[0, -0.5, 0]} />
          </group>
        );
      }
      if (name.includes("olivenoel")) {
        // Olivenölflasche: schlank und hoch, gelbgrünes Öl, silberner Ausgießer
        return (
          <group rotation={[0.1, 0, 0.15]}>
            <Cyl r={0.11} h={0.5} pos={[0, -0.05, 0]} color="#D9EDE0" opacity={0.5} />
            <Cyl r={0.1} h={0.36} pos={[0, -0.11, 0]} color="#B5A12A" />
            <Cyl r={0.11} rTop={0.045} h={0.1} pos={[0, 0.25, 0]} color="#D9EDE0" opacity={0.5} />
            <Cyl r={0.04} h={0.1} pos={[0, 0.34, 0]} color="#D9EDE0" opacity={0.5} />
            <Cyl r={0.045} rTop={0.02} h={0.08} pos={[0, 0.42, 0]} color="#C0C8D4" />
            <Cyl r={0.113} h={0.14} pos={[0, -0.08, 0]} color="#3F6B3A" />
            <Shine size={[0.025, 0.3, 0.01]} pos={[-0.06, 0.02, 0.095]} rot={[0, -0.6, 0]} />
          </group>
        );
      }
      // Weinflasche: hoch, dunkelgrün, langer Hals, goldene Kapsel, Etikett
      return (
        <group rotation={[0.1, 0, -0.15]}>
          <Cyl r={0.15} h={0.46} color="#1F5C3A" roughness={0.15} opacity={0.88} />
          <Cyl r={0.15} rTop={0.06} h={0.12} pos={[0, 0.29, 0]} color="#1F5C3A" roughness={0.15} opacity={0.88} />
          <Cyl r={0.055} h={0.2} pos={[0, 0.45, 0]} color="#1F5C3A" roughness={0.15} opacity={0.88} />
          <Cyl r={0.06} h={0.1} pos={[0, 0.52, 0]} color="#D4AF37" metalness={0.6} roughness={0.3} />
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
          {/* Metall-Schraubdeckel (PET-Flaschen haben Plastikdeckel) und dicker Glasboden */}
          <Cyl r={0.068} h={0.06} pos={[0, 0.33, 0]} color="#C0C8D4" />
          {[0.315, 0.335, 0.355].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.069, 0.004, 4, 16]} />
              <meshLambertMaterial color="#9CA3AF" flatShading />
            </mesh>
          ))}
          <Cyl r={0.132} h={0.04} pos={[0, -0.19, 0]} color="#CDE6E0" />
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
      // Benutztes Backpapier: flaches, leicht gewelltes Blatt mit Beschichtungs-
      // Glanz, braun gebackenen Rändern und Fettflecken (kein Knäuel – das
      // wäre das Küchentuch aus dem Bio)
      return (
        <group rotation={[-0.35, 0.35, 0.12]}>
          {/* Nur leicht gewellt (±0,016), damit Ränder, Flecken und Glanz darauf liegen */}
          <Part geo={G.wave(0.5, 0.4, 0.008, 9, 1)} double color="#F0E4C8" roughness={0.4} />
          {/* braune Ränder oben und rechts */}
          <Part geo={G.box(0.5, 0.05, 0.008, 0.002)} pos={[0, 0.18, 0.02]} color="#A8743A" roughness={1} />
          <Part geo={G.box(0.05, 0.4, 0.008, 0.002)} pos={[0.23, 0, 0.02]} color="#B9864A" roughness={1} />
          {(
            [
              [-0.12, 0.03, 0.05],
              [0.06, -0.08, 0.04],
              [-0.02, 0.1, 0.03],
            ] as [number, number, number][]
          ).map(([x, y, r], i) => (
            <Part key={i} geo={G.circle(r, 10)} pos={[x, y, 0.02]} basic double color="#C9A16A" />
          ))}
          {/* Glanz der Beschichtung */}
          <Part
            geo={G.box(0.03, 0.3, 0.004, 0.001)}
            pos={[-0.17, -0.02, 0.017]}
            rot={[0, 0, -0.3]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.55}
          />
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
      // Leeres Plastiknetz (ohne Orangen – die wären Essen und lenkten zum
      // Biomüll): sich kreuzende Netzschnüre, leicht zusammengefallen,
      // oben Clip mit Etikett
      return (
        <group rotation={[0.25, 0.4, 0.1]} scale={[1, 0.8, 1]}>
          {(
            [
              [-0.08, 0.185],
              [0.02, 0.2],
              [0.1, 0.175],
            ] as [number, number][]
          ).map(([y, rad]) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rad, 0.014, 4, 18]} />
              <meshLambertMaterial color="#EA580C" flatShading />
            </mesh>
          ))}
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((ang) => (
            <mesh key={ang} rotation={[0, ang, 0]} scale={[1, 1.15, 1]}>
              <torusGeometry args={[0.2, 0.014, 4, 18]} />
              <meshLambertMaterial color="#EA580C" flatShading />
            </mesh>
          ))}
          <Box size={[0.08, 0.05, 0.05]} pos={[0, 0.25, 0]} color="#F8FAFC" />
          <Box size={[0.12, 0.08, 0.008]} pos={[0.08, 0.2, 0.03]} rot={[0, 0, -0.3]} color="#FDE68A" />
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
      // Vier Gläser, vier Inhalte (vorher alle rot gefüllt):
      if (name.includes("gurken")) {
        // Gurkenglas: hoch, grünliche Brühe mit Gurken, grüner Deckel
        return (
          <group rotation={[0.15, 0.3, 0.05]}>
            {/* Grünlich getöntes Glas statt eigener Brühe-Schicht: so bleiben die
                Gurken sichtbar (zwei durchsichtige Schichten sortiert three.js nicht sicher) */}
            <Cyl r={0.19} h={0.44} color="#C9DDA0" opacity={0.55} />
            {(
              [
                [-0.07, 0.05],
                [0.07, 0.06],
                [0, -0.08],
              ] as [number, number][]
            ).map(([x, z]) => (
              <Cyl key={`${x}${z}`} r={0.045} h={0.32} pos={[x, -0.04, z]} rot={[0, 0, x * 0.8]} color="#5E8F2F" />
            ))}
            <Cyl r={0.195} h={0.06} pos={[0, 0.25, 0]} color="#2E7D32" />
            <Shine size={[0.035, 0.32, 0.01]} pos={[-0.105, 0, 0.16]} rot={[0, -0.55, 0]} />
          </group>
        );
      }
      if (name.includes("honig")) {
        // Honigglas: breit, bernsteinfarbener Honig, Waben-Zeichen, Golddeckel
        return (
          <group rotation={[0.15, 0.3, 0.05]}>
            <Cyl r={0.21} h={0.3} color="#F7E7C0" opacity={0.5} />
            <Cyl r={0.19} h={0.24} pos={[0, -0.02, 0]} color="#D99A1E" />
            <Cyl r={0.215} h={0.06} pos={[0, 0.18, 0]} color="#E2B33C" />
            {[-0.06, 0, 0.06].map((x, i) => (
              <mesh key={x} position={[x, i === 1 ? 0.04 : -0.01, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.01, 6]} />
                <meshLambertMaterial color="#F5C542" flatShading />
              </mesh>
            ))}
            <Shine size={[0.035, 0.22, 0.01]} pos={[-0.115, 0, 0.175]} rot={[0, -0.55, 0]} />
          </group>
        );
      }
      if (name.includes("senf")) {
        // Senfglas: klein und schmal, knallgelber Senf, dunkelblauer Deckel
        return (
          <group rotation={[0.15, 0.3, 0.05]} scale={0.85}>
            <Cyl r={0.15} rTop={0.16} h={0.36} color="#F1F5E8" opacity={0.5} />
            <Cyl r={0.135} h={0.28} pos={[0, -0.03, 0]} color="#E2B400" />
            <Cyl r={0.165} h={0.06} pos={[0, 0.21, 0]} color="#1E3A8A" />
            <Cyl r={0.162} h={0.1} pos={[0, 0.02, 0]} color="#FFFFFF" />
            <Shine size={[0.03, 0.26, 0.01]} pos={[-0.09, 0, 0.14]} rot={[0, -0.55, 0]} />
          </group>
        );
      }
      // Marmeladenglas: rote Marmelade, karierter Stoffdeckel mit Rüsche
      return (
        <group rotation={[0.15, 0.3, 0.05]}>
          <Cyl r={0.2} h={0.36} color="#D9F0F5" roughness={0.1} opacity={0.6} />
          <Cyl r={0.16} h={0.26} pos={[0, -0.04, 0]} color="#C0392B" roughness={0.7} />
          <Cyl r={0.23} h={0.05} pos={[0, 0.21, 0]} color="#D94B4B" />
          <Cyl r={0.24} rTop={0.2} h={0.04} pos={[0, 0.165, 0]} color="#F5F5F5" />
          {/* weiße Karos flach auf dem Stoffdeckel */}
          {(
            [
              [-0.1, -0.1],
              [0.1, -0.1],
              [0, 0],
              [-0.1, 0.1],
              [0.1, 0.1],
            ] as [number, number][]
          ).map(([x, z]) => (
            <Box key={`${x}${z}`} size={[0.08, 0.01, 0.08]} pos={[x, 0.24, z]} color="#FFFFFF" />
          ))}
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
      // Druckerpatrone: flacher schwarzer Körper, Etikett, kupferne Kontakte,
      // drei Farbpunkte (Cyan/Magenta/Gelb), Düse unten
      return (
        <group rotation={[-0.3, 0.6, 0.1]}>
          <Box size={[0.36, 0.26, 0.14]} color="#1F2937" />
          <Box size={[0.24, 0.1, 0.004]} pos={[-0.03, 0.04, 0.072]} color="#F8FAFC" />
          {(
            [
              [-0.1, "#06B6D4"],
              [-0.03, "#EC4899"],
              [0.04, "#FACC15"],
            ] as [number, string][]
          ).map(([x, col]) => (
            <Cyl key={x} r={0.022} h={0.006} pos={[x, 0.04, 0.076]} rot={[Math.PI / 2, 0, 0]} color={col} />
          ))}
          {/* Kontaktfeld (Kupfer) */}
          <Box size={[0.08, 0.12, 0.004]} pos={[0.13, -0.05, 0.072]} color="#B87333" />
          {[-0.09, -0.05, -0.01].map((y) => (
            <Box key={y} size={[0.06, 0.012, 0.006]} pos={[0.13, y, 0.073]} color="#E0A76A" />
          ))}
          <Box size={[0.12, 0.04, 0.1]} pos={[-0.08, -0.15, 0]} color="#374151" />
        </group>
      );

    case "ecobulb":
      // Energiesparlampe: gewendelte Röhre (gestapelte, leicht schräge Ringe
      // wirken wie eine Spirale), weißer Sockel, Schraubgewinde
      return (
        <group rotation={[0.15, 0.3, -0.25]}>
          {[0.04, 0.11, 0.18, 0.25].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2 + 0.18, 0, 0]} castShadow>
              <torusGeometry args={[0.1, 0.035, 6, 16]} />
              <meshLambertMaterial color="#EFE9D8" flatShading />
            </mesh>
          ))}
          <Cyl r={0.12} rTop={0.15} h={0.12} pos={[0, -0.06, 0]} color="#FFFFFF" />
          <Cyl r={0.08} h={0.12} pos={[0, -0.18, 0]} color="#C0C8D4" />
          {[-0.21, -0.18, -0.15].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.082, 0.008, 4, 14]} />
              <meshLambertMaterial color="#9CA3AF" flatShading />
            </mesh>
          ))}
          <Cyl r={0.04} h={0.04} pos={[0, -0.26, 0]} color="#4B5563" />
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
      // Farbeimer (nicht Konservendose): breiter als hoch, Drahtbügel, Farbe
      // oben sichtbar und über den Rand gelaufen, Deckel lehnt daneben
      return (
        <group rotation={[0.45, 0.3, 0]}>
          <Cyl r={0.24} rTop={0.25} h={0.3} color="#C0C8D4" />
          <Cyl r={0.22} h={0.02} pos={[0, 0.15, 0]} color="#8B5CF6" />
          {(
            [
              [0.0, 0.08],
              [-0.12, 0.11],
              [0.11, 0.06],
            ] as [number, number][]
          ).map(([x, h]) => (
            <Box key={x} size={[0.05, h, 0.02]} pos={[x, 0.15 - h / 2, Math.sqrt(0.0625 - x * x)]} color="#8B5CF6" />
          ))}
          {/* Drahtbügel */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <torusGeometry args={[0.24, 0.012, 5, 18, Math.PI]} />
            <meshLambertMaterial color="#6B7280" flatShading />
          </mesh>
          {/* Deckel schräg an den Eimer gelehnt */}
          <Cyl r={0.23} h={0.025} pos={[0.3, 0.04, -0.04]} rot={[0, 0, -1.25]} color="#9CA3AF" />
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
      // Quecksilber ist silbern (rot wäre ein Alkohol-Thermometer, kein Sondermüll)
      return (
        <group rotation={[0.3, 0, Math.PI / 3]}>
          <Cyl r={0.04} h={0.6} color="#E0F2FE" roughness={0.1} opacity={0.75} />
          <Cyl r={0.015} h={0.45} pos={[0, -0.02, 0]} color="#8B95A5" />
          <mesh position={[0, -0.3, 0]} castShadow>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshLambertMaterial color="#D1D5DB" flatShading />
          </mesh>
          {[-0.1, 0, 0.1, 0.2].map((y) => (
            <Box key={y} size={[0.03, 0.006, 0.006]} pos={[0.035, y, 0.02]} color="#334155" />
          ))}
          <Shine size={[0.012, 0.4, 0.004]} pos={[-0.02, 0, 0.038]} />
        </group>
      );

    case "papertube":
      // Leere Papprolle (das ist das Altpapier an der Toilettenpapier-Rolle)
      return (
        <group rotation={[0.35, 0.5, Math.PI / 2.2]} scale={[1, 1, 0.82]}>
          <Cyl r={0.12} h={0.42} color="#B08B5B" open />
          <Cyl r={0.118} h={0.43} color="#8C6A43" open />
          {/* Schräge Naht um die Rolle herum (typisch für Pappe) */}
          <mesh rotation={[Math.PI / 2 + 0.4, 0, 0]}>
            <torusGeometry args={[0.121, 0.004, 4, 20]} />
            <meshLambertMaterial color="#8C6A43" flatShading />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
