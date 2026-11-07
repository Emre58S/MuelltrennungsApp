// Datei: components/game/models/bio.tsx
// Modelle: Biomüll

import { G, Part, LEAF_POINTS } from "./shared";
import { type V3 } from "./shared";

/** Umriss einer Kaffeefiltertüte (unten schmal, oben breit). */
const FILTER = [-0.08, -0.21, 0.08, -0.21, 0.22, 0.21, -0.22, 0.21];

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
                  pos={[cx, cy, -0.012]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[1.02, sy * 1.03, 0.11]}
                  color="#B98A0A"
                  roughness={0.9}
                />
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.95, sy, 0.12]}
                  color="#F7D117"
                  roughness={0.8}
                />
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0.028]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.62, sy * 0.88, 0.12]}
                  color="#FFF1BE"
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
                <Part
                  geo={G.circle(0.014, 10)}
                  pos={[
                    dx * (spot - 0.12) + dy * 0.03,
                    0.2 + dy * (spot - 0.12) - dx * 0.03,
                    0.046,
                  ]}
                  basic
                  color="#8A5A2B"
                  opacity={0.55}
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
          <group rotation={[0.95, 0.3, 0]}>
            {/* Gebrauchtes Filterpapier, darauf ein Haufen feuchter Kaffeesatz mit losen Krümeln */}
            <Part geo={G.box(0.78, 0.012, 0.62, 0.004)} pos={[0, -0.04, 0]} color="#F3E8C8" roughness={1} />
            <Part geo={G.crumple(0.2, 0.5, 7, 2)} pos={[0, -0.01, 0]} scale={[1.3, 0.4, 1.1]} flat color="#5A3A26" roughness={1} />
            <Part geo={G.crumple(0.09, 0.5, 3, 1)} pos={[-0.12, 0.03, 0.04]} scale={[1.2, 0.5, 1]} flat color="#6B4630" roughness={1} />
            {(
              [
                [0.24, -0.03, 0.1],
                [0.2, -0.03, -0.12],
                [-0.22, -0.03, 0.12],
                [-0.2, -0.03, -0.1],
              ] as V3[]
            ).map((p, i) => (
              <Part key={i} geo={G.crumple(0.025, 0.3, 40 + i, 0)} pos={p} flat color="#4A2E1E" roughness={1} />
            ))}
          </group>
        );
      }
      // Kaffeefilter: flache Filtertüte (Trapez) aus zwei Lagen, oben offen
      // gespreizt, Kaffeesatz quillt oben
      // heraus, nasser Fleck vorn (vorher ein runder Trichter wie eine Eistüte)
      return (
        <group rotation={[0.2, -0.3, 0.05]}>
          {[-1, 1].map((side) => (
            <group key={side} position={[0, 0, side * 0.03]} rotation={[side * 0.12, 0, 0]}>
              <Part geo={G.poly(0.006, 0, FILTER)} color="#E7D8B8" roughness={1} />
              {side === 1 && (
                <>
                  {/* nasser Kaffee-Fleck */}
                  <Part geo={G.circle(0.06, 14)} pos={[0, -0.06, 0.0045]} color="#C9A878" roughness={1} />
                </>
              )}
            </group>
          ))}
          {/* Kaffeesatz quillt oben heraus */}
          <Part
            geo={G.crumple(0.1, 0.2, 3, 1)}
            pos={[0, 0.2, 0]}
            scale={[1.8, 0.5, 0.35]}
            flat
            color="#3B2418"
            roughness={1}
          />
        </group>
      );

    case "eggshell":
      // Eierschale: EINE aufgebrochene Halbschale (Nutzer, 7.11.: nur eine, nicht vier),
      // außen hellbraun, innen weiß, zur Kamera gekippt, damit man hineinsieht
      return (
        <group rotation={[0.7, -0.3, 0.15]}>
          <group rotation={[Math.PI, 0, 0]} scale={[1, 1.25, 1]}>
            <Part geo={G.ball(0.3, 16, 10, 0, Math.PI * 0.5)} flat color="#E3B98A" roughness={0.9} />
            <Part geo={G.ball(0.285, 16, 10, 0, Math.PI * 0.5)} double flat color="#FFF8EE" roughness={0.9} />
          </group>
        </group>
      );

    case "peel": {
      if (name.includes("kartoffel")) {
        // Kartoffel: braun, knollig, mit Augen; vorn eine geschälte helle Stelle, daneben Schalenstreifen
        return (
          <group rotation={[0.45, 0.35, -0.15]}>
            <Part
              geo={G.crumple(0.2, 0.22, 7, 2)}
              scale={[1.3, 0.85, 1]}
              pos={[-0.04, 0, 0]}
              flat
              color="#B98B54"
              roughness={1}
            />
            {/* geschälte Stelle (Vorderseite der Knolle liegt bei z ≈ 0,2) */}
            <Part
              geo={G.ball(0.09, 10, 6)}
              pos={[0.0, 0.02, 0.19]}
              scale={[1.3, 0.9, 0.3]}
              flat
              color="#F2DE9B"
              roughness={0.9}
            />
            {/* Augen */}
            {(
              [
                [-0.17, 0.08, 0.15],
                [-0.08, -0.08, 0.18],
                [0.14, -0.06, 0.16],
              ] as V3[]
            ).map((p, i) => (
              <Part key={i} geo={G.ball(0.018, 5, 4)} pos={p} color="#5A3C1E" roughness={1} />
            ))}
            {/* abgeschälte Streifen: braun außen, innen hell */}
            {(
              [
                [0.34, -0.1, 0.1, 0.3],
                [0.3, 0.1, 0.14, -0.3],
              ] as [number, number, number, number][]
            ).map(([x, y, z, r], i) => (
              <group key={i} position={[x, y, z]} rotation={[1.35, r, 0.3]}>
                <Part geo={G.wave(0.3, 0.1, 0.03, 9, i + 2)} double color="#8B5E34" roughness={1} />
              </group>
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
      if (isCarrot) {
        // Möhre (Kegel, Spitze unten) mit Querringen und Grün; geschälte Streifen kringeln daneben.
        // Radius bei Höhe y: 0,012 + 0,088 · (y + 0,3) / 0,6
        return (
          <group rotation={[0.45, 0.35, -0.15]}>
            <group rotation={[0, 0, -0.7]}>
            <Part geo={G.cyl(0.1, 0.012, 0.6, 12)} color="#F97316" roughness={0.85} />
            {(
              [
                [0.17, 0.082],
                [0.03, 0.062],
                [-0.1, 0.042],
              ] as [number, number][]
            ).map(([y, r]) => (
              <Part
                key={y}
                geo={G.torus(r, 0.007, 4, 14)}
                pos={[0, y, 0]}
                rot={[Math.PI / 2, 0, 0]}
                color="#C2410C"
                roughness={1}
              />
            ))}
            {/* geschälte, hellere Stelle vorn */}
            <Part geo={G.ball(0.05, 8, 6)} pos={[0, 0.05, 0.062]} scale={[0.8, 2.2, 0.25]} color="#FDBA74" roughness={0.9} />
            {/* Grün oben */}
            {(
              [
                [-0.04, 0.4, 0.35],
                [0.0, 0.42, 0.0],
                [0.045, 0.4, -0.4],
              ] as V3[]
            ).map(([x, y, rz], i) => (
              <Part
                key={i}
                geo={G.cyl(0.006, 0.026, 0.22, 6)}
                pos={[x, y, 0]}
                rot={[0, 0, rz]}
                color="#22A04A"
                roughness={0.9}
              />
            ))}
            </group>
            {/* Schalenstreifen daneben (außerhalb der Möhren-Neigung, damit sie zur Kamera zeigen) */}
            {(
              [
                [0.34, -0.06, 0.1, 0.3],
                [0.3, -0.24, 0.14, -0.3],
              ] as [number, number, number, number][]
            ).map(([x, y, z, r], i) => (
              <group key={i} position={[x, y, z]} rotation={[1.35, r, 0.3]}>
                <Part geo={G.wave(0.3, 0.1, 0.03, 9, i + 2)} double color="#FB923C" roughness={0.9} />
              </group>
            ))}
          </group>
        );
      }
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
      // Aufgeknackte Walnuss: zwei Schalenhälften (außen braun, Wulstrand, innen hell) mit Naht,
      // in einer Hälfte noch ein zweilappiger Kern – größer und mit Rand, damit man sie sofort erkennt
      return (
        <group rotation={[0.9, 0.2, -0.1]}>
          {(
            [
              [-0.2, 0.0, 0.0, 0.25],
              [0.22, -0.03, 0.02, -0.35],
            ] as [number, number, number, number][]
          ).map(([x, y, z, rz], i) => (
            <group key={i} position={[x, y, z]} rotation={[Math.PI, 0, rz]} scale={[1, 1.15, 0.95]}>
              <Part geo={G.ball(0.21, 14, 8, 0, Math.PI * 0.5)} color="#7A4A22" roughness={1} />
              <Part geo={G.ball(0.192, 14, 8, 0, Math.PI * 0.5)} double color="#DDBE8E" roughness={1} />
              {/* Wulstrand */}
              <Part geo={G.torus(0.2, 0.014, 5, 18)} rot={[Math.PI / 2, 0, 0]} color="#5E3A19" roughness={1} />
              {/* Rippen außen */}
              {[-0.5, 0, 0.5].map((a) => (
                <Part
                  key={a}
                  geo={G.torus(0.2, 0.008, 4, 14, Math.PI)}
                  rot={[0, a, 0]}
                  color="#5E3A19"
                  roughness={1}
                />
              ))}
            </group>
          ))}
          {/* Kern: zwei Lappen mit Furche, liegt in der linken Hälfte */}
          <Part geo={G.crumple(0.09, 0.3, 4, 1)} pos={[-0.25, 0.07, 0.02]} scale={[1.1, 0.6, 1]} flat color="#EBCB92" roughness={1} />
          <Part geo={G.crumple(0.09, 0.3, 9, 1)} pos={[-0.16, 0.07, -0.02]} scale={[1.1, 0.6, 1]} flat color="#E3BC80" roughness={1} />
        </group>
      );

    case "corn":
      // Maiskolben: durchgehend gelb (Körnerreihen), unten Stiel, seitlich
      // zwei grüne Lieschblätter – Radius: oben 0,10, unten 0,13 (Mitte y=0,02)
      return (
        <group rotation={[0.1, 0.25, -0.35]}>
          <Part
            geo={G.cyl(0.1, 0.13, 0.5, 14)}
            pos={[0, 0.02, 0]}
            flat
            color="#F5CB3D"
            roughness={0.75}
          />
          {/* Spitze */}
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[0, 0.27, 0]}
            scale={[1, 0.6, 1]}
            color="#F2C230"
            roughness={0.75}
          />
          {/* Körnerreihen: Ringe knapp außerhalb der Fläche */}
          {(
            [
              [0.15, 0.111],
              [0.02, 0.119],
              [-0.11, 0.127],
            ] as [number, number][]
          ).map(([y, r]) => (
            <Part
              key={y}
              geo={G.torus(r, 0.008, 5, 14)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#C99A12"
              roughness={0.9}
            />
          ))}
          {/* Lieschblätter seitlich am Kolben */}
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[-0.1, -0.12, 0.06]}
            rot={[0, 0.5, 0.15]}
            scale={[0.6, 2.2, 0.25]}
            color="#65A30D"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[0.1, -0.14, 0.05]}
            rot={[0, -0.5, -0.15]}
            scale={[0.6, 2.0, 0.25]}
            color="#84CC16"
            roughness={0.9}
          />
          <Part
            geo={G.cyl(0.03, 0.04, 0.08, 8)}
            pos={[0, -0.27, 0]}
            color="#7C5A2E"
            roughness={1}
          />
        </group>
      );

    case "apple":
      // Apfelrest: runder roter Apfel mit Stiel und Blatt, vorn rechts ein
      // Biss (helles Fruchtfleisch) – rund und sofort als Apfel erkennbar
      // (vorher ein schmales Kerngehäuse)
      return (
        <group rotation={[0.15, 0.2, 0]}>
          <group rotation={[0, 0.6, 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              {/* Kugel ohne Kappe dort, wo abgebissen wurde */}
              <Part geo={G.ball(0.24, 18, 12, 0.5, Math.PI - 0.5)} color="#D62F2F" roughness={0.5} />
              <Part
                geo={G.circle(0.24 * Math.sin(0.5), 18)}
                pos={[0, 0.24 * Math.cos(0.5), 0]}
                rot={[-Math.PI / 2, 0, 0]}
                color="#FDF1CF"
                roughness={0.8}
              />
            </group>
          </group>
          <Part geo={G.cyl(0.014, 0.02, 0.1, 6)} pos={[0, 0.27, 0]} rot={[0, 0, -0.2]} color="#5B3716" roughness={1} />
          <Part
            geo={G.poly(0.01, 0.003, LEAF_POINTS)}
            pos={[0.06, 0.29, 0]}
            rot={[0.3, 0, -1.1]}
            scale={0.32}
            double
            color="#4CAF50"
            roughness={0.9}
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
      // Benutztes Küchentuch: Blatt mit Prägepunkten, Perforation am Rand und einem Fleck
      // (Tomatensauce), daneben ein zusammengeknülltes Stück – die volle Rolle sähe nach Ware aus
      return (
        <group rotation={[0.85, 0.2, -0.08]}>
          <Part geo={G.box(0.7, 0.03, 0.5, 0.01)} color="#FFF9EE" roughness={1} />
          {/* umgeknicktes Eck rechts vorn */}
          <Part geo={G.box(0.16, 0.02, 0.16, 0.006)} pos={[0.3, 0.045, 0.2]} rot={[0.2, 0.7, 0.35]} color="#F1E8D6" roughness={1} />
          {/* dünner Rand in Blau (viele Küchentücher haben eine Randlinie) */}
          <Part geo={G.box(0.7, 0.004, 0.014, 0.001)} pos={[0, 0.032, -0.23]} basic color="#93C5FD" />
          <Part geo={G.box(0.7, 0.004, 0.014, 0.001)} pos={[0, 0.032, 0.0]} basic color="#BFDBFE" />
          {/* Prägepunkte: Raster aus 5 × 4 flachen Kügelchen auf dem Blatt (Oberseite y ≈ 0,036) */}
          {Array.from({ length: 20 }, (_, k) => {
            const cx = (k % 5) * 0.13 - 0.26;
            const cz = Math.floor(k / 5) * 0.1 - 0.09;
            return (
              <Part
                key={k}
                geo={G.ball(0.014, 6, 4)}
                pos={[cx + (Math.floor(k / 5) % 2) * 0.06, 0.04, cz]}
                scale={[1, 0.5, 1]}
                color="#E4DACA"
                roughness={1}
              />
            );
          })}
          {/* Perforation: Strichreihe am Rand */}
          {Array.from({ length: 7 }, (_, k) => (
            <Part
              key={`p${k}`}
              geo={G.box(0.03, 0.006, 0.008, 0.002)}
              pos={[-0.3 + k * 0.1, 0.04, 0.21]}
              basic
              color="#B9AD97"
            />
          ))}
          {/* Fleck: roter Klecks mit hellem Hof, flach auf dem Tuch */}
          <Part geo={G.ball(0.11, 10, 6)} pos={[0.1, 0.04, -0.04]} scale={[1.2, 0.12, 0.9]} color="#F2B38A" roughness={1} />
          <Part geo={G.ball(0.07, 10, 6)} pos={[0.1, 0.05, -0.04]} scale={[1.2, 0.12, 0.9]} color="#C2391B" roughness={1} />
          {/* Zusammengeknüllt daneben */}
          <Part geo={G.crumple(0.13, 0.28, 17, 1)} pos={[-0.3, 0.1, -0.12]} flat color="#FBF1DF" roughness={1} />
        </group>
      );
    default:
      return null;
  }
}
