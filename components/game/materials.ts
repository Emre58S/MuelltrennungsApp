// Datei: components/game/materials.ts
// Low-Poly-Look (wie Crossy Road, Townscaper, Islanders): flach schattierte
// Facetten, ruhige Pastellfarben. Lambert statt PBR → deutlich weniger
// Rechenaufwand pro Pixel → flüssigeres Spiel.

import * as THREE from "three";

const cache = new Map<string, THREE.MeshLambertMaterial>();

/** Flach schattiertes Material. Gleiche Farbe = gleiches Material (geteilt). */
export function lowpoly(color: string, opts: { emissive?: string; opacity?: number } = {}) {
  const key = `${color}|${opts.emissive ?? ""}|${opts.opacity ?? 1}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      emissive: opts.emissive ?? "#000000",
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    });
    cache.set(key, m);
  }
  return m;
}

/** Eigenes (nicht geteiltes) Material – wenn es animiert wird (z. B. Leuchten). */
export function lowpolyOwn(color: string) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/* ── Abgerundeter Kegelstumpf (für realistische Mülltonnen) ─────────────── */

function roundedRect(w: number, d: number, r: number, seg: number): [number, number][] {
  const pts: [number, number][] = [];
  const hw = w / 2 - r;
  const hd = d / 2 - r;
  const corners: [number, number, number][] = [
    [hw, hd, 0],
    [-hw, hd, Math.PI / 2],
    [-hw, -hd, Math.PI],
    [hw, -hd, (3 * Math.PI) / 2],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = start + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Tonnen-Korpus: unten schmaler als oben (wie echte 240-l-Tonnen),
 * abgerundete Ecken, glatte Normalen für weiche Toon-Schattierung.
 * Oben offen (dort sitzen Rand und Deckel).
 */
export function roundedFrustum(
  bottom: { w: number; d: number },
  top: { w: number; d: number },
  height: number,
  radius: number,
  seg = 4,
): THREE.BufferGeometry {
  const b = roundedRect(bottom.w, bottom.d, radius * 0.85, seg);
  const t = roundedRect(top.w, top.d, radius, seg);
  const n = b.length;
  const pos: number[] = [];
  const idx: number[] = [];

  for (const [x, z] of b) pos.push(x, 0, z);
  for (const [x, z] of t) pos.push(x, height, z);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, n + i, j, j, n + i, n + j);
  }
  // Boden (eigene Mitte)
  const c = pos.length / 3;
  pos.push(0, 0, 0);
  for (let i = 0; i < n; i++) idx.push(c, i, (i + 1) % n);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flacher abgerundeter Block (Deckel, Rand). */
export function roundedSlab(w: number, d: number, h: number, r: number, seg = 4) {
  const ring = roundedRect(w, d, r, seg);
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: h * 0.25,
    bevelSize: h * 0.25,
    bevelSegments: 2,
  });
  // Extrude läuft entlang z → auf die Seite legen (Höhe = y)
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  g.computeVertexNormals();
  return g;
}
