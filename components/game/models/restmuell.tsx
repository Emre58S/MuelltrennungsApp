// Datei: components/game/models/restmuell.tsx
// Modelle: Restmüll (inkl. Fallback-Modell)

import {
  G,
  Part,
  STRIP_POINTS,
  MIRROR_SHARDS,
} from "./shared";
import { type V3 } from "./shared";

// Fünfzackiger Stern (Umriss für G.poly), einmal berechnet
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
  const r = i % 2 ? 0.014 : 0.034;
  return [Math.cos(a) * r, Math.sin(a) * r];
}).flat();

export function renderRestmuellModel(key: string, name: string) {
  switch (key) {
    case "cigarette":
      return (
        <group rotation={[0.12, 0.3, Math.PI / 2]}>
          <Part
            geo={G.cyl(0.05, 0.05, 0.2, 12)}
            pos={[0, -0.05, 0]}
            color="#D9A25A"
            roughness={0.9}
          />
          {[-0.1, -0.03].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.051, 0.006, 5, 12)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#A06A2B"
              roughness={1}
            />
          ))}
          {/* ausgedrückt: Papierteil am Filter geknickt und plattgedrückt */}
          <group position={[0, 0.05, 0]} rotation={[0, 0, 0.5]}>
            <Part
              geo={G.cyl(0.048, 0.046, 0.18, 12)}
              pos={[0, 0.06, 0]}
              scale={[1.15, 1, 0.85]}
              color="#F1EBDD"
              roughness={0.95}
            />
            <Part
              geo={G.crumple(0.05, 0.3, 4, 1)}
              pos={[0, 0.16, 0]}
              scale={[1, 0.6, 0.8]}
              flat
              color="#3F3F46"
              roughness={1}
            />
          </group>
        </group>
      );

    case "dish":
      // Zur Kamera gekippt, damit man die Scherben von oben sieht
      return (
        <group rotation={[0.9, -0.25, 0.18]}>
          {(
            [
              { ts: 0, tl: 2.3, pos: [0.02, 0, 0.02], rot: [0.08, 0, 0.05] },
              {
                ts: 2.55,
                tl: 1.7,
                pos: [-0.06, 0.02, -0.04],
                rot: [-0.12, 0.3, 0.1],
              },
              { ts: 4.5, tl: 1.2, pos: [0, 0.01, 0.1], rot: [0.2, -0.4, -0.1] },
            ] as { ts: number; tl: number; pos: V3; rot: V3 }[]
          ).map((shard, i) => (
            <group key={i} position={shard.pos} rotation={shard.rot}>
              <Part
                geo={G.cyl(0.34, 0.3, 0.04, 18, false, shard.ts, shard.tl)}
                double
                color="#EEF2F6"
                roughness={0.45}
              />
              <Part
                geo={G.cyl(0.345, 0.315, 0.02, 18, true, shard.ts, shard.tl)}
                pos={[0, 0.012, 0]}
                double
                color="#2563EB"
                roughness={0.5}
              />
            </group>
          ))}
        </group>
      );

    case "plaster":
      return (
        <group rotation={[0.12, -0.2, 0.15]}>
          <Part
            geo={G.poly(0.012, 0.004, STRIP_POINTS)}
            color="#E8C9A0"
            roughness={0.9}
          />
          <Part
            geo={G.box(0.2, 0.12, 0.02, 0.008)}
            pos={[0, 0, 0.012]}
            color="#F1F5F9"
            roughness={0.9}
          />
          {[-0.26, -0.2, 0.2, 0.26].flatMap((x) =>
            [-0.04, 0.04].map((y) => (
              <Part
                key={`${x}:${y}`}
                geo={G.circle(0.012, 8)}
                pos={[x, y, 0.017]}
                basic
                color="#B98F63"
              />
            )),
          )}
        </group>
      );

    case "bulb":
      return (
        <group rotation={[0.12, 0.2, -0.1]}>
          {/* zerbrochener Glaskolben */}
          <Part
            geo={G.lathe(
              10,
              [
                0.1, -0.2, 0.15, -0.1, 0.23, 0.02, 0.26, 0.12, 0.24, 0.22, 0.2,
                0.28,
              ],
            )}
            double
            flat
            color="#E0F2FE"
            opacity={0.5}
            roughness={0.1}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i * Math.PI) / 3;
            const h = 0.07 + (i % 3) * 0.03;
            return (
              <Part
                key={i}
                geo={G.cone(0.035, h, 4)}
                pos={[Math.cos(a) * 0.19, 0.27 + h / 2, Math.sin(a) * 0.19]}
                rot={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]}
                double
                flat
                color="#E0F2FE"
                opacity={0.55}
                roughness={0.1}
              />
            );
          })}
          {/* Glühwendel */}
          <Part
            geo={G.torus(0.04, 0.006, 5, 10)}
            pos={[0, 0.03, 0]}
            color="#F59E0B"
            emissive="#B45309"
          />
          {[-0.04, 0.04].map((x) => (
            <Part
              key={x}
              geo={G.cyl(0.004, 0.004, 0.22, 5)}
              pos={[x, -0.07, 0]}
              color="#94A3B8"
              metalness={0.5}
            />
          ))}
          {/* Sockel */}
          <Part
            geo={G.cyl(0.11, 0.1, 0.16, 14)}
            pos={[0, -0.28, 0]}
            color="#B8C0CC"
            roughness={0.35}
            metalness={0.55}
          />
          {[-0.32, -0.28, -0.24].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.108, 0.012, 5, 14)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#8E99A8"
              roughness={0.4}
              metalness={0.55}
            />
          ))}
          <Part
            geo={G.cyl(0.05, 0.05, 0.04, 10)}
            pos={[0, -0.38, 0]}
            color="#4B5563"
            metalness={0.5}
            roughness={0.5}
          />
        </group>
      );

    case "vacuum":
      // Staubsaugerbeutel: prall gefülltes graues Kissen, oben die Pappplatte
      // mit großem Loch, Staubfleck (vorher eine flache Platte wie ein Umschlag)
      return (
        <group rotation={[0.2, 0.25, -0.1]}>
          <Part geo={G.ball(0.26, 12, 10)} scale={[1.05, 1.25, 0.45]} color="#D9DCE1" roughness={1} />
          {/* Pappplatte vor dem Beutel, Loch ganz sichtbar */}
          <group position={[0, 0.25, 0.1]} rotation={[-0.3, 0, 0]}>
            <Part geo={G.box(0.3, 0.14, 0.03, 0.01)} color="#B08B5B" roughness={1} />
            <Part geo={G.circle(0.045, 16)} pos={[0, 0, 0.017]} basic color="#1F2937" />
          </group>
          <Part geo={G.circle(0.07, 12)} pos={[0.06, -0.08, 0.112]} rot={[0.15, 0.1, 0]} basic color="#9CA3AF" />
          {/* Falz am unteren Ende */}
          <Part geo={G.box(0.2, 0.02, 0.02, 0.006)} pos={[0, -0.3, 0.035]} color="#C4C8CF" roughness={1} />
        </group>
      );

    case "pen":
      return (
        <group rotation={[0.2, 0.3, Math.PI / 2]}>
          <Part
            geo={G.cyl(0.045, 0.05, 0.5, 12)}
            pos={[0, 0.05, 0]}
            color="#2563EB"
            opacity={0.88}
            roughness={0.3}
          />
          <Part
            geo={G.cyl(0.052, 0.054, 0.14, 12)}
            pos={[0, -0.14, 0]}
            color="#1E293B"
            roughness={0.7}
          />
          <Part
            geo={G.cone(0.053, 0.14, 12)}
            pos={[0, -0.28, 0]}
            rot={[Math.PI, 0, 0]}
            color="#CBD5E1"
            roughness={0.25}
            metalness={0.6}
          />
          <Part
            geo={G.cyl(0.032, 0.032, 0.06, 10)}
            pos={[0, 0.33, 0]}
            color="#E2E8F0"
            roughness={0.3}
            metalness={0.5}
          />
          <Part
            geo={G.box(0.014, 0.22, 0.02, 0.005)}
            pos={[0.054, 0.15, 0]}
            color="#E2E8F0"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "receipt":
      return (
        <group rotation={[0.18, 0.15, -0.35]}>
          <Part
            geo={G.box(0.22, 0.8, 0.012, 0.004)}
            color="#F8FAFC"
            roughness={0.9}
          />
          {[0.3, 0.22, 0.14, 0.06, -0.02, -0.1].map((y, i) => (
            <Part
              key={y}
              geo={G.box(0.12 + (i % 3) * 0.03, 0.012, 0.004, 0.001)}
              pos={[-0.02 - (i % 3) * 0.015, y, 0.008]}
              basic
              color="#475569"
            />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Part
              key={i}
              geo={G.box(0.008 + (i % 2) * 0.01, 0.07, 0.004, 0.001)}
              pos={[-0.075 + i * 0.025, -0.28, 0.008]}
              basic
              color="#1E293B"
            />
          ))}
          {/* fette Summenzeile */}
          <Part geo={G.box(0.17, 0.028, 0.004, 0.001)} pos={[0, -0.18, 0.008]} basic color="#111827" />
          {/* oberes Ende eingerollt (typisch Kassenbon) */}
          <Part
            geo={G.cyl(0.05, 0.05, 0.22, 12, true, 0, Math.PI * 1.6)}
            pos={[0, 0.42, 0.045]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#F1F5F9"
            roughness={0.9}
          />
        </group>
      );

    case "razor":
      // Einwegrasierer: blauer Griff, weißer Kopf quer darauf und ein breites,
      // gut sichtbares Klingenband (schwarz mit Silberstreifen) – ohne Rillen
      // und Kleinteile
      return (
        <group rotation={[0.18, 0.25, -0.38]}>
          <Part geo={G.box(0.12, 0.55, 0.07, 0.03)} pos={[0, -0.1, 0]} color="#3B82F6" roughness={0.45} />
          <Part geo={G.box(0.07, 0.1, 0.05, 0.02)} pos={[0, 0.22, 0]} color="#3B82F6" roughness={0.45} />
          <Part geo={G.box(0.3, 0.1, 0.08, 0.025)} pos={[0, 0.31, 0]} color="#F1F5F9" roughness={0.4} />
          <Part geo={G.box(0.24, 0.04, 0.004, 0.001)} pos={[0, 0.315, 0.041]} color="#0F172A" roughness={0.6} />
          <Part geo={G.box(0.22, 0.012, 0.004, 0.001)} pos={[0, 0.315, 0.0435]} color="#E5E7EB" metalness={0.7} />
        </group>
      );

    case "swab":
      return (
        <group rotation={[0.2, -0.25, 0.2]}>
          {(
            [
              { r: 0, y: 0, tip: "#F8FAFC" },
              { r: 0.5, y: 0.06, tip: "#D6C7A8" },
            ] as { r: number; y: number; tip: string }[]
          ).map((swab) => (
            <group
              key={swab.r}
              position={[0, swab.y, 0]}
              rotation={[0, 0, swab.r + Math.PI / 2]}
            >
              <Part
                geo={G.cyl(0.022, 0.022, 0.62, 8)}
                color="#F1F5F9"
                roughness={0.9}
              />
              {[0.31, -0.31].map((y) => (
                <Part
                  key={y}
                  geo={G.ball(0.06, 10, 8)}
                  pos={[0, y, 0]}
                  scale={[1, 1.5, 1]}
                  color={y > 0 ? swab.tip : "#F8FAFC"}
                  roughness={1}
                />
              ))}
            </group>
          ))}
        </group>
      );

    case "underwear": {
      // Slip: breiter Bund oben, tiefe Beinausschnitte, schmaler Steg unten –
      // kräftiges Blau mit weißen Punkten, damit man es nicht für ein Schild hält
      const slip = [
        -0.3, 0.2, 0.3, 0.2, 0.31, 0.1, 0.22, 0.04, 0.14, -0.04, 0.09, -0.13, 0.075, -0.24, -0.075, -0.24, -0.09,
        -0.13, -0.14, -0.04, -0.22, 0.04, -0.31, 0.1,
      ];
      return (
        <group rotation={[0.2, -0.2, 0.08]}>
          <Part geo={G.poly(0.05, 0.015, slip)} color="#3B82F6" roughness={1} />
          {(
            [
              [-0.18, 0.1],
              [0.0, 0.08],
              [0.18, 0.1],
              [-0.08, -0.02],
              [0.08, -0.02],
              [0.0, -0.13],
            ] as [number, number][]
          ).map(([x, y]) => (
            <Part key={`${x}${y}`} geo={G.circle(0.022, 10)} pos={[x, y, 0.042]} basic color="#FFFFFF" />
          ))}
          {/* Gummibund */}
          <Part geo={G.box(0.64, 0.075, 0.095, 0.02)} pos={[0, 0.215, 0]} color="#F1F5F9" roughness={1} />
        </group>
      );
    }

    case "litter":
      return (
        <group rotation={[0.2, 0.25, -0.12]}>
          {(
            [
              [-0.18, -0.05, 0.04, 0.11],
              [0.02, -0.06, 0.1, 0.13],
              [0.2, -0.04, -0.02, 0.1],
              [-0.04, 0.07, 0, 0.11],
              [0.1, 0.06, 0.08, 0.09],
              [-0.12, 0.05, 0.12, 0.08],
            ] as number[][]
          ).map(([x, y, z, r], i) => (
            <Part
              key={i}
              geo={G.crumple(r, 0.25, i + 1, 1)}
              pos={[x, y, z]}
              flat
              color={["#A8A29E", "#8D857C", "#78716C"][i % 3]}
              roughness={1}
            />
          ))}
          {/* verklumpte Streu */}
          <Part
            geo={G.crumple(0.11, 0.3, 8, 1)}
            pos={[0.02, 0.17, 0.04]}
            flat
            color="#6B5B4B"
            roughness={1}
          />
          {(
            [
              [-0.26, -0.1, 0.12],
              [0.3, -0.08, 0.1],
              [0.12, -0.1, 0.2],
              [-0.08, -0.1, 0.22],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.03, 0.3, i + 20, 0)}
              pos={p}
              flat
              color="#A8A29E"
              roughness={1}
            />
          ))}
          {/* Streuschaufel mit Gitter (das kennt jeder vom Katzenklo) */}
          <group position={[0.24, -0.12, 0.12]} rotation={[0.9, -0.5, 0]}>
            <Part geo={G.box(0.2, 0.014, 0.16, 0.005)} color="#64748B" roughness={0.6} />
            <Part geo={G.box(0.05, 0.014, 0.2, 0.005)} pos={[0, 0, -0.17]} color="#475569" roughness={0.6} />
            {[-0.05, 0, 0.05].map((x) => (
              <Part key={x} geo={G.box(0.022, 0.012, 0.12, 0.002)} pos={[x, 0.003, 0.01]} color="#1E293B" roughness={1} />
            ))}
          </group>
        </group>
      );

    case "diaper": {
      // Windel offen in Sanduhr-Form: weiß, blaue Klebelaschen oben, bunter
      // Aufdruck vorn (vorher eine Rolle wie Küchenrolle/Tapete)
      const hourglass = [
        -0.22, 0.25, 0.22, 0.25, 0.2, 0.12, 0.12, 0.0, 0.12, -0.12, 0.2, -0.25, -0.2, -0.25, -0.12, -0.12, -0.12,
        0.0, -0.2, 0.12,
      ];
      return (
        <group rotation={[0.25, 0.25, -0.08]}>
          <Part geo={G.poly(0.04, 0.012, hourglass)} color="#F8FAFC" roughness={1} />
          {/* saugfähiges Polster in der Mitte, leicht gewölbt */}
          <Part geo={G.box(0.16, 0.36, 0.03, 0.012)} pos={[0, 0, 0.026]} color="#E2E8F0" roughness={1} />
          {[-1, 1].map((sg) => (
            <Part
              key={sg}
              geo={G.box(0.1, 0.07, 0.02, 0.008)}
              pos={[sg * 0.26, 0.2, 0.01]}
              color="#60A5FA"
              roughness={0.8}
            />
          ))}
          {(
            [
              [-0.04, -0.08, "#F59E0B"],
              [0.04, -0.12, "#34D399"],
              [0.0, -0.04, "#F472B6"],
            ] as [number, number, string][]
          ).map(([x, y, col]) => (
            <Part key={`${x}${y}`} geo={G.circle(0.025, 10)} pos={[x, y, 0.044]} basic color={col} />
          ))}
        </group>
      );
    }

    case "toothbrush":
      return (
        <group rotation={[0.2, 0.4, -0.35]}>
          <Part
            geo={G.box(0.07, 0.62, 0.045, 0.02)}
            pos={[0, -0.08, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.085, 0.2, 0.05, 0.02)}
            pos={[0, -0.17, 0.003]}
            color="#E2E8F0"
            roughness={0.6}
          />
          <Part
            geo={G.box(0.05, 0.1, 0.035, 0.015)}
            pos={[0, 0.28, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.11, 0.2, 0.04, 0.02)}
            pos={[0, 0.4, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          {[0.34, 0.4, 0.46].flatMap((y, row) =>
            [-0.03, 0.03].map((x, col) => (
              <Part
                key={`${y}:${x}`}
                geo={G.cyl(0.014, 0.012, 0.08, 6)}
                pos={[x, y, 0.055]}
                rot={[Math.PI / 2, 0, (row + col) % 2 ? 0.2 : -0.15]}
                color={(row + col) % 3 === 0 ? "#CBD5E1" : "#F8FAFC"}
                roughness={0.9}
              />
            )),
          )}
        </group>
      );

    case "wrap": {
      // Mit Folie (Restmüll): pink-metallische Folie mit goldenen Sternen und
      // Glanz (silbern sah aus wie Alufolie). Ohne Folie (Papier): mattes
      // rotes Papier, Schleife aus Papierband.
      const foil = name.includes("mit folie");
      const roll = foil ? "#E879B9" : "#C0392B";
      const sheet = foil ? "#F09ACB" : "#D9473A";
      const ribbon = foil ? "#F5C542" : "#EADBC0";
      const metal = foil ? 0.6 : 0;
      return (
        <group rotation={[0.25, -0.18, 0.1]}>
          {/* Papierrolle (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.13, 0.13, 0.62, 22)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            color={roll}
            roughness={foil ? 0.3 : 0.95}
            metalness={metal}
          />
          <Part
            geo={G.cyl(0.045, 0.045, 0.66, 10, true)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#B08B5B"
            roughness={1}
          />
          {[-0.2, 0.2].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.132, 0.01, 5, 22)}
              pos={[x, 0.02, 0]}
              rot={[0, Math.PI / 2, 0]}
              color={ribbon}
              roughness={0.6}
              metalness={metal}
            />
          ))}
          {foil && (
            <Part
              geo={G.box(0.5, 0.02, 0.004, 0.001)}
              pos={[0, 0.1, 0.104]}
              rot={[-0.66, 0, 0]}
              basic
              noDepthWrite
              color="#FFFFFF"
              opacity={0.75}
            />
          )}
          {/* abgerollte Bahn mit Mustern */}
          <group position={[0, -0.105, 0.21]} rotation={[-1.45, 0, 0]}>
            <Part
              geo={G.wave(0.62, 0.42, 0.012, 9, 1)}
              double
              color={sheet}
              roughness={foil ? 0.3 : 0.95}
              metalness={metal}
            />
            {(
              [
                [-0.2, 0.1],
                [0.05, -0.05],
                [0.22, 0.12],
                [-0.1, -0.12],
                [0.2, -0.14],
              ] as [number, number][]
            ).map(([x, y], i) => (
              <Part
                key={i}
                geo={foil ? G.poly(0.002, 0, STAR) : G.circle(0.025, 10)}
                pos={[x, y, 0.03]}
                basic
                color={foil ? "#F59E0B" : "#FFFFFF"}
              />
            ))}
          </group>
          {/* Schleife */}
          <Part
            geo={G.cyl(0.134, 0.134, 0.05, 22, true)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color={ribbon}
            roughness={0.6}
            metalness={metal}
          />
          <group position={[0, 0.17, 0.02]}>
            {[-1, 1].map((sg) => (
              <Part
                key={sg}
                geo={G.ball(0.06, 10, 8)}
                pos={[sg * 0.08, 0.03, 0]}
                rot={[0, 0, sg * 0.5]}
                scale={[1.4, 0.8, 0.5]}
                color={ribbon}
                roughness={0.6}
                metalness={metal}
              />
            ))}
            <Part
              geo={G.ball(0.035, 10, 8)}
              color={ribbon}
              roughness={0.6}
              metalness={metal}
            />
            {/* Bänder nach vorn über die Rolle gelegt (steckten vorher in ihr);
                beim Papier hängt an einem ein Anhänger */}
            {[-1, 1].map((sg) => (
              <Part
                key={`t${sg}`}
                geo={G.box(0.035, 0.11, 0.01, 0.004)}
                pos={[sg * 0.04, -0.05, 0.078]}
                rot={[-0.6, 0, sg * 0.35]}
                color={ribbon}
                roughness={0.6}
                metalness={metal}
              />
            ))}
            {!foil && (
              <group position={[0.07, -0.125, 0.12]} rotation={[0, 0, 0.35]}>
                <Part geo={G.box(0.07, 0.05, 0.006, 0.002)} color="#FFFFFF" roughness={0.9} />
                <Part geo={G.circle(0.007, 10)} pos={[0, 0.015, 0.0045]} basic color="#6B4F2E" />
              </group>
            )}
          </group>
          {foil &&
            [-0.12, 0.14].map((x) => (
              <Part
                key={`shine${x}`}
                geo={G.box(0.07, 0.02, 0.008, 0.003)}
                pos={[x, 0.12, 0.09]}
                rot={[0.9, 0, 0]}
                basic
                noDepthWrite
                color="#FFFFFF"
                opacity={0.6}
              />
            ))}
        </group>
      );
    }

    case "mirror":
      // Zerbrochener Spiegel: Goldrahmen mit silbernen Scherben, dunkle
      // Sprünge, eine Scherbe fällt heraus – silbern, nicht glasblau
      return (
        <group rotation={[0.25, -0.2, 0.1]}>
          {/* Rahmen */}
          {(
            [
              [0, 0.27, 0.74, 0.06],
              [0, -0.27, 0.74, 0.06],
              [-0.34, 0, 0.06, 0.6],
              [0.34, 0, 0.06, 0.6],
            ] as [number, number, number, number][]
          ).map(([x, y, w, h], i) => (
            <Part key={i} geo={G.box(w, h, 0.05, 0.015)} pos={[x, y, 0]} color="#B8862B" roughness={0.6} />
          ))}
          {MIRROR_SHARDS.slice(0, -1).map((shard, i) => (
            // Gespreizt und größer, damit die Scherben die Rahmenöffnung füllen
            <group
              key={i}
              position={[shard.pos[0] * 1.6, shard.pos[1] * 1.6, -0.005]}
              rotation={[0, 0, shard.rot[2]]}
              scale={1.3}
            >
              <Part geo={G.poly(0.012, 0, shard.pts)} color="#D7DEE6" roughness={0.1} metalness={0.6} />
            </group>
          ))}
          {/* herausgefallene Scherbe vorn */}
          {MIRROR_SHARDS.slice(-1).map((shard, i) => (
            <group key={`out${i}`} position={[0.16, -0.33, 0.08]} rotation={[0.6, 0.3, 0.4]} scale={0.9}>
              <Part geo={G.poly(0.012, 0, shard.pts)} color="#D7DEE6" roughness={0.1} metalness={0.6} />
            </group>
          ))}
          {/* Sprünge und Glanz */}
          {(
            [
              [-0.05, 0.05, 0.35, 0.7],
              [0.08, -0.04, 0.3, -0.5],
              [-0.12, -0.08, 0.22, 0.2],
            ] as [number, number, number, number][]
          ).map(([x, y, l, r], i) => (
            <Part key={`c${i}`} geo={G.box(l, 0.008, 0.004, 0.001)} pos={[x, y, 0.012]} rot={[0, 0, r]} basic color="#475569" />
          ))}
          <Part
            geo={G.box(0.04, 0.24, 0.004, 0.001)}
            pos={[-0.15, 0.04, 0.014]}
            rot={[0, 0, -0.5]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.7}
          />
        </group>
      );

    case "pizza":
      // Zur Kamera gekippt, mit Pizzarest im Karton (sonst wie Papier-Karton)
      return (
        <group rotation={[0.55, -0.22, 0.08]}>
          {/* übrig gebliebenes Pizzastück: Teig, Rand, Salami */}
          <group position={[0.06, 0.05, 0.08]} rotation={[-Math.PI / 2, 0, 0.5]} scale={[1.15, 1.15, 1]}>
            <Part geo={G.poly(0.02, 0.004, [0, 0.16, -0.11, -0.12, 0.11, -0.12])} color="#F2C14E" roughness={0.9} />
            <Part geo={G.box(0.24, 0.035, 0.035, 0.012)} pos={[0, -0.12, 0.01]} color="#C98A3E" roughness={0.9} />
            {(
              [
                [0, 0.03],
                [-0.04, -0.06],
                [0.05, -0.05],
              ] as [number, number][]
            ).map(([x, y], i) => (
              <Part key={i} geo={G.circle(0.03, 12)} pos={[x, y, 0.016]} basic color="#B91C1C" />
            ))}
          </group>
          <Part
            geo={G.box(0.66, 0.07, 0.66, 0.02)}
            color="#C99A5B"
            roughness={0.95}
          />
          {(
            [
              [0.1, 0.0, 0.2],
              [-0.15, 0.1, 0.12],
              [0.18, -0.12, 0.09],
            ] as number[][]
          ).map(([x, z, r], i) => (
            <Part
              key={i}
              geo={G.circle(r, 16)}
              pos={[x, 0.036, z]}
              rot={[-Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.55}
            />
          ))}
          {/* aufgeklappter Deckel */}
          <group position={[0, 0.04, -0.33]} rotation={[-1.0, 0, 0]}>
            <Part
              geo={G.box(0.66, 0.025, 0.66, 0.012)}
              pos={[0, 0, 0.33]}
              color="#D6AC6C"
              roughness={0.95}
            />
            <Part
              geo={G.circle(0.15, 16)}
              pos={[-0.1, -0.014, 0.3]}
              rot={[Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.55}
            />
            <Part
              geo={G.circle(0.09, 14)}
              pos={[0.15, -0.014, 0.45]}
              rot={[Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.5}
            />
          </group>
        </group>
      );

    case "cd":
      // Zur Kamera gekippt – flach liegend sähe man nur einen Strich
      return (
        <group rotation={[1.0, -0.15, 0.12]}>
          <Part
            geo={G.cyl(0.3, 0.3, 0.02, 36)}
            color="#D5DCE6"
            roughness={0.15}
            metalness={0.6}
          />
          {(
            [
              [0.12, 0.2, "#22D3EE", 0.35],
              [0.2, 0.26, "#E879F9", 0.3],
              [0.26, 0.295, "#FDE047", 0.3],
            ] as [number, number, string, number][]
          ).map(([ri, ro, c, o]) => (
            <Part
              key={ri}
              geo={G.ring(ri, ro, 32)}
              pos={[0, 0.0105, 0]}
              rot={[-Math.PI / 2, 0, 0]}
              basic
              color={c}
              opacity={o}
            />
          ))}
          <Part
            geo={G.ring(0.04, 0.11, 24)}
            pos={[0, 0.0108, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            basic
            color="#F8FAFC"
            opacity={0.7}
          />
          <Part
            geo={G.circle(0.04, 16)}
            pos={[0, 0.011, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            basic
            color="#08111E"
          />
          {[0.3, 1.2, 2.2].map((a) => (
            <Part
              key={a}
              geo={G.box(0.2, 0.002, 0.004, 0.001)}
              pos={[Math.cos(a) * 0.1, 0.012, Math.sin(a) * 0.1]}
              rot={[0, -a, 0]}
              basic
              color="#475569"
              opacity={0.5}
            />
          ))}
        </group>
      );

    case "wallpaper":
      // Abgerissene Altbau-Tapete (beige mit Muster, statt bunter Rolle wie
      // Geschenkpapier): zwei fast flache Bahnen, an einer Kante haftet grauer
      // Putz, Kleisterfleck und Krümel liegen AUF der vorderen Bahn
      return (
        <group rotation={[0.35, -0.2, 0.08]}>
          {(
            [
              [-0.06, 0.07, 0, 0.12],
              [0.08, -0.07, 0.03, -0.25],
            ] as [number, number, number, number][]
          ).map(([x, y, z, r], i) => (
            <group key={i} position={[x, y, z]} rotation={[0, 0, r]}>
              {/* kaum gewellt (±0,012), damit Muster und Putz aufliegen */}
              <Part geo={G.wave(0.62, 0.22, 0.006, 7, i + 2)} double color="#EDE3CF" roughness={1} />
              {[-0.2, -0.07, 0.06, 0.19].map((sx) => (
                <Part key={sx} geo={G.box(0.025, 0.2, 0.004, 0.001)} pos={[sx, 0, 0.016]} basic color="#B9A27A" />
              ))}
              {/* Putz an der oberen Abrisskante */}
              <Part geo={G.box(0.6, 0.04, 0.02, 0.008)} pos={[0, 0.11, 0.008]} color="#BDB7AD" roughness={1} />
              {i === 1 && (
                <>
                  <Part geo={G.circle(0.05, 10)} pos={[-0.13, -0.02, 0.014]} basic color="#F4ECD2" />
                  {(
                    [
                      [0.12, -0.05],
                      [0.2, 0.02],
                      [-0.02, -0.07],
                    ] as [number, number][]
                  ).map(([cx, cy], k) => (
                    <Part
                      key={k}
                      geo={G.crumple(0.022, 0.3, 30 + k, 0)}
                      pos={[cx, cy, 0.022]}
                      flat
                      color="#CFCAC0"
                      roughness={1}
                    />
                  ))}
                </>
              )}
            </group>
          ))}
        </group>
      );

    default:
      return (
        <group rotation={[0.2, 0.3, -0.12]}>
          <Part
            geo={G.dodeca(0.28)}
            color="#94A3B8"
            roughness={0.7}
            metalness={0.15}
          />
        </group>
      );
  }
}
