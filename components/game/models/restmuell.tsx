// Datei: components/game/models/restmuell.tsx
// Modelle: Restmüll (inkl. Fallback-Modell)

import {
  G,
  Part,
  STRIP_POINTS,
  MIRROR_SHARDS,
} from "./shared";
import { type V3 } from "./shared";

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
          <Part
            geo={G.cyl(0.048, 0.046, 0.18, 12)}
            pos={[0, 0.14, 0]}
            color="#F1EBDD"
            roughness={0.95}
          />
          <Part
            geo={G.crumple(0.05, 0.3, 4, 1)}
            pos={[0, 0.25, 0]}
            scale={[1, 0.6, 1]}
            flat
            color="#3F3F46"
            roughness={1}
          />
        </group>
      );

    case "dish":
      return (
        <group rotation={[0.22, -0.25, 0.18]}>
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
                color="#F8FAFC"
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
      return (
        <group rotation={[0.15, 0.25, -0.12]}>
          <Part
            geo={G.box(0.5, 0.62, 0.12, 0.04)}
            color="#E5E7EB"
            roughness={1}
          />
          <Part
            geo={G.box(0.5, 0.3, 0.125, 0.04)}
            pos={[0, -0.16, 0]}
            color="#9CA3AF"
            roughness={1}
          />
          <Part
            geo={G.box(0.34, 0.14, 0.02, 0.01)}
            pos={[0, 0.18, 0.07]}
            color="#B08B5B"
            roughness={0.95}
          />
          <Part
            geo={G.circle(0.045, 16)}
            pos={[0, 0.18, 0.082]}
            basic
            color="#1F2937"
          />
          {[-0.12, 0.12].map((x, i) => (
            <Part
              key={x}
              geo={G.box(0.01, 0.4, 0.125, 0.003)}
              pos={[x, -0.02, 0]}
              rot={[0, 0, i ? 0.1 : -0.1]}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
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
        </group>
      );

    case "razor":
      return (
        <group rotation={[0.18, 0.25, -0.38]}>
          <Part
            geo={G.box(0.12, 0.55, 0.07, 0.03)}
            pos={[0, -0.1, 0]}
            color="#3B82F6"
            roughness={0.45}
          />
          {[-0.32, -0.25, -0.18, -0.11].map((y) => (
            <Part
              key={y}
              geo={G.box(0.125, 0.015, 0.075, 0.005)}
              pos={[0, y, 0]}
              color="#1D4ED8"
              roughness={0.5}
            />
          ))}
          <Part
            geo={G.box(0.07, 0.1, 0.05, 0.02)}
            pos={[0, 0.22, 0]}
            color="#3B82F6"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.3, 0.1, 0.08, 0.025)}
            pos={[0, 0.31, 0]}
            color="#F1F5F9"
            roughness={0.4}
          />
          <Part
            geo={G.box(0.26, 0.018, 0.082, 0.005)}
            pos={[0, 0.285, 0]}
            color="#22C55E"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.26, 0.02, 0.083, 0.005)}
            pos={[0, 0.325, 0]}
            color="#0F172A"
            roughness={0.6}
          />
          <Part
            geo={G.box(0.25, 0.006, 0.084, 0.002)}
            pos={[0, 0.337, 0]}
            color="#E2E8F0"
            roughness={0.25}
            metalness={0.6}
          />
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
        </group>
      );

    case "diaper":
      return (
        <group rotation={[0.15, 0.22, -0.12]}>
          {/* zusammengerollte Windel (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.16, 0.16, 0.52, 22)}
            rot={[0, 0, Math.PI / 2]}
            color="#F8FAFC"
            roughness={1}
          />
          {[-0.26, 0.26].map((x) => (
            <group key={x}>
              <Part
                geo={G.torus(0.16, 0.045, 6, 22)}
                pos={[x, 0, 0]}
                rot={[0, Math.PI / 2, 0]}
                color="#E8EEF4"
                roughness={1}
              />
              <Part
                geo={G.torus(0.09, 0.022, 6, 18)}
                pos={[x * 1.04, 0, 0]}
                rot={[0, Math.PI / 2, 0]}
                color="#DDE5ED"
                roughness={1}
              />
            </group>
          ))}
          {/* Klebeband mit Verschlussfläche */}
          <Part
            geo={G.cyl(0.166, 0.166, 0.1, 22, true)}
            pos={[0.06, 0, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#7DD3FC"
            roughness={0.8}
          />
          <Part
            geo={G.box(0.1, 0.02, 0.07, 0.008)}
            pos={[0.06, 0.168, 0]}
            color="#F8FAFC"
            roughness={0.9}
          />
          {/* Aufdruck */}
          {(
            [
              [-0.2, 0.04],
              [-0.12, -0.04],
              [-0.04, 0.04],
              [0.2, -0.03],
              [0.18, 0.06],
            ] as [number, number][]
          ).map(([x, y], i) => (
            <Part
              key={i}
              geo={G.circle(0.025, 10)}
              pos={[x, y, 0.162]}
              basic
              color="#93C5FD"
            />
          ))}
          <Part
            geo={G.circle(0.06, 14)}
            pos={[-0.16, -0.1, 0.152]}
            basic
            color="#C9A227"
            opacity={0.22}
          />
        </group>
      );

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
      // Mit Folie (Restmüll): silbern glänzend wie Metallfolie. Ohne Folie
      // (Papier): mattes rotes Papier, Schleife aus Papierband.
      const foil = name.includes("mit folie");
      const roll = foil ? "#C9D1DC" : "#C0392B";
      const sheet = foil ? "#DCE3EB" : "#D9473A";
      const ribbon = foil ? "#E5C9F5" : "#EADBC0";
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
                geo={G.circle(0.025, 10)}
                pos={[x, y, 0.03]}
                basic
                color={foil ? ["#F472B6", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA"][i % 5] : "#FFFFFF"}
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
            {[-1, 1].map((sg) => (
              <Part
                key={`t${sg}`}
                geo={G.box(0.035, 0.17, 0.01, 0.004)}
                pos={[sg * 0.04, -0.08, 0.02]}
                rot={[0, 0, sg * 0.35]}
                color={ribbon}
                roughness={0.6}
                metalness={metal}
              />
            ))}
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
      return (
        <group rotation={[0.2, -0.2, 0.12]}>
          {MIRROR_SHARDS.map((shard, i) => (
            <group key={i} position={shard.pos} rotation={shard.rot}>
              <Part
                geo={G.poly(0.015, 0.003, shard.pts)}
                color="#BFE3FF"
                roughness={0.08}
                metalness={0.6}
              />
            </group>
          ))}
          <Part
            geo={G.box(0.3, 0.04, 0.035, 0.012)}
            pos={[-0.2, -0.28, 0]}
            rot={[0, 0, 0.5]}
            color="#7C4A25"
            roughness={0.8}
          />
        </group>
      );

    case "pizza":
      return (
        <group rotation={[0.1, -0.22, 0.08]}>
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
      return (
        <group rotation={[0.2, -0.15, 0.12]}>
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
      return (
        <group rotation={[0.16, -0.18, 0.1]}>
          {/* Rolle (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.14, 0.14, 0.7, 20)}
            rot={[0, 0, Math.PI / 2]}
            color="#E9D5FF"
            roughness={0.85}
          />
          {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.142, 0.006, 4, 20)}
              pos={[x, 0, 0]}
              rot={[0, Math.PI / 2, 0]}
              color="#A855F7"
              roughness={0.9}
            />
          ))}
          <Part
            geo={G.cyl(0.05, 0.05, 0.74, 10, true)}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#B08B5B"
            roughness={1}
          />
          {/* abgerollte Bahn mit Streifenmuster */}
          <Part
            geo={G.box(0.7, 0.012, 0.38, 0.004)}
            pos={[0, -0.135, 0.22]}
            color="#F3E8FF"
            roughness={0.9}
          />
          {[-0.27, -0.09, 0.09, 0.27].map((x) => (
            <Part
              key={x}
              geo={G.box(0.05, 0.004, 0.38, 0.001)}
              pos={[x, -0.127, 0.22]}
              color="#C084FC"
              roughness={0.9}
            />
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
