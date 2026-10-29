// Datei: components/game/models/gelber-sack.tsx
// Modelle: Gelber Sack

import { G, Part } from "./shared";
import { type V3 } from "./shared";

export function renderGelberSackModel(key: string, name: string) {
  switch (key) {
    case "foil":
      // Alufolie: einfacher, zerknüllter grauer Knäuel – mehr braucht es nicht
      return (
        <group rotation={[0.25, -0.28, 0.1]}>
          <Part geo={G.crumple(0.24, 0.3, 11, 1)} flat color="#C9D1DB" roughness={0.3} metalness={0.5} />
        </group>
      );

    case "alutray":
      // Glanzstreifen auf Wand und Rand: Alu glänzt (Lambert kennt keinen Glanz)
      return (
        <group rotation={[0.35, 0.3, 0.05]}>
          {(
            [
              [-0.08, 0.0, 0.214],
              [0.1, 0.02, 0.222],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={`shine${i}`}
              geo={G.box(0.03, 0.1, 0.004, 0.001)}
              pos={p}
              rot={[0.44, 0, 0]}
              basic
              noDepthWrite
              color="#FFFFFF"
              opacity={0.7}
            />
          ))}
          {/* Rippen im Boden */}
          {[-0.06, 0.06].map((z) => (
            <Part key={`rib${z}`} geo={G.box(0.28, 0.008, 0.02, 0.003)} pos={[0, -0.046, z]} color="#B8C2CF" roughness={0.4} />
          ))}
          <Part
            geo={G.cyl(0.34, 0.26, 0.12, 4, true)}
            rot={[0, Math.PI / 4, 0]}
            double
            color="#C9D1DC"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.26, 0.26, 0.01, 4)}
            pos={[0, -0.055, 0]}
            rot={[0, Math.PI / 4, 0]}
            color="#9AA5B4"
            roughness={0.4}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.355, 0.345, 0.016, 4, true)}
            pos={[0, 0.058, 0]}
            rot={[0, Math.PI / 4, 0]}
            double
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "yogurt":
      return (
        <group rotation={[0.08, 0.2, -0.08]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.28, 0.15, -0.28, 0.22, 0.2, 0.245, 0.24, 0.245, 0.28,
                0.23, 0.28,
              ],
            )}
            double
            color="#F8FAFC"
            roughness={0.6}
          />
          <Part
            geo={G.cyl(0.208, 0.178, 0.2, 24, true)}
            pos={[0, -0.03, 0]}
            double
            color="#EC4899"
            roughness={0.6}
          />
          {/* abgerissener Alu-Deckel */}
          <Part
            geo={G.cyl(0.235, 0.235, 0.008, 20)}
            pos={[0.2, 0.32, 0]}
            rot={[0, 0, -1.0]}
            color="#D5DCE6"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "can":
      return (
        <group rotation={[0.05, 0.3, -0.05]}>
          <Part
            geo={G.cyl(0.23, 0.23, 0.5, 20)}
            color="#C0C8D4"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.236, 0.236, 0.26, 20, true)}
            double
            color="#DC2626"
            roughness={0.6}
          />
          <Part
            geo={G.cyl(0.238, 0.238, 0.04, 20, true)}
            pos={[0, 0.03, 0]}
            double
            color="#FDE68A"
            roughness={0.6}
          />
          {[0.25, -0.25].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.23, 0.016, 6, 20)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#9AA6B6"
              roughness={0.4}
              metalness={0.6}
            />
          ))}
          <Part
            geo={G.cyl(0.19, 0.19, 0.01, 20)}
            pos={[0, 0.255, 0]}
            color="#AEB8C6"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.torus(0.05, 0.011, 6, 14)}
            pos={[0.04, 0.275, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.6}
          />
          <Part
            geo={G.box(0.09, 0.012, 0.04, 0.005)}
            pos={[-0.02, 0.268, 0]}
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.6}
          />
          {/* Glanzstreifen: Blech glänzt (Lambert kennt keine Spiegelung) */}
          <Part
            geo={G.box(0.035, 0.42, 0.008, 0.003)}
            pos={[-0.117, 0, 0.212]}
            rot={[0, -0.5, 0]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.6}
          />
        </group>
      );

    case "bottle": {
      const shampoo = name.includes("shampoo");
      const body = shampoo ? "#2563EB" : "#22C55E";
      const accent = shampoo ? "#F8FAFC" : "#FDE047";

      return (
        <group rotation={[0.08, -0.25, 0.08]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.34, 0.17, -0.34, 0.215, -0.3, 0.225, -0.2, 0.225, 0.1,
                0.19, 0.2, 0.09, 0.26, 0.08, 0.3,
              ],
            )}
            color={body}
            roughness={0.4}
          />
          <Part
            geo={G.cyl(0.228, 0.228, 0.22, 24, true)}
            pos={[0, -0.07, 0]}
            double
            color={accent}
            roughness={0.6}
          />
          <Part
            geo={G.circle(0.065, 18)}
            pos={[0, -0.07, 0.229]}
            basic
            color={body}
          />
          <Part
            geo={G.torus(0.082, 0.015, 6, 16)}
            pos={[0, 0.3, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.cyl(0.09, 0.095, 0.12, 16)}
            pos={[0, 0.37, 0]}
            color={shampoo ? "#F8FAFC" : "#0F172A"}
            roughness={0.45}
          />
          <Part
            geo={G.cyl(0.03, 0.035, 0.07, 10)}
            pos={[0.06, 0.45, 0]}
            rot={[0, 0, -0.9]}
            color={shampoo ? "#E2E8F0" : "#1E293B"}
            roughness={0.45}
          />
        </group>
      );
    }

    case "carton": {
      const milk = name.includes("milch");
      const band = milk ? "#2563EB" : "#F97316";

      if (!milk) {
        // Getränkekarton (Saft): flacher Quader mit Strohhalm oben und
        // Orangenscheibe vorn – der Milchkarton hat Giebel und Kuhflecken
        return (
          <group rotation={[0.12, -0.3, 0.05]}>
            <Part geo={G.box(0.3, 0.46, 0.2, 0.015)} color="#FFF7ED" roughness={0.7} />
            <Part geo={G.box(0.305, 0.2, 0.205, 0.012)} pos={[0, -0.06, 0]} color={band} roughness={0.6} />
            <Part geo={G.box(0.27, 0.012, 0.03, 0.004)} pos={[0, 0.236, 0]} color="#FED7AA" roughness={0.7} />
            {/* Orangenscheibe */}
            <Part geo={G.circle(0.07, 18)} pos={[0, -0.06, 0.104]} basic color="#FED7AA" />
            <Part geo={G.ring(0.06, 0.07, 18)} pos={[0, -0.06, 0.105]} basic color="#FFFFFF" />
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
              <Part
                key={r}
                geo={G.box(0.12, 0.006, 0.002, 0.0005)}
                pos={[0, -0.06, 0.106]}
                rot={[0, 0, r]}
                basic
                color="#FFFFFF"
              />
            ))}
            {/* Strohhalm mit Knick */}
            <Part geo={G.cyl(0.012, 0.012, 0.16, 8)} pos={[0.08, 0.3, 0.04]} rot={[0, 0, 0.15]} color="#F8FAFC" />
            <Part geo={G.cyl(0.012, 0.012, 0.06, 8)} pos={[0.04, 0.39, 0.04]} rot={[0, 0, 1.2]} color="#EF4444" />
            <Part geo={G.ball(0.012, 8, 6)} pos={[0.068, 0.379, 0.04]} color="#EF4444" />
          </group>
        );
      }

      return (
        <group rotation={[0.08, -0.28, 0.05]}>
          <Part
            geo={G.box(0.34, 0.5, 0.34, 0.02)}
            color="#F8FAFC"
            roughness={0.7}
          />
          <Part
            geo={G.box(0.345, 0.18, 0.345, 0.015)}
            pos={[0, -0.08, 0]}
            color={band}
            roughness={0.6}
          />
          <Part
            geo={G.circle(0.06, 18)}
            pos={[0, -0.08, 0.176]}
            basic
            color="#FFFFFF"
          />
          {/* Giebeldach */}
          <Part
            geo={G.poly(0.34, 0.01, [-0.17, 0, 0.17, 0, 0, 0.15])}
            pos={[0, 0.325, 0]}
            color="#F8FAFC"
            roughness={0.7}
          />
          <Part
            geo={G.box(0.02, 0.03, 0.34, 0.005)}
            pos={[0, 0.41, 0]}
            color="#E2E8F0"
            roughness={0.7}
          />
          <Part
            geo={G.cyl(0.04, 0.045, 0.04, 10)}
            pos={[0.07, 0.34, 0]}
            rot={[0, 0, -0.72]}
            color={band}
            roughness={0.45}
          />
          {/* Kuhflecken auf den weißen Flächen (Milch!) */}
          <Part geo={G.poly(0.002, 0, [-0.05, 0, -0.02, 0.04, 0.03, 0.035, 0.05, -0.01, 0.01, -0.04, -0.04, -0.03])} pos={[-0.07, 0.15, 0.1725]} basic color="#1F2937" />
          <Part geo={G.poly(0.002, 0, [-0.03, 0, 0, 0.03, 0.035, 0.01, 0.02, -0.025, -0.015, -0.03])} pos={[0.08, 0.07, 0.1725]} basic color="#1F2937" />
          <Part geo={G.poly(0.002, 0, [-0.04, 0, -0.01, 0.035, 0.04, 0.02, 0.03, -0.03, -0.02, -0.025])} pos={[0.1725, 0.14, -0.04]} rot={[0, Math.PI / 2, 0]} basic color="#1F2937" />
        </group>
      );
    }

    case "bag":
      // Hemdchen-Tragetasche: deckend weiß (vorher halb durchsichtig wie
      // Folie), zwei flache Henkel aus demselben Material, Seitenfalten,
      // roter Logo-Kreis vorn, Knitterfalte
      return (
        <group rotation={[0.15, -0.2, -0.08]}>
          <Part geo={G.box(0.44, 0.42, 0.07, 0.03)} pos={[0, -0.03, 0]} color="#F4F7FB" roughness={0.35} />
          {[-0.11, 0.11].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.075, 0.03, 6, 14, Math.PI)}
              pos={[x, 0.15, 0]}
              scale={[1, 1, 0.45]}
              color="#F4F7FB"
              roughness={0.35}
            />
          ))}
          {/* Seitenfalten und Bodenfalz */}
          {[-0.17, 0.17].map((x) => (
            <Part key={`f${x}`} geo={G.box(0.008, 0.36, 0.002, 0.0005)} pos={[x, -0.03, 0.037]} basic color="#CBD5E1" />
          ))}
          <Part geo={G.box(0.38, 0.008, 0.002, 0.0005)} pos={[0, -0.2, 0.037]} basic color="#CBD5E1" />
          <Part geo={G.ring(0.04, 0.075, 20)} pos={[0, -0.03, 0.037]} basic color="#DC2626" />
          <Part
            geo={G.box(0.006, 0.22, 0.002, 0.0005)}
            pos={[-0.11, -0.02, 0.037]}
            rot={[0, 0, 0.15]}
            basic
            color="#DCE3EC"
          />
        </group>
      );

    case "pet":
      return (
        <group rotation={[0.08, 0.28, -0.1]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.36, 0.14, -0.36, 0.19, -0.3, 0.2, -0.2, 0.2, 0.1, 0.18,
                0.18, 0.12, 0.26, 0.075, 0.3, 0.075, 0.36,
              ],
            )}
            double
            color="#93C5FD"
            opacity={0.5}
            roughness={0.15}
          />
          <Part
            geo={G.cyl(0.204, 0.204, 0.2, 24, true)}
            pos={[0, -0.06, 0]}
            double
            color="#FFFFFF"
            roughness={0.5}
          />
          <Part
            geo={G.cyl(0.2055, 0.2055, 0.08, 24, true)}
            pos={[0, -0.06, 0]}
            double
            color="#2563EB"
            roughness={0.5}
          />
          {[-0.27, -0.22].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.196, 0.012, 5, 20)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#BFDBFE"
              opacity={0.6}
              roughness={0.2}
            />
          ))}
          <Part
            geo={G.torus(0.08, 0.01, 5, 16)}
            pos={[0, 0.33, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#BFDBFE"
            roughness={0.3}
          />
          <Part
            geo={G.cyl(0.088, 0.088, 0.07, 16)}
            pos={[0, 0.39, 0]}
            color="#2563EB"
            roughness={0.45}
          />
          {/* Glanzstreifen auf dem geraden Stück über dem Etikett: Plastik glänzt
              (unten glänzen schon die Rillen) */}
          <Part
            geo={G.box(0.03, 0.05, 0.008, 0.003)}
            pos={[-0.098, 0.075, 0.175]}
            rot={[0, -0.5, 0]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.6}
          />
        </group>
      );

    case "lid":
      // Schraubdeckel aus Metall: Riffelrand rundum und Glanz oben – sonst
      // wirkt die Scheibe wie eine Münze
      return (
        <group rotation={[0.55, 0.3, 0.1]}>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <Part
                key={`k${i}`}
                geo={G.box(0.02, 0.05, 0.02, 0.004)}
                pos={[Math.cos(a) * 0.304, 0.005, Math.sin(a) * 0.304]}
                rot={[0, -a, 0]}
                color="#B88A25"
                roughness={0.4}
                metalness={0.5}
              />
            );
          })}
          <Part
            geo={G.box(0.12, 0.004, 0.03, 0.001)}
            pos={[-0.06, 0.052, 0.08]}
            rot={[0, 0.5, 0]}
            basic
            noDepthWrite
            color="#FFF6D6"
            opacity={0.75}
          />
          <Part
            geo={G.lathe(
              28,
              [
                0, -0.035, 0.27, -0.035, 0.3, -0.02, 0.305, 0.03, 0.28, 0.04,
                0.23, 0.035, 0, 0.035,
              ],
            )}
            color="#C99A2E"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.torus(0.15, 0.012, 6, 24)}
            pos={[0, 0.038, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#A87B1F"
            roughness={0.4}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.055, 0.06, 0.02, 16)}
            pos={[0, 0.042, 0]}
            color="#B88A25"
            roughness={0.4}
            metalness={0.5}
          />
        </group>
      );

    case "chips":
      return (
        <group rotation={[0.18, -0.2, 0.08]}>
          <Part
            geo={G.ball(0.3, 16, 12)}
            scale={[0.82, 1.05, 0.28]}
            color="#DC2626"
            roughness={0.35}
            metalness={0.3}
          />
          {[0.33, -0.33].map((y) => (
            <Part
              key={y}
              geo={G.box(0.46, 0.05, 0.05, 0.01)}
              pos={[0, y, 0]}
              color="#B91C1C"
              roughness={0.4}
              metalness={0.3}
            />
          ))}
          {[-0.2, -0.14, -0.08, -0.02, 0.04, 0.1, 0.16, 0.22].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.05, 0.056, 0.004)}
              pos={[x, 0.355, 0]}
              color="#991B1B"
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.circle(0.12, 24)}
            pos={[0, 0.04, 0.086]}
            basic
            color="#FACC15"
          />
          <Part
            geo={G.circle(0.07, 20)}
            pos={[0, 0.04, 0.088]}
            basic
            color="#F97316"
          />
        </group>
      );

    case "styro":
      // Styropor-Box zum Mitnehmen: aufgeklappter Deckel, Kügelchen-Struktur
      // vorn, zwei Verpackungs-Chips daneben
      return (
        <group rotation={[0.35, 0.35, -0.08]}>
          <Part geo={G.box(0.5, 0.15, 0.4, 0.04)} color="#F4F6F8" roughness={1} />
          {/* Innenraum (dunkler) */}
          <Part
            geo={G.box(0.42, 0.01, 0.32, 0.004)}
            pos={[0, 0.072, 0]}
            color="#D5DCE4"
            roughness={1}
          />
          {/* Deckel, hinten angeschlagen und hochgeklappt */}
          <group position={[0, 0.075, -0.2]} rotation={[-1.75, 0, 0]}>
            <Part geo={G.box(0.5, 0.12, 0.4, 0.04)} pos={[0, 0.06, 0.2]} color="#F4F6F8" roughness={1} />
          </group>
          {/* Kügelchen auf der Vorderseite */}
          {[-0.16, -0.06, 0.04, 0.14, -0.11].map((x, i) => (
            <Part
              key={i}
              geo={G.ball(0.03, 6, 4)}
              pos={[x, i === 4 ? -0.035 : 0.02, 0.195]}
              color="#D8DEE6"
              roughness={1}
            />
          ))}
          {(
            [
              [0.34, -0.05, 0.18],
              [-0.33, -0.06, 0.2],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={`chip${i}`}
              geo={G.torus(0.04, 0.018, 5, 8, Math.PI * 1.2)}
              pos={p}
              rot={[0.4, 0.6 * i, 0.5]}
              color="#FFFFFF"
              roughness={1}
            />
          ))}
        </group>
      );

    case "tube":
      return (
        <group rotation={[0.15, 0.2, 0.9]}>
          <group scale={[1, 1, 0.6]}>
            <Part
              geo={G.lathe(
                20,
                [
                  0, -0.38, 0.16, -0.38, 0.17, -0.2, 0.17, 0.12, 0.13, 0.25,
                  0.075, 0.31, 0.07, 0.34, 0, 0.34,
                ],
              )}
              color="#F1F5F9"
              roughness={0.35}
            />
            <Part
              geo={G.cyl(0.173, 0.173, 0.1, 20, true)}
              pos={[0, -0.02, 0]}
              double
              color="#2563EB"
              roughness={0.4}
            />
          </group>
          <Part
            geo={G.box(0.36, 0.07, 0.04, 0.012)}
            pos={[0, -0.4, 0]}
            color="#E2E8F0"
            roughness={0.4}
          />
          {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.05, 0.045, 0.004)}
              pos={[x, -0.4, 0]}
              color="#CBD5E1"
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.cyl(0.08, 0.085, 0.12, 16)}
            pos={[0, 0.4, 0]}
            color="#2563EB"
            roughness={0.35}
          />
        </group>
      );

    case "butter":
      // Aufgeklapptes Butterpapier (Goldfolie, Ränder hochgebogen) mit einem
      // Butterrest – zur Kamera gekippt, damit man es sieht
      return (
        <group rotation={[0.75, 0.25, -0.1]}>
          <Part
            geo={G.box(0.56, 0.012, 0.4, 0.004)}
            color="#E3BE55"
            roughness={0.35}
          />
          {[-1, 1].map((sg) => (
            <Part
              key={sg}
              geo={G.box(0.56, 0.012, 0.1, 0.004)}
              pos={[0, 0.03, sg * 0.22]}
              rot={[sg * -0.7, 0, 0]}
              color="#D9AF45"
              roughness={0.35}
            />
          ))}
          {/* Aufdruck: blaues Feld mit weißem Streifen */}
          <Part geo={G.box(0.2, 0.004, 0.14, 0.001)} pos={[-0.15, 0.008, 0.06]} color="#2563EB" roughness={0.5} />
          <Part geo={G.box(0.2, 0.005, 0.03, 0.001)} pos={[-0.15, 0.009, 0.06]} color="#F8FAFC" roughness={0.5} />
          {/* Butterrest */}
          <Part
            geo={G.box(0.2, 0.09, 0.15, 0.015)}
            pos={[0.1, 0.05, -0.02]}
            rot={[0, 0.2, 0]}
            color="#FCE38A"
            roughness={0.6}
          />
          {/* Glanz auf der Folie */}
          <Part
            geo={G.box(0.3, 0.004, 0.025, 0.001)}
            pos={[-0.08, 0.012, -0.12]}
            rot={[0, 0.3, 0]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.8}
          />
        </group>
      );

    case "icecream":
      // Eckige 2-Liter-Eisbox mit Deckel und Eiskugel-Bild vorn (vorher eine
      // runde Wanne wie ein großer Joghurtbecher)
      return (
        <group rotation={[0.35, -0.3, 0.06]}>
          <Part geo={G.box(0.52, 0.22, 0.34, 0.03)} color="#DBEAFE" roughness={0.5} />
          <Part geo={G.box(0.55, 0.05, 0.37, 0.02)} pos={[0, 0.13, 0]} color="#2563EB" roughness={0.5} />
          {/* Eiskugeln in Waffel als Bild vorn */}
          {(
            [
              [-0.07, 0.03, "#F9A8D4"],
              [0.0, 0.05, "#7C4A2D"],
              [0.07, 0.03, "#FEF3C7"],
            ] as [number, number, string][]
          ).map(([x, y, col]) => (
            <Part key={x} geo={G.circle(0.045, 12)} pos={[x, y, x === 0 ? 0.174 : 0.172]} basic color={col} />
          ))}
          <Part geo={G.poly(0.004, 0, [-0.08, 0.0, 0.08, 0.0, 0, -0.1])} pos={[0, -0.03, 0.174]} basic color="#D9A066" />
          <Part
            geo={G.box(0.3, 0.02, 0.004, 0.001)}
            pos={[-0.08, 0.13, 0.187]}
            rot={[0, 0, 0]}
            basic
            noDepthWrite
            color="#FFFFFF"
            opacity={0.6}
          />
        </group>
      );

    default:
      return null;
  }
}
