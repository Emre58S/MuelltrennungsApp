// Datei: components/game/models/gelber-sack.tsx
// Modelle: Gelber Sack

import { G, Part } from "./shared";
import { type V3 } from "./shared";

export function renderGelberSackModel(key: string, name: string) {
  switch (key) {
    case "foil":
      return (
        <group rotation={[0.2, -0.28, 0.12]}>
          <Part
            geo={G.crumple(0.22, 0.28, 11, 1)}
            pos={[-0.1, 0.05, 0]}
            flat
            color="#D5DCE6"
            roughness={0.3}
            metalness={0.5}
          />
          <Part
            geo={G.wave(0.42, 0.34, 0.035, 9, 2)}
            pos={[0.2, -0.08, 0.1]}
            rot={[-1.2, 0, 0.4]}
            double
            flat
            color="#E2E8F0"
            roughness={0.28}
            metalness={0.5}
          />
        </group>
      );

    case "alutray":
      return (
        <group rotation={[0.35, 0.3, 0.05]}>
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
        </group>
      );
    }

    case "bag":
      return (
        <group rotation={[0.15, -0.2, -0.1]}>
          <Part
            geo={G.box(0.44, 0.5, 0.07, 0.03)}
            double
            color="#DBEAFE"
            roughness={0.35}
            opacity={0.6}
          />
          {[0.08, -0.1].map((y, i) => (
            <Part
              key={y}
              geo={G.box(0.3, 0.012, 0.075, 0.004)}
              pos={[0, y, 0]}
              rot={[0, 0, i ? -0.2 : 0.25]}
              color="#FFFFFF"
              opacity={0.7}
            />
          ))}
          {[-0.13, 0.13].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.1, 0.02, 6, 14, Math.PI)}
              pos={[x, 0.25, 0]}
              color="#BFDBFE"
              opacity={0.8}
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.circle(0.07, 18)}
            pos={[0, -0.03, 0.037]}
            basic
            color="#EF4444"
            opacity={0.8}
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
      return (
        <group rotation={[0.55, 0.3, 0.1]}>
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
      return (
        <group rotation={[0.25, 0.2, -0.1]}>
          <Part
            geo={G.box(0.66, 0.2, 0.46, 0.035)}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.box(0.44, 0.004, 0.26, 0.001)}
            pos={[0, 0.102, 0]}
            color="#D3DBE4"
            roughness={1}
          />
          {(
            [
              [0.34, -0.06, 0.26],
              [-0.3, -0.08, 0.27],
              [0.25, -0.09, 0.3],
              [-0.12, -0.09, 0.3],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.03, 0.3, i + 1, 0)}
              pos={p}
              flat
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
      return (
        <group rotation={[0.18, 0.22, -0.12]}>
          <Part
            geo={G.box(0.5, 0.14, 0.28, 0.03)}
            color="#E8C766"
            roughness={0.45}
            metalness={0.4}
          />
          <Part
            geo={G.box(0.28, 0.01, 0.22, 0.004)}
            pos={[-0.04, 0.071, 0]}
            color="#2563EB"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.28, 0.011, 0.06, 0.004)}
            pos={[-0.04, 0.072, 0]}
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.18, 0.12, 0.24, 0.025)}
            pos={[0.3, -0.01, 0]}
            color="#FDE68A"
            roughness={0.5}
          />
          <Part
            geo={G.wave(0.3, 0.24, 0.025, 12, 1)}
            pos={[-0.3, 0.04, 0.08]}
            rot={[-1.1, 0.2, 0.5]}
            double
            flat
            color="#E8C766"
            roughness={0.45}
            metalness={0.4}
          />
        </group>
      );

    case "icecream":
      return (
        <group rotation={[0.2, -0.22, 0.08]}>
          <Part
            geo={G.lathe(
              26,
              [
                0, -0.2, 0.2, -0.2, 0.27, 0.18, 0.285, 0.2, 0.285, 0.23, 0.265,
                0.23,
              ],
            )}
            double
            color="#60A5FA"
            roughness={0.45}
          />
          <Part
            geo={G.cyl(0.252, 0.226, 0.14, 26, true)}
            pos={[0, -0.02, 0]}
            double
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.circle(0.06, 20)}
            pos={[0, -0.02, 0.248]}
            basic
            color="#F472B6"
          />
          <Part
            geo={G.circle(0.03, 16)}
            pos={[0, -0.02, 0.25]}
            basic
            color="#FFFFFF"
          />
          <Part
            geo={G.cyl(0.28, 0.28, 0.025, 24)}
            pos={[0.34, -0.12, 0.1]}
            rot={[0.9, 0.2, 0.6]}
            color="#F9A8D4"
            roughness={0.5}
          />
        </group>
      );
    default:
      return null;
  }
}
