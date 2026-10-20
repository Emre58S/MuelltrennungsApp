// Datei: components/game/models/shared.tsx
// Gemeinsame Bausteine der Objekt-Modelle: Geometrie-Cache, <Part /> und
// statische Umrisse.

import * as THREE from "three";

export function lighten(hex: string, amount: number) {
  return `#${new THREE.Color(hex).offsetHSL(0, 0, amount).getHexString()}`;
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

export const G = {
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

  dodeca: memoGeo(
    "dodeca",
    (r: number) => new THREE.DodecahedronGeometry(r, 0),
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

export type V3 = [number, number, number];

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

export function Part({
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

export const LEAF_POINTS = (() => {
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
export const STRIP_POINTS = (() => {
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

export const UNDERWEAR_POINTS = [
  -0.3, 0.25, 0.3, 0.25, 0.3, 0.1, 0.26, -0.02, 0.19, -0.13, 0.12, -0.22, 0.09,
  -0.28, -0.09, -0.28, -0.12, -0.22, -0.19, -0.13, -0.26, -0.02, -0.3, 0.1,
];

export const MIRROR_SHARDS: { pts: number[]; pos: V3; rot: V3 }[] = [
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
