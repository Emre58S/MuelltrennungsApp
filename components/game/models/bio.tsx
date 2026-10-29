// Datei: components/game/models/bio.tsx
// Modelle: Biomüll

import { G, Part, LEAF_POINTS } from "./shared";
import { type V3 } from "./shared";

export function renderBioModel(key: string, name: string) {
  switch (key) {
    case "banana":
      return (
        <group rotation={[0.15, 0.2, -0.15]} scale={0.85}>
          {/* Stielansatz und Mitte */}
          <Part
            geo={G.cyl(0.045, 0.06, 0.16, 10)}
            pos={[0, 0.34, 0]}
            rot={[0, 0, 0.1]}
            color="#6B4A22"
            roughness={1}
          />
          <Part
            geo={G.ball(0.1, 12, 8)}
            pos={[0, 0.2, 0]}
            scale={[1.1, 0.8, 0.5]}
            color="#EAB308"
            roughness={0.8}
          />
          {/* drei aufgeklappte Schalenlappen */}
          {[-1.0, 0, 1.0].map((a, i) => {
            const len = i === 1 ? 0.54 : 0.48;
            const dx = Math.sin(a);
            const dy = -Math.cos(a);
            const dist = len / 2 + 0.04;
            const cx = dx * dist;
            const cy = 0.2 + dy * dist;
            const sy = len / 0.2;
            const tip = len + 0.04;
            const spot = 0.04 + len * 0.6;

            return (
              <group key={i}>
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.95, sy, 0.12]}
                  color="#F2C811"
                  roughness={0.8}
                />
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0.028]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.62, sy * 0.88, 0.12]}
                  color="#FDE9A9"
                  roughness={0.9}
                />
                <Part
                  geo={G.ball(0.035, 8, 6)}
                  pos={[dx * tip, 0.2 + dy * tip, 0]}
                  color="#4A3216"
                  roughness={1}
                />
                <Part
                  geo={G.circle(0.02, 10)}
                  pos={[
                    dx * spot - dy * 0.025,
                    0.2 + dy * spot + dx * 0.025,
                    0.046,
                  ]}
                  basic
                  color="#8A5A2B"
                  opacity={0.6}
                />
              </group>
            );
          })}
        </group>
      );

    case "coffee":
      if (name.includes("kaffeesatz")) {
        // Kaffeesatz: festgepresster Espresso-Puck (dunkel, mit Riss und
        // hellerem Rand) mit losen Krümeln und zwei Kaffeebohnen daneben
        return (
          <group rotation={[0.6, 0.3, 0]}>
            <Part geo={G.cyl(0.17, 0.16, 0.08, 22)} color="#3B2418" roughness={1} />
            <Part geo={G.ring(0.14, 0.166, 22)} pos={[0, 0.041, 0]} rot={[-Math.PI / 2, 0, 0]} basic color="#5A3A26" />
            <Part geo={G.box(0.16, 0.004, 0.012, 0.001)} pos={[0.02, 0.042, 0.03]} rot={[0, 0.5, 0]} basic color="#1E120B" />
            {(
              [
                [0.19, -0.015, 0.06],
                [0.18, -0.015, -0.06],
                [-0.18, -0.015, 0.08],
              ] as V3[]
            ).map((p, i) => (
              <Part key={i} geo={G.crumple(0.025, 0.3, 40 + i, 0)} pos={p} flat color="#4A2E1E" roughness={1} />
            ))}
            {(
              [
                [-0.12, 0.0, 0.19, 0.4],
                [0.05, 0.0, 0.23, -0.5],
              ] as [number, number, number, number][]
            ).map(([x, y, z, r]) => (
              <group key={x} position={[x, y - 0.015, z]} rotation={[0, r, 0]}>
                <Part geo={G.ball(0.045, 10, 8)} scale={[1, 0.6, 1.35]} color="#7A4A26" roughness={0.7} />
                <Part geo={G.box(0.006, 0.004, 0.04, 0.001)} pos={[0, 0.021, 0]} basic color="#2A170B" />
              </group>
            ))}
          </group>
        );
      }
      return (
        <group rotation={[0.15, 0.35, -0.1]}>
          {/* Kaffeefilter */}
          <Part
            geo={G.lathe(20, [0.02, -0.22, 0.2, 0.12, 0.26, 0.2])}
            double
            color="#E7D8B8"
            roughness={1}
          />
          <Part
            geo={G.torus(0.26, 0.012, 6, 20)}
            pos={[0, 0.2, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#D6C7A4"
            roughness={1}
          />
          {/* Kaffeesatz */}
          <Part
            geo={G.crumple(0.16, 0.18, 3, 1)}
            pos={[0, 0.1, 0]}
            scale={[1, 0.55, 1]}
            flat
            color="#3B2418"
            roughness={1}
          />
        </group>
      );

    case "eggshell":
      // Eierschalen: außen hellbraun, innen weiß, gezackter Bruchrand
      return (
        <group rotation={[0.5, -0.25, 0.12]}>
          {(
            [
              [-0.13, 0, 0, 0.2, 0.2],
              [0.15, -0.03, 0.06, -0.3, 0.17],
            ] as [number, number, number, number, number][]
          ).map(([x, y, z, rz, r], i) => (
            <group key={i} position={[x, y, z]} rotation={[Math.PI, 0, rz]}>
              <Part geo={G.ball(r, 9, 5, 0, Math.PI * 0.5)} double flat color="#E3B98A" roughness={0.9} />
              <Part geo={G.ball(r * 0.93, 9, 5, 0, Math.PI * 0.5)} double flat color="#FFF8EE" roughness={0.9} />
              {/* Bruchrand: 6 unregelmäßige Zacken, innerhalb der Schale */}
              {[0, 1.1, 2.0, 3.3, 4.2, 5.4].map((a, k) => {
                const h = 0.04 + (k % 3) * 0.01;
                return (
                  <Part
                    key={k}
                    geo={G.cone(0.022, h, 4)}
                    pos={[Math.cos(a) * r * 0.93, -h / 2 + 0.005, Math.sin(a) * r * 0.93]}
                    rot={[Math.PI, 0, 0]}
                    color="#E3B98A"
                    roughness={0.9}
                  />
                );
              })}
            </group>
          ))}
        </group>
      );

    case "peel": {
      if (name.includes("kartoffel")) {
        // Geschälte Kartoffel mit braunen Schalenstreifen und dunklen Augen
        return (
          <group rotation={[0.35, 0.3, -0.2]}>
            <Part geo={G.ball(0.15, 10, 8)} scale={[1.25, 0.9, 1]} pos={[-0.06, 0.02, 0]} color="#EBD58C" roughness={0.9} />
            {(
              [
                [0.09, -0.08, 0.03, 0.4],
                [0.19, 0.06, -0.02, -0.6],
                [-0.24, -0.12, 0.12, 1.2],
              ] as [number, number, number, number][]
            ).map(([x, y, z, r], i) => (
              <group key={i} position={[x, y, z]} rotation={[0.6, r, 0.3]}>
                <Part geo={G.wave(0.26, 0.08, 0.02, 9, i)} double color="#9C6B3F" roughness={1} />
                <Part geo={G.ball(0.02, 5, 4)} pos={[0.04, 0, i === 2 ? 0.02 : 0.04]} color="#4A3020" roughness={1} />
              </group>
            ))}
            {/* Augen auf der Knolle (auf der Oberfläche) */}
            {(
              [
                [-0.06, 0.05, 0.145],
                [0.03, -0.03, 0.13],
              ] as V3[]
            ).map((p, i) => (
              <Part key={i} geo={G.ball(0.02, 5, 4)} pos={p} color="#8A6A2E" roughness={1} />
            ))}
          </group>
        );
      }
      if (name.includes("zwiebel")) {
        // Zwiebelschale: dünne, gebogene Schalenblättchen in Kupfer/Braun
        return (
          <group rotation={[0.4, 0.2, -0.1]}>
            {(
              [
                [-0.1, 0.02, 0, 0.2, 0, 0.18, "#B5651D"],
                [0.1, 0.04, 0.03, -0.5, 0.8, 0.15, "#C98A4B"],
                [0.0, -0.06, 0.04, 0.9, -0.4, 0.13, "#9A4E1F"],
                [0.12, -0.04, -0.02, 1.6, 0.3, 0.1, "#D9A066"],
              ] as [number, number, number, number, number, number, string][]
            ).map(([x, y, z, rx, ry, r, col], i) => (
              <Part
                key={i}
                geo={G.ball(r, 8, 4, 0, 1.0)}
                pos={[x, y, z]}
                rot={[rx, ry, 0]}
                scale={[1, 0.6, 1.4]}
                double
                flat
                color={col}
                roughness={1}
              />
            ))}
          </group>
        );
      }
      const isCarrot = name.includes("karotte");
      const c1 = isCarrot ? "#F97316" : "#C2860A";
      const c2 = isCarrot ? "#FB923C" : "#A16207";
      const c3 = isCarrot ? "#EA580C" : "#D9A441";

      return (
        <group rotation={[0.28, 0.2, -0.3]}>
          <Part
            geo={G.torus(0.23, 0.045, 6, 18, Math.PI * 1.35)}
            scale={[1, 1, 0.5]}
            color={c1}
            roughness={0.9}
          />
          <Part
            geo={G.torus(0.15, 0.035, 6, 14, Math.PI * 1.18)}
            pos={[0.13, 0.08, 0.03]}
            rot={[0.3, -0.3, 0.15]}
            scale={[1, 1, 0.5]}
            color={c2}
            roughness={0.9}
          />
          <Part
            geo={G.torus(0.1, 0.03, 6, 12, Math.PI * 1.5)}
            pos={[-0.12, -0.1, 0.05]}
            rot={[-0.4, 0.3, 0.8]}
            scale={[1, 1, 0.5]}
            color={c3}
            roughness={0.9}
          />
        </group>
      );
    }

    case "teabag":
      return (
        <group rotation={[0.1, 0.28, -0.18]}>
          <Part
            geo={G.box(0.3, 0.34, 0.05, 0.02)}
            color="#D9C29A"
            roughness={0.95}
          />
          <Part
            geo={G.circle(0.075, 14)}
            pos={[0.02, -0.03, 0.027]}
            basic
            color="#7A5230"
            opacity={0.55}
          />
          <Part
            geo={G.box(0.3, 0.035, 0.06, 0.01)}
            pos={[0, 0.185, 0]}
            color="#B89D74"
            roughness={0.95}
          />
          <Part
            geo={G.cyl(0.006, 0.006, 0.3, 6)}
            pos={[0.05, 0.34, 0]}
            rot={[0, 0, 0.15]}
            color="#E5E7EB"
          />
          <Part
            geo={G.box(0.14, 0.11, 0.02, 0.01)}
            pos={[0.1, 0.52, 0]}
            rot={[0, 0, 0.2]}
            color="#22C55E"
          />
        </group>
      );

    case "bread":
      return (
        <group rotation={[0.15, -0.28, 0.08]}>
          <Part
            geo={G.ball(0.3, 20, 14)}
            scale={[1.15, 0.7, 0.8]}
            color="#B86629"
            roughness={0.95}
          />
          {[-0.14, 0, 0.14].map((x) => (
            <Part
              key={x}
              geo={G.box(0.05, 0.03, 0.2, 0.01)}
              pos={[x, 0.2, 0.04]}
              rot={[0.25, 0, 0.5]}
              color="#F2C27A"
              roughness={1}
            />
          ))}
          {/* Schimmelflecken */}
          {(
            [
              [0.2, 0.12, 0.15],
              [-0.22, 0.1, 0.18],
              [0.05, 0.2, -0.1],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.05, 0.3, i + 2, 1)}
              pos={p}
              flat
              color={i === 1 ? "#9CA3AF" : "#7C9A6B"}
              roughness={1}
            />
          ))}
        </group>
      );

    case "leaves":
      return (
        <group rotation={[0.2, -0.25, 0.28]}>
          {(
            [
              { p: [0, 0, 0], r: [-0.9, 0, 0.3], c: "#B45309" },
              { p: [0.14, 0.04, 0.06], r: [-1.0, 0.3, -0.7], c: "#CA8A04" },
              { p: [-0.1, 0.02, -0.08], r: [-0.8, -0.4, 1.5], c: "#9A3412" },
            ] as { p: V3; r: V3; c: string }[]
          ).map((leaf, i) => (
            <group key={i} position={leaf.p} rotation={leaf.r}>
              <Part
                geo={G.poly(0.012, 0.004, LEAF_POINTS)}
                double
                color={leaf.c}
                roughness={1}
              />
              <Part
                geo={G.box(0.012, 0.5, 0.004, 0.002)}
                pos={[0, 0, 0.01]}
                color="#5B2A0A"
                roughness={1}
              />
            </group>
          ))}
        </group>
      );

    case "nut":
      // Zwei offene Walnuss-Halbschalen (außen braun und runzlig, innen hell)
      // – nicht mehr nur braune Knubbel wie die Katzenstreu
      return (
        <group rotation={[0.55, 0.25, -0.12]}>
          {(
            [
              [-0.16, 0, 0, 0.3],
              [0.17, 0.02, 0.04, -0.4],
            ] as [number, number, number, number][]
          ).map(([x, y, z, tilt], i) => (
            <group key={i} position={[x, y, z]} rotation={[Math.PI + tilt, i * 0.8, 0]}>
              {/* Schale (Halbkugel, Öffnung nach oben) */}
              <Part geo={G.ball(0.15, 8, 5, 0, Math.PI / 2)} double flat color="#8B5A2B" roughness={1} />
              {/* Runzeln außen (typisch Walnuss) */}
              {(
                [
                  [0.05, 0.141],
                  [0.1, 0.112],
                ] as [number, number][]
              ).map(([y, rr]) => (
                <Part
                  key={y}
                  geo={G.torus(rr, 0.012, 4, 14)}
                  pos={[0, y, 0]}
                  rot={[Math.PI / 2, 0, 0]}
                  color="#6B4423"
                  roughness={1}
                />
              ))}
              {/* knubbeliger Rand (von der Kamera aus sichtbar) */}
              {[0.3, 1.5, 2.6, 3.8, 5.0].map((a) => (
                <Part
                  key={a}
                  geo={G.ball(0.022, 5, 4)}
                  pos={[Math.cos(a) * 0.145, 0.005, Math.sin(a) * 0.145]}
                  color="#5C3A1E"
                  roughness={1}
                />
              ))}
              {/* helle Innenseite */}
              <Part geo={G.ball(0.12, 8, 5, 0, Math.PI / 2)} double flat color="#D9B98C" roughness={1} />
              {/* Naht am Rand */}
              <Part
                geo={G.torus(0.145, 0.014, 4, 14)}
                rot={[Math.PI / 2, 0, 0]}
                color="#6B4423"
                roughness={1}
              />
            </group>
          ))}
          <Part
            geo={G.crumple(0.05, 0.3, 9, 0)}
            pos={[0, -0.12, 0.16]}
            flat
            color="#C9A26B"
            roughness={1}
          />
        </group>
      );

    case "corn":
      return (
        <group rotation={[0.1, 0.25, -0.35]}>
          {/* Körner (unten) */}
          <Part
            geo={G.cyl(0.13, 0.14, 0.3, 14)}
            pos={[0, -0.13, 0]}
            flat
            color="#F5CB3D"
            roughness={0.75}
          />
          {[-0.22, -0.14, -0.06].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.136, 0.011, 5, 14)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#C99A12"
              roughness={0.9}
            />
          ))}
          {/* abgenagter Kolben (oben) */}
          <Part
            geo={G.cyl(0.11, 0.13, 0.28, 12)}
            pos={[0, 0.16, 0]}
            flat
            color="#EBD9A0"
            roughness={0.9}
          />
          {/* Lieschblätter */}
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[0.1, -0.3, 0.02]}
            rot={[0, 0, -0.3]}
            scale={[0.6, 2.2, 0.25]}
            color="#65A30D"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[-0.09, -0.3, -0.03]}
            rot={[0, 0, 0.35]}
            scale={[0.6, 2.0, 0.25]}
            color="#84CC16"
            roughness={0.9}
          />
          <Part
            geo={G.cyl(0.03, 0.04, 0.08, 8)}
            pos={[0, -0.34, 0]}
            color="#7C5A2E"
            roughness={1}
          />
        </group>
      );

    case "apple":
      return (
        <group rotation={[0.1, 0.2, 0.1]}>
          <Part
            geo={G.lathe(
              16,
              [
                0, -0.32, 0.1, -0.3, 0.17, -0.2, 0.11, -0.08, 0.07, 0, 0.11,
                0.08, 0.17, 0.2, 0.1, 0.3, 0, 0.32,
              ],
            )}
            color="#F4E7B8"
            roughness={0.7}
          />
          <Part
            geo={G.cyl(0.076, 0.076, 0.16, 12)}
            color="#7A5230"
            roughness={0.9}
          />
          {[0.2, -0.2].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.168, 0.02, 6, 16)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#B91C1C"
              roughness={0.6}
            />
          ))}
          <Part
            geo={G.cyl(0.018, 0.024, 0.12, 8)}
            pos={[0, 0.37, 0]}
            rot={[0, 0, -0.2]}
            color="#5B3716"
            roughness={1}
          />
        </group>
      );

    case "flower":
      return (
        <group rotation={[0.05, 0.2, -0.12]}>
          <Part
            geo={G.tube(
              0.025,
              [
                0, -0.35, 0, 0, -0.1, 0, 0.06, 0.14, 0, 0.18, 0.27, 0, 0.28,
                0.24, 0,
              ],
            )}
            color="#4D7C0F"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[-0.08, -0.15, 0]}
            rot={[0, 0, 0.8]}
            scale={[0.5, 1.8, 0.15]}
            color="#65742B"
            roughness={0.9}
          />
          {/* hängender Blütenkopf */}
          <group position={[0.3, 0.2, 0]} rotation={[1.0, 0.2, 0]}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
                <Part
                  geo={G.ball(0.07, 8, 6)}
                  pos={[0, 0.12, 0]}
                  scale={[0.6, 1.5, 0.25]}
                  color={
                    i % 3 === 0 ? "#7C4A3A" : i % 2 ? "#B96A8A" : "#A3506F"
                  }
                  roughness={0.9}
                />
              </group>
            ))}
            <Part geo={G.ball(0.055, 8, 6)} color="#8A5A2B" roughness={0.9} />
          </group>
        </group>
      );

    case "kitchenroll":
      // Benutztes Küchentuch: zerknüllt, mit Fleck (die volle Rolle sähe nach
      // Ware aus – und glich der Papprolle aus der Papier-Tonne)
      return (
        <group rotation={[0.3, 0.4, 0]}>
          {/* Warmes Weiß und eigene Knüllform – nicht wie die graue Alufolie */}
          <Part
            geo={G.crumple(0.2, 0.14, 3, 1)}
            scale={[1.15, 0.75, 1]}
            flat
            color="#FFF8EC"
            roughness={1}
          />
          <Part
            geo={G.crumple(0.12, 0.12, 17, 1)}
            pos={[0.16, -0.06, 0.08]}
            scale={[1, 0.7, 1]}
            flat
            color="#FBF1DF"
            roughness={1}
          />
          {/* Großer Fleck, als flacher Klecks auf dem Tuch (schwebt nicht) */}
          <Part
            geo={G.ball(0.08, 8, 6)}
            pos={[-0.03, 0.03, 0.172]}
            scale={[1, 0.8, 0.35]}
            color="#C8A27A"
            roughness={1}
          />
          {/* Perforationslinie */}
          <Part
            geo={G.box(0.3, 0.008, 0.008, 0.002)}
            pos={[0, 0.12, 0.12]}
            rot={[0.6, 0, 0.2]}
            basic
            color="#D9CBB3"
          />
        </group>
      );
    default:
      return null;
  }
}
