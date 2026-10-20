// Datei: components/game/models.tsx
// 3D-Modelle der Müllobjekte (aus explore.tsx ausgelagert, Inhalt unverändert
// bis auf Exporte und Zusatzmodelle für Papier/Glas/Sondermüll).

import { memo, useMemo } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";

import { EXTRA_MODEL_RULES, renderExtraModel } from "./models-extra";

function lighten(hex: string, amount: number) {
  return `#${new THREE.Color(hex).offsetHSL(0, 0, amount).getHexString()}`;
}


function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// Reihenfolge entscheidet – spezifische Regeln zuerst.
// Nur Items aus Biomüll, Gelber Sack und Restmüll (das sind die im Spiel genutzten).
const MODEL_RULES: [RegExp, string][] = [
  // Biomüll
  [/kuechenrolle/, "kitchenroll"],
  [/bananenschale|banane|banana/, "banana"],
  [/kaffee/, "coffee"],
  [/eierschale/, "eggshell"],
  [/kartoffelschale|karottenschale|zwiebelschale/, "peel"],
  [/teebeutel|\btee/, "teabag"],
  [/brot/, "bread"],
  [/laub/, "leaves"],
  [/nuss/, "nut"],
  [/maiskolben/, "corn"],
  [/apfel|apple/, "apple"],
  [/blume/, "flower"],
  // Gelber Sack
  [/aluschale/, "alutray"],
  [/alufolie|alu folie/, "foil"],
  [/joghurt|becher/, "yogurt"],
  [/konserve|dose/, "can"],
  [/shampoo|spuelmittel/, "bottle"],
  [/getraenkekarton|milchkarton/, "carton"],
  [/plastiktuete|plastiktute/, "bag"],
  [/plastikflasche/, "pet"],
  [/metalldeckel|deckel/, "lid"],
  [/chipstuete|chipstute/, "chips"],
  [/styropor/, "styro"],
  [/zahnpasta|tube/, "tube"],
  [/butterverpackung/, "butter"],
  [/eisverpackung/, "icecream"],
  // Restmüll
  [/zahnbuerste|zahnburste/, "toothbrush"],
  [/kassenzettel/, "receipt"],
  [/windel/, "diaper"],
  [/pizzakarton/, "pizza"],
  [/gluhbirne|gluehbirne/, "bulb"],
  [/geschirr/, "dish"],
  [/staubsauger/, "vacuum"],
  [/kugelschreiber/, "pen"],
  [/einwegrasierer|rasierer/, "razor"],
  [/wattestaebchen|wattestabchen/, "swab"],
  [/spiegel/, "mirror"],
  [/\bcd\b/, "cd"],
  [/zigarettenkippe/, "cigarette"],
  [/pflaster/, "plaster"],
  [/unterwaesche/, "underwear"],
  [/katzenstreu/, "litter"],
  [/tapeten/, "wallpaper"],
  [/geschenkpapier/, "wrap"],
];

function resolveModelKey(name: string): string {
  return MODEL_RULES.find(([re]) => re.test(name))?.[1] ?? "fallback";
}

/* ── Hilfsfunktionen für die Objekt-Modelle ───────────────────────────────
 * Geometrien werden einmal erzeugt und danach geteilt (Cache), Teile werden
 * über <Part /> zusammengesetzt. So bleiben die Modelle kurz und schnell.
 */

const geoCache = new Map<string, THREE.BufferGeometry>();

function memoGeo<A extends unknown[]>(
  name: string,
  build: (...args: A) => THREE.BufferGeometry,
) {
  return (...args: A): THREE.BufferGeometry => {
    const key = `${name}:${args.join(",")}`;
    let geometry = geoCache.get(key);
    if (!geometry) {
      geometry = build(...args);
      geoCache.set(key, geometry);
    }
    return geometry;
  };
}

function polyShape(points: number[]) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) shape.moveTo(points[i], points[i + 1]);
    else shape.lineTo(points[i], points[i + 1]);
  }
  shape.closePath();
  return shape;
}

const G = {
  /** Quader mit abgerundeten Kanten */
  box: memoGeo("box", (w: number, h: number, d: number, r: number = 0.03) => {
    const rr = Math.max(
      Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001),
      0.001,
    );
    const hw = w / 2 - rr;
    const hh = h / 2 - rr;
    const geometry = new THREE.ExtrudeGeometry(
      polyShape([-hw, -hh, hw, -hh, hw, hh, -hw, hh]),
      {
        depth: Math.max(d - rr * 2, 0.001),
        bevelEnabled: true,
        bevelThickness: rr,
        bevelSize: rr,
        bevelSegments: 2,
        curveSegments: 1,
      },
    );
    geometry.center();
    return geometry;
  }),

  cyl: memoGeo(
    "cyl",
    (
      rt: number,
      rb: number,
      h: number,
      seg: number = 16,
      open: boolean = false,
      ts: number = 0,
      tl: number = Math.PI * 2,
    ) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl),
  ),

  ball: memoGeo(
    "ball",
    (
      r: number,
      ws: number = 14,
      hs: number = 10,
      ts: number = 0,
      tl: number = Math.PI,
    ) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, ts, tl),
  ),

  torus: memoGeo(
    "torus",
    (
      R: number,
      r: number,
      rs: number = 8,
      ts: number = 18,
      arc: number = Math.PI * 2,
    ) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  ),

  cone: memoGeo(
    "cone",
    (r: number, h: number, seg: number = 12) =>
      new THREE.ConeGeometry(r, h, seg),
  ),

  ring: memoGeo(
    "ring",
    (ri: number, ro: number, seg: number = 24) =>
      new THREE.RingGeometry(ri, ro, seg),
  ),

  circle: memoGeo(
    "circle",
    (r: number, seg: number = 20) => new THREE.CircleGeometry(r, seg),
  ),

  /** Drehkörper: pts = [radius, höhe, radius, höhe, ...] von unten nach oben */
  lathe: memoGeo("lathe", (seg: number, pts: number[]) => {
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      profile.push(new THREE.Vector2(pts[i], pts[i + 1]));
    }
    return new THREE.LatheGeometry(profile, seg);
  }),

  /** Flache Form aus Umriss-Punkten (x, y, x, y, ...) mit Dicke */
  poly: memoGeo("poly", (depth: number, bevel: number, pts: number[]) => {
    const geometry = new THREE.ExtrudeGeometry(polyShape(pts), {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geometry.center();
    return geometry;
  }),

  /** Zerknitterte Kugel (Folie, Papier, Brot, Streu ...) */
  crumple: memoGeo(
    "crumple",
    (r: number, amp: number, seed: number, detail: number = 1) => {
      const geometry = new THREE.IcosahedronGeometry(r, detail);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const n =
          Math.sin(x * 11 + seed) * Math.cos(y * 9 - seed * 1.3) +
          Math.sin(z * 13 + seed * 0.7) * 0.7 +
          Math.sin((x + y + z) * 17 + seed) * 0.4;
        const k = 1 + (amp * n) / 2.1;
        p.setXYZ(i, x * k, y * k, z * k);
      }
      geometry.computeVertexNormals();
      return geometry;
    },
  ),

  /** Gewellte Fläche (Folie, Papier) */
  wave: memoGeo(
    "wave",
    (w: number, h: number, amp: number, freq: number, seed: number = 0) => {
      const geometry = new THREE.PlaneGeometry(w, h, 10, 8);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(
          i,
          amp * (Math.sin(x * freq + seed) + Math.cos(y * freq * 1.3 - seed)),
        );
      }
      geometry.computeVertexNormals();
      return geometry;
    },
  ),

  /** Gebogenes Rohr entlang von Punkten (x, y, z, ...) */
  tube: memoGeo("tube", (r: number, pts: number[]) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length; i += 3) {
      points.push(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2]));
    }
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      18,
      r,
      6,
      false,
    );
  }),
};

type V3 = [number, number, number];

type MatProps = {
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  flat?: boolean;
  double?: boolean;
  emissive?: string;
};

type PartProps = MatProps & {
  geo: THREE.BufferGeometry;
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
  /** Unbeleuchtet (für Aufdrucke, Löcher, Linien) */
  basic?: boolean;
  /** Schreibt nicht in den Tiefenpuffer (für weiche, überlagerte Flächen) */
  noDepthWrite?: boolean;
};

function Part({
  geo: geometry,
  pos,
  rot,
  scale,
  basic,
  noDepthWrite,
  color,
  metalness = 0,
  opacity = 1,
  double,
  emissive,
}: PartProps) {
  const side = double ? THREE.DoubleSide : THREE.FrontSide;
  const transparent = opacity < 1;

  return (
    <mesh
      geometry={geometry}
      position={pos}
      rotation={rot}
      scale={scale}
      castShadow={!basic}
    >
      {basic ? (
        <meshBasicMaterial
          color={color}
          transparent={transparent}
          opacity={opacity}
          side={side}
          depthWrite={!noDepthWrite}
        />
      ) : (
        // Low-Poly: flache Facetten (Lambert, günstig zu rendern).
        // Metall wirkt über eine etwas hellere Farbe.
        <meshLambertMaterial
          color={metalness > 0.3 ? lighten(color, 0.1) : color}
          flatShading
          transparent={transparent}
          opacity={opacity}
          side={side}
          emissive={emissive}
          depthWrite={!noDepthWrite}
        />
      )}
    </mesh>
  );
}

// ── Statische Umrisse ─────────────────────────────────────────────────────

const LEAF_POINTS = (() => {
  const n = 7;
  const width = (t: number) =>
    0.16 * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 - 0.25 * t);
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(width(t), -0.25 + t * 0.5);
  }
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n;
    pts.push(-width(t), -0.25 + t * 0.5);
  }
  return pts;
})();

// Pflasterstreifen mit runden Enden
const STRIP_POINTS = (() => {
  const w = 0.64;
  const r = 0.085;
  const pts: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    pts.push(w / 2 - r + Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 8;
    pts.push(-(w / 2 - r) + Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
})();

const UNDERWEAR_POINTS = [
  -0.3, 0.25, 0.3, 0.25, 0.3, 0.1, 0.26, -0.02, 0.19, -0.13, 0.12, -0.22, 0.09,
  -0.28, -0.09, -0.28, -0.12, -0.22, -0.19, -0.13, -0.26, -0.02, -0.3, 0.1,
];

const MIRROR_SHARDS: { pts: number[]; pos: V3; rot: V3 }[] = [
  {
    pts: [-0.28, -0.12, -0.02, -0.2, 0.02, 0.1, -0.24, 0.2],
    pos: [-0.12, 0, 0],
    rot: [0.05, 0.1, 0.08],
  },
  {
    pts: [0.04, -0.18, 0.3, -0.14, 0.24, 0.1, 0.06, 0.12],
    pos: [0.1, -0.02, 0.03],
    rot: [-0.08, -0.12, -0.1],
  },
  {
    pts: [-0.06, 0.14, 0.2, 0.14, 0.12, 0.3, -0.12, 0.28],
    pos: [0, 0.05, 0.05],
    rot: [0.12, 0.05, 0.15],
  },
  {
    pts: [0.1, -0.26, 0.26, -0.22, 0.18, -0.12],
    pos: [0.1, -0.06, 0.02],
    rot: [0.1, 0.2, -0.3],
  },
];

function renderModel(key: string, name: string) {
  switch (key) {
    /* ═══════════════ BIOMÜLL ═══════════════ */

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
      return (
        <group rotation={[0.2, -0.25, 0.12]}>
          <Part
            geo={G.ball(0.22, 9, 6, 0, Math.PI * 0.56)}
            pos={[-0.14, 0, 0]}
            rot={[0.2, 0.1, -0.25]}
            double
            flat
            color="#F4E8CC"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.18, 8, 5, 0, Math.PI * 0.58)}
            pos={[0.16, -0.03, 0.06]}
            rot={[0.15, -0.2, 0.28]}
            double
            flat
            color="#FFF7E8"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 6, 4, 0, Math.PI * 0.5)}
            pos={[0.02, 0.05, 0.2]}
            rot={[1.2, 0.4, 0.2]}
            double
            flat
            color="#EFE2C4"
            roughness={0.9}
          />
        </group>
      );

    case "peel": {
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
      return (
        <group rotation={[0.2, 0.25, -0.12]}>
          <Part
            geo={G.crumple(0.16, 0.16, 5, 1)}
            pos={[-0.13, 0, 0]}
            scale={[1.05, 0.8, 0.9]}
            flat
            color="#8B5A2B"
            roughness={1}
          />
          <Part
            geo={G.crumple(0.14, 0.16, 7, 1)}
            pos={[0.14, 0.03, 0.05]}
            rot={[0.4, 0.5, 0.2]}
            scale={[1, 0.8, 0.9]}
            flat
            color="#A66A39"
            roughness={1}
          />
          <Part
            geo={G.crumple(0.05, 0.3, 9, 0)}
            pos={[0, -0.1, 0.18]}
            flat
            color="#6B4423"
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
      return (
        <group rotation={[0.2, 0.3, -0.1]}>
          <Part
            geo={G.cyl(0.2, 0.2, 0.4, 24, true)}
            double
            color="#F8FAFC"
            roughness={0.95}
          />
          <Part
            geo={G.ring(0.062, 0.2, 24)}
            pos={[0, 0.2, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.ring(0.062, 0.2, 24)}
            pos={[0, -0.2, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.cyl(0.062, 0.062, 0.402, 16, true)}
            double
            color="#B08B5B"
            roughness={1}
          />
          {[-0.1, 0.1].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.2, 0.004, 4, 24)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
          <Part
            geo={G.wave(0.3, 0.34, 0.012, 10, 0)}
            pos={[0.14, -0.23, 0.2]}
            rot={[-1.2, 0, 0]}
            double
            color="#FFFFFF"
            roughness={1}
          />
        </group>
      );

    /* ═══════════════ GELBER SACK ═══════════════ */

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

    /* ═══════════════ RESTMÜLL ═══════════════ */

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
      // Beinausschnitt (linke Seite); rechts wird gespiegelt
      const legPts = [
        -0.3, 0.1, -0.26, -0.02, -0.19, -0.13, -0.12, -0.22, -0.09, -0.28,
      ];
      const leg = (sign: number) => {
        const pts: number[] = [];
        for (let i = 0; i < legPts.length; i += 2) {
          pts.push(sign * legPts[i], legPts[i + 1], 0.036);
        }
        return pts;
      };

      return (
        <group rotation={[0.18, -0.22, 0.08]}>
          <Part
            geo={G.poly(0.045, 0.012, UNDERWEAR_POINTS)}
            color="#6F7F96"
            roughness={1}
          />
          {/* verwaschene Streifen */}
          {(
            [
              [0.12, 0.56],
              [0.04, 0.5],
              [-0.04, 0.4],
              [-0.12, 0.28],
            ] as [number, number][]
          ).map(([y, w]) => (
            <Part
              key={y}
              geo={G.box(w, 0.016, 0.004, 0.001)}
              pos={[0, y, 0.036]}
              color="#8D9BB1"
              roughness={1}
            />
          ))}
          <Part
            geo={G.box(0.008, 0.46, 0.004, 0.001)}
            pos={[0, -0.03, 0.036]}
            color="#566377"
            roughness={1}
          />
          {/* Gummibund mit Muster */}
          <Part
            geo={G.box(0.62, 0.075, 0.062, 0.02)}
            pos={[0, 0.225, 0]}
            color="#E2E8F0"
            roughness={1}
          />
          {[-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.07, 0.064, 0.003)}
              pos={[x, 0.225, 0]}
              color="#EF4444"
              roughness={1}
            />
          ))}
          {/* Beinbündchen */}
          {[1, -1].map((sign) => (
            <Part
              key={sign}
              geo={G.tube(0.012, leg(sign))}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
          {/* abgenutzte Stelle mit Loch und Fäden */}
          <Part
            geo={G.circle(0.045, 12)}
            pos={[0.13, -0.06, 0.037]}
            basic
            color="#08111E"
          />
          <Part
            geo={G.torus(0.047, 0.007, 5, 12)}
            pos={[0.13, -0.06, 0.037]}
            color="#94A3B8"
            roughness={1}
          />
          <Part
            geo={G.tube(
              0.004,
              [0.16, -0.1, 0.04, 0.2, -0.14, 0.06, 0.23, -0.12, 0.08],
            )}
            color="#94A3B8"
            roughness={1}
          />
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

    case "wrap":
      return (
        <group rotation={[0.25, -0.18, 0.1]}>
          {/* Papierrolle (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.13, 0.13, 0.62, 22)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            color="#DB2777"
            roughness={0.3}
            metalness={0.4}
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
              color="#F5C542"
              roughness={0.3}
              metalness={0.5}
            />
          ))}
          {/* abgerollte Bahn mit Mustern */}
          <group position={[0, -0.105, 0.21]} rotation={[-1.45, 0, 0]}>
            <Part
              geo={G.wave(0.62, 0.42, 0.012, 9, 1)}
              double
              color="#EC4899"
              roughness={0.3}
              metalness={0.4}
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
                color="#F5C542"
              />
            ))}
          </group>
          {/* Schleife */}
          <Part
            geo={G.cyl(0.134, 0.134, 0.05, 22, true)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#F5C542"
            roughness={0.3}
            metalness={0.5}
          />
          <group position={[0, 0.17, 0.02]}>
            {[-1, 1].map((sg) => (
              <Part
                key={sg}
                geo={G.ball(0.06, 10, 8)}
                pos={[sg * 0.08, 0.03, 0]}
                rot={[0, 0, sg * 0.5]}
                scale={[1.4, 0.8, 0.5]}
                color="#F5C542"
                roughness={0.3}
                metalness={0.5}
              />
            ))}
            <Part
              geo={G.ball(0.035, 10, 8)}
              color="#E8B22B"
              roughness={0.3}
              metalness={0.5}
            />
            {[-1, 1].map((sg) => (
              <Part
                key={`t${sg}`}
                geo={G.box(0.035, 0.17, 0.01, 0.004)}
                pos={[sg * 0.04, -0.08, 0.02]}
                rot={[0, 0, sg * 0.35]}
                color="#F5C542"
                roughness={0.3}
                metalness={0.5}
              />
            ))}
          </group>
        </group>
      );

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
            geo={new THREE.DodecahedronGeometry(0.28, 0)}
            color="#94A3B8"
            roughness={0.7}
            metalness={0.15}
          />
        </group>
      );
  }
}

export const TrashObject3D = memo(function TrashObject3D({
  item,
}: {
  item: Item;
}) {
  const { key, name } = useMemo(() => {
    const normalized = normalizeName(item.name);
    const extra = EXTRA_MODEL_RULES.find(([re]) => re.test(normalized))?.[1];
    return { key: extra ?? resolveModelKey(normalized), name: normalized };
  }, [item.name]);

  return renderExtraModel(key) ?? renderModel(key, name);
});
